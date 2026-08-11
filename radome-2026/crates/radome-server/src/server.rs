use crate::actuators::SharedClimateActuator;
use crate::command_executor::{CommandExecutionError, CommandExecutor};
use crate::producer::{SharedHub, SharedRuntime};
use futures_util::{SinkExt, StreamExt};
use radome_core::{Capability, Client, Envelope, MessageType, Role};
use serde_json::{json, Value};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio_tungstenite::{accept_async, tungstenite::Message};

static NEXT_SESSION_ID: AtomicU64 = AtomicU64::new(1);
static NEXT_SERVER_MESSAGE_ID: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Default)]
struct ConnectionSession {
    id: Option<String>,
    client_id: Option<String>,
    registered: bool,
}

impl ConnectionSession {
    fn is_established(&self) -> bool {
        self.id.is_some()
    }

    fn establish(&mut self, client_id: String) -> String {
        let sequence = NEXT_SESSION_ID.fetch_add(1, Ordering::Relaxed);
        let id = format!("session-{sequence}");
        self.id = Some(id.clone());
        self.client_id = Some(client_id);
        id
    }
}

fn server_id(prefix: &str) -> String {
    format!(
        "server-{prefix}-{}",
        NEXT_SERVER_MESSAGE_ID.fetch_add(1, Ordering::Relaxed)
    )
}

pub async fn serve(
    listener: TcpListener,
    runtime: SharedRuntime,
    hub: SharedHub,
    climate_actuator: SharedClimateActuator,
) -> Result<(), Box<dyn std::error::Error>> {
    loop {
        let (stream, peer) = listener.accept().await?;
        let runtime = Arc::clone(&runtime);
        let hub = Arc::clone(&hub);
        let climate_actuator = Arc::clone(&climate_actuator);
        tokio::spawn(async move {
            if let Err(error) = handle_connection(stream, runtime, hub, climate_actuator).await {
                eprintln!("connection {peer} closed with error: {error}");
            }
        });
    }
}

async fn handle_connection(
    stream: TcpStream,
    runtime: SharedRuntime,
    hub: SharedHub,
    climate_actuator: SharedClimateActuator,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let websocket = accept_async(stream).await?;
    let (mut sink, mut source) = websocket.split();
    let (outbound_tx, mut outbound_rx) = mpsc::unbounded_channel::<Envelope>();
    let writer = tokio::spawn(async move {
        while let Some(envelope) = outbound_rx.recv().await {
            sink.send(Message::Text(envelope.encode_json()?.into()))
                .await?;
        }
        Ok::<(), Box<dyn std::error::Error + Send + Sync>>(())
    });

    let executor = CommandExecutor::new(climate_actuator);
    let mut session = ConnectionSession::default();
    while let Some(message) = source.next().await {
        let message = message?;
        match message {
            Message::Text(text) => {
                let responses = match Envelope::decode_json(text.as_ref()) {
                    Ok(incoming) => {
                        handle_envelope(&mut session, &runtime, &hub, &outbound_tx, &executor, incoming)
                    }
                    Err(error) => vec![Envelope::new(
                        "server-error",
                        MessageType::Error,
                        json!({"reason":format!("{error:?}")}),
                    )],
                };
                for response in responses {
                    outbound_tx
                        .send(response)
                        .map_err(|_| "websocket writer closed")?;
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    unregister_session(&session, &runtime, &hub);
    drop(outbound_tx);
    writer.await??;
    Ok(())
}

fn handle_envelope(
    session: &mut ConnectionSession,
    runtime: &SharedRuntime,
    hub: &SharedHub,
    outbound: &mpsc::UnboundedSender<Envelope>,
    executor: &CommandExecutor,
    incoming: Envelope,
) -> Vec<Envelope> {
    let response = match incoming.message_type {
        MessageType::Hello if !session.is_established() => handle_hello(session, incoming),
        MessageType::Hello => error_for(&incoming, "session_already_established"),
        MessageType::CapabilityAnnounce if !session.is_established() => {
            error_for(&incoming, "hello_required")
        }
        MessageType::CapabilityAnnounce => {
            handle_capability_announce(session, runtime, hub, outbound, incoming)
        }
        MessageType::Command if !session.is_established() => error_for(&incoming, "hello_required"),
        MessageType::Command => return handle_command(session, runtime, executor, incoming),
        _ if !session.is_established() => error_for(&incoming, "hello_required"),
        _ => error_for(&incoming, "unsupported_message_type"),
    };
    vec![response]
}

fn handle_command(
    session: &ConnectionSession,
    runtime: &SharedRuntime,
    executor: &CommandExecutor,
    incoming: Envelope,
) -> Vec<Envelope> {
    if incoming.session_id.as_deref() != session.id.as_deref() {
        return vec![error_for(&incoming, "invalid_session")];
    }
    if !session.registered {
        return vec![error_for(&incoming, "capability_announce_required")];
    }
    let Some(name) = incoming.payload.get("name").and_then(Value::as_str) else {
        return vec![error_for(&incoming, "missing_command_name")];
    };
    let client_id = session
        .client_id
        .as_deref()
        .expect("established session client id");
    let data = incoming.payload.get("data").unwrap_or(&Value::Null);

    match executor.execute(name, data, |capability| {
        runtime
            .lock()
            .expect("runtime mutex poisoned")
            .client_can(client_id, capability)
    }) {
        Ok(success) => {
            let result = command_result(&incoming, "succeeded", "accepted");
            let event = Envelope::new(
                server_id("event"),
                MessageType::Event,
                json!({"name":success.event_name,"data":success.event_data}),
            );
            vec![result, event]
        }
        Err(CommandExecutionError::UnsupportedCommand) => {
            vec![command_result(&incoming, "failed", "unsupported_command")]
        }
        Err(CommandExecutionError::CapabilityDenied) => {
            vec![command_result(&incoming, "failed", "capability_denied")]
        }
        Err(CommandExecutionError::ActuatorRejected) => {
            vec![command_result(&incoming, "failed", "actuator_rejected")]
        }
        Err(CommandExecutionError::InvalidPayload { code, detail }) => vec![command_result_payload(
            &incoming,
            "failed",
            json!({"code":code,"detail":detail}),
        )],
    }
}

fn command_result(incoming: &Envelope, outcome: &str, data: &str) -> Envelope {
    command_result_payload(incoming, outcome, json!(data))
}

fn command_result_payload(incoming: &Envelope, outcome: &str, data: Value) -> Envelope {
    let mut result = Envelope::new(
        server_id("command-result"),
        MessageType::CommandResult,
        json!({"outcome":outcome,"data":data}),
    )
    .correlated_to(incoming.id.clone());
    if let Some(session_id) = incoming.session_id.clone() {
        result = result.in_session(session_id);
    }
    result
}

fn handle_hello(session: &mut ConnectionSession, incoming: Envelope) -> Envelope {
    let Some(client_id) = incoming.payload.get("client_id").and_then(Value::as_str) else {
        return error_for(&incoming, "missing_client_id");
    };
    let session_id = session.establish(client_id.to_owned());
    Envelope::new(
        "server-hello",
        MessageType::Hello,
        json!({"server":"radome-server","protocol_version":radome_core::PROTOCOL_VERSION}),
    )
    .correlated_to(incoming.id)
    .in_session(session_id)
}

fn handle_capability_announce(
    session: &mut ConnectionSession,
    runtime: &SharedRuntime,
    hub: &SharedHub,
    outbound: &mpsc::UnboundedSender<Envelope>,
    incoming: Envelope,
) -> Envelope {
    if incoming.session_id.as_deref() != session.id.as_deref() {
        return error_for(&incoming, "invalid_session");
    }
    let Some(role) = incoming.payload.get("role").and_then(Value::as_str) else {
        return error_for(&incoming, "missing_role");
    };
    let Some(values) = incoming.payload.get("capabilities").and_then(Value::as_array) else {
        return error_for(&incoming, "missing_capabilities");
    };
    let Some(capabilities) = values.iter().map(Value::as_str).collect::<Option<Vec<_>>>() else {
        return error_for(&incoming, "invalid_capabilities");
    };
    let client_id = session
        .client_id
        .clone()
        .expect("established session has client id");
    runtime
        .lock()
        .expect("runtime mutex poisoned")
        .register_client(Client::new(
            client_id.clone(),
            Role::new(role),
            capabilities.into_iter().map(Capability::new),
        ));
    hub.lock()
        .expect("hub mutex poisoned")
        .register(client_id.clone(), outbound.clone());
    session.registered = true;
    Envelope::new(
        "capabilities-accepted",
        MessageType::CapabilityAnnounce,
        json!({"accepted":true,"client_id":client_id}),
    )
    .correlated_to(incoming.id)
    .in_session(session.id.clone().expect("established session"))
}

fn unregister_session(session: &ConnectionSession, runtime: &SharedRuntime, hub: &SharedHub) {
    if session.registered {
        if let Some(client_id) = session.client_id.as_deref() {
            runtime
                .lock()
                .expect("runtime mutex poisoned")
                .unregister_client(client_id);
            hub.lock()
                .expect("hub mutex poisoned")
                .unregister(client_id);
        }
    }
}

fn error_for(incoming: &Envelope, reason: &str) -> Envelope {
    let mut response = Envelope::new(
        "server-error",
        MessageType::Error,
        json!({"reason":reason}),
    )
    .correlated_to(incoming.id.clone());
    if let Some(session_id) = incoming.session_id.clone() {
        response = response.in_session(session_id);
    }
    response
}
