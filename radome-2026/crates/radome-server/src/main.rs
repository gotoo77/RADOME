use futures_util::{SinkExt, StreamExt};
use radome_core::{Capability, Client, Envelope, MessageType, Role, SystemCapabilities};
use radome_core::runtime::Runtime;
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::Message};

const DEFAULT_ADDR: &str = "127.0.0.1:8787";
static NEXT_SESSION_ID: AtomicU64 = AtomicU64::new(1);
type SharedRuntime = Arc<Mutex<Runtime>>;

#[derive(Debug, Default)]
struct ConnectionSession {
    id: Option<String>,
    client_id: Option<String>,
    registered: bool,
}

impl ConnectionSession {
    fn is_established(&self) -> bool { self.id.is_some() }
    fn establish(&mut self, client_id: String) -> String {
        let sequence = NEXT_SESSION_ID.fetch_add(1, Ordering::Relaxed);
        let id = format!("session-{sequence}");
        self.id = Some(id.clone());
        self.client_id = Some(client_id);
        id
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = std::env::var("RADOME_ADDR").unwrap_or_else(|_| DEFAULT_ADDR.to_owned());
    let listener = TcpListener::bind(&addr).await?;
    let runtime = Arc::new(Mutex::new(Runtime::new(SystemCapabilities::new([
        Capability::new("vehicle.telemetry"),
    ]))));
    println!("RADOME server listening on ws://{addr}");

    loop {
        let (stream, peer) = listener.accept().await?;
        let runtime = Arc::clone(&runtime);
        tokio::spawn(async move {
            if let Err(error) = handle_connection(stream, runtime).await {
                eprintln!("connection {peer} closed with error: {error}");
            }
        });
    }
}

async fn handle_connection(stream: TcpStream, runtime: SharedRuntime) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut websocket = accept_async(stream).await?;
    let mut session = ConnectionSession::default();

    while let Some(message) = websocket.next().await {
        let message = message?;
        match message {
            Message::Text(text) => {
                let response = match Envelope::decode_json(text.as_ref()) {
                    Ok(incoming) => handle_envelope(&mut session, &runtime, incoming),
                    Err(error) => Envelope::new("server-error", MessageType::Error, json!({"reason": format!("{error:?}")})),
                };
                websocket.send(Message::Text(response.encode_json()?.into())).await?;
            }
            Message::Ping(payload) => websocket.send(Message::Pong(payload)).await?,
            Message::Close(_) => break,
            _ => {}
        }
    }

    unregister_session(&session, &runtime);
    Ok(())
}

fn handle_envelope(session: &mut ConnectionSession, runtime: &SharedRuntime, incoming: Envelope) -> Envelope {
    match incoming.message_type {
        MessageType::Hello if !session.is_established() => handle_hello(session, incoming),
        MessageType::Hello => error_for(&incoming, "session_already_established"),
        MessageType::CapabilityAnnounce if !session.is_established() => error_for(&incoming, "hello_required"),
        MessageType::CapabilityAnnounce => handle_capability_announce(session, runtime, incoming),
        _ if !session.is_established() => error_for(&incoming, "hello_required"),
        _ => error_for(&incoming, "unsupported_message_type"),
    }
}

fn handle_hello(session: &mut ConnectionSession, incoming: Envelope) -> Envelope {
    let Some(client_id) = incoming.payload.get("client_id").and_then(Value::as_str) else { return error_for(&incoming, "missing_client_id"); };
    let session_id = session.establish(client_id.to_owned());
    Envelope::new("server-hello", MessageType::Hello, json!({"server":"radome-server","protocol_version":radome_core::PROTOCOL_VERSION}))
        .correlated_to(incoming.id)
        .in_session(session_id)
}

fn handle_capability_announce(session: &mut ConnectionSession, runtime: &SharedRuntime, incoming: Envelope) -> Envelope {
    if incoming.session_id.as_deref() != session.id.as_deref() { return error_for(&incoming, "invalid_session"); }
    let Some(role) = incoming.payload.get("role").and_then(Value::as_str) else { return error_for(&incoming, "missing_role"); };
    let Some(values) = incoming.payload.get("capabilities").and_then(Value::as_array) else { return error_for(&incoming, "missing_capabilities"); };
    let Some(capabilities) = values.iter().map(Value::as_str).collect::<Option<Vec<_>>>() else { return error_for(&incoming, "invalid_capabilities"); };
    let client_id = session.client_id.clone().expect("established session has client id");
    let client = Client::new(
        client_id.clone(),
        Role::new(role),
        capabilities.into_iter().map(Capability::new),
    );
    runtime.lock().expect("runtime mutex poisoned").register_client(client);
    session.registered = true;

    Envelope::new("capabilities-accepted", MessageType::CapabilityAnnounce, json!({"accepted":true,"client_id":client_id}))
        .correlated_to(incoming.id)
        .in_session(session.id.clone().expect("established session"))
}

fn unregister_session(session: &ConnectionSession, runtime: &SharedRuntime) {
    if session.registered {
        if let Some(client_id) = session.client_id.as_deref() {
            runtime.lock().expect("runtime mutex poisoned").unregister_client(client_id);
        }
    }
}

fn error_for(incoming: &Envelope, reason: &str) -> Envelope {
    let mut response = Envelope::new("server-error", MessageType::Error, json!({"reason":reason})).correlated_to(incoming.id.clone());
    if let Some(session_id) = incoming.session_id.clone() { response = response.in_session(session_id); }
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    fn runtime() -> SharedRuntime {
        Arc::new(Mutex::new(Runtime::new(SystemCapabilities::new([Capability::new("vehicle.telemetry")]))))
    }
    fn hello(id: &str) -> Envelope { Envelope::new(id, MessageType::Hello, json!({"client_id":"dashboard"})) }

    #[test]
    fn hello_establishes_a_session_without_registering_client_yet() {
        let runtime = runtime();
        let mut session = ConnectionSession::default();
        let response = handle_envelope(&mut session, &runtime, hello("hello-42"));
        assert_eq!(response.message_type, MessageType::Hello);
        assert!(response.session_id.is_some());
        assert_eq!(runtime.lock().unwrap().client_count(), 0);
    }

    #[test]
    fn capability_announce_registers_client_in_runtime() {
        let runtime = runtime();
        let mut session = ConnectionSession::default();
        let session_id = handle_envelope(&mut session, &runtime, hello("hello-1")).session_id.unwrap();
        let incoming = Envelope::new("caps-1", MessageType::CapabilityAnnounce, json!({"role":"driver-display","capabilities":["display","touch"]})).in_session(session_id);
        let response = handle_envelope(&mut session, &runtime, incoming);
        assert_eq!(response.message_type, MessageType::CapabilityAnnounce);
        assert_eq!(runtime.lock().unwrap().client_count(), 1);
        assert!(session.registered);
    }

    #[test]
    fn disconnect_unregisters_registered_client() {
        let runtime = runtime();
        let mut session = ConnectionSession::default();
        let session_id = handle_envelope(&mut session, &runtime, hello("hello-1")).session_id.unwrap();
        let incoming = Envelope::new("caps-1", MessageType::CapabilityAnnounce, json!({"role":"driver-display","capabilities":["display"]})).in_session(session_id);
        handle_envelope(&mut session, &runtime, incoming);
        assert_eq!(runtime.lock().unwrap().client_count(), 1);
        unregister_session(&session, &runtime);
        assert_eq!(runtime.lock().unwrap().client_count(), 0);
    }

    #[test]
    fn capabilities_require_hello_first() {
        let runtime = runtime();
        let mut session = ConnectionSession::default();
        let incoming = Envelope::new("caps-1", MessageType::CapabilityAnnounce, json!({"role":"driver-display","capabilities":["display"]}));
        let response = handle_envelope(&mut session, &runtime, incoming);
        assert_eq!(response.payload["reason"], "hello_required");
    }

    #[test]
    fn wrong_session_id_is_rejected_without_registration() {
        let runtime = runtime();
        let mut session = ConnectionSession::default();
        handle_envelope(&mut session, &runtime, hello("hello-1"));
        let incoming = Envelope::new("caps-1", MessageType::CapabilityAnnounce, json!({"role":"driver-display","capabilities":["display"]})).in_session("wrong");
        let response = handle_envelope(&mut session, &runtime, incoming);
        assert_eq!(response.payload["reason"], "invalid_session");
        assert_eq!(runtime.lock().unwrap().client_count(), 0);
    }
}
