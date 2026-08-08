mod hub;
mod producer;
mod socketcan;

use futures_util::{SinkExt, StreamExt};
use hub::ConnectionHub;
use producer::{publish_bus_frame, run_demo_telemetry, SharedHub, SharedRuntime};
use radome_core::runtime::Runtime;
use radome_core::vehicle_bus::DemoCanAdapter;
use radome_core::{Capability, Client, Envelope, MessageType, Role, SystemCapabilities};
use serde_json::{json, Value};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio_tungstenite::{accept_async, tungstenite::Message};

const DEFAULT_ADDR: &str = "127.0.0.1:8787";
static NEXT_SESSION_ID: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Default)]
struct ConnectionSession { id: Option<String>, client_id: Option<String>, registered: bool }
impl ConnectionSession {
    fn is_established(&self) -> bool { self.id.is_some() }
    fn establish(&mut self, client_id: String) -> String {
        let sequence = NEXT_SESSION_ID.fetch_add(1, Ordering::Relaxed);
        let id = format!("session-{sequence}"); self.id = Some(id.clone()); self.client_id = Some(client_id); id
    }
}

fn new_runtime() -> SharedRuntime {
    Arc::new(Mutex::new(Runtime::new(SystemCapabilities::new([Capability::new("vehicle.telemetry")]))))
}
fn new_hub() -> SharedHub { Arc::new(Mutex::new(ConnectionHub::default())) }

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = std::env::var("RADOME_ADDR").unwrap_or_else(|_| DEFAULT_ADDR.to_owned());
    let listener = TcpListener::bind(&addr).await?;
    let runtime = new_runtime();
    let hub = new_hub();
    start_telemetry_source(Arc::clone(&runtime), Arc::clone(&hub))?;
    println!("RADOME server listening on ws://{addr}");
    serve(listener, runtime, hub).await
}

fn start_telemetry_source(runtime: SharedRuntime, hub: SharedHub) -> Result<(), Box<dyn std::error::Error>> {
    let source = std::env::var("RADOME_TELEMETRY_SOURCE").unwrap_or_else(|_| "demo".to_owned());
    match source.as_str() {
        "demo" => {
            tokio::spawn(run_demo_telemetry(runtime, hub, Duration::from_secs(1)));
            println!("RADOME telemetry source: demo");
            Ok(())
        }
        "socketcan" => start_socketcan(runtime, hub),
        other => Err(format!("unknown RADOME_TELEMETRY_SOURCE: {other}").into()),
    }
}

#[cfg(target_os = "linux")]
fn start_socketcan(runtime: SharedRuntime, hub: SharedHub) -> Result<(), Box<dyn std::error::Error>> {
    use socketcan::{SocketCanSource, VehicleFrameSource};
    let interface = std::env::var("RADOME_CAN_INTERFACE").unwrap_or_else(|_| "can0".to_owned());
    let mut source = SocketCanSource::open(&interface)?;
    println!("RADOME telemetry source: SocketCAN ({interface})");
    tokio::task::spawn_blocking(move || {
        let adapter = DemoCanAdapter;
        loop {
            match source.recv() {
                Ok(frame) => {
                    if let Err(error) = publish_bus_frame(&adapter, &frame, &runtime, &hub) {
                        eprintln!("CAN frame ignored: {error:?}");
                    }
                }
                Err(error) => {
                    eprintln!("SocketCAN receive failed: {error}");
                    break;
                }
            }
        }
    });
    Ok(())
}

#[cfg(not(target_os = "linux"))]
fn start_socketcan(_runtime: SharedRuntime, _hub: SharedHub) -> Result<(), Box<dyn std::error::Error>> {
    Err("SocketCAN telemetry is only available on Linux".into())
}

async fn serve(listener: TcpListener, runtime: SharedRuntime, hub: SharedHub) -> Result<(), Box<dyn std::error::Error>> {
    loop {
        let (stream, peer) = listener.accept().await?;
        let runtime = Arc::clone(&runtime); let hub = Arc::clone(&hub);
        tokio::spawn(async move { if let Err(error) = handle_connection(stream, runtime, hub).await { eprintln!("connection {peer} closed with error: {error}"); } });
    }
}

async fn handle_connection(stream: TcpStream, runtime: SharedRuntime, hub: SharedHub) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let websocket = accept_async(stream).await?;
    let (mut sink, mut source) = websocket.split();
    let (outbound_tx, mut outbound_rx) = mpsc::unbounded_channel::<Envelope>();
    let writer = tokio::spawn(async move {
        while let Some(envelope) = outbound_rx.recv().await { sink.send(Message::Text(envelope.encode_json()?.into())).await?; }
        Ok::<(), Box<dyn std::error::Error + Send + Sync>>(())
    });

    let mut session = ConnectionSession::default();
    while let Some(message) = source.next().await {
        let message = message?;
        match message {
            Message::Text(text) => {
                let response = match Envelope::decode_json(text.as_ref()) {
                    Ok(incoming) => handle_envelope(&mut session, &runtime, &hub, &outbound_tx, incoming),
                    Err(error) => Envelope::new("server-error", MessageType::Error, json!({"reason":format!("{error:?}")})),
                };
                outbound_tx.send(response).map_err(|_| "websocket writer closed")?;
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

fn handle_envelope(session: &mut ConnectionSession, runtime: &SharedRuntime, hub: &SharedHub, outbound: &mpsc::UnboundedSender<Envelope>, incoming: Envelope) -> Envelope {
    match incoming.message_type {
        MessageType::Hello if !session.is_established() => handle_hello(session, incoming),
        MessageType::Hello => error_for(&incoming, "session_already_established"),
        MessageType::CapabilityAnnounce if !session.is_established() => error_for(&incoming, "hello_required"),
        MessageType::CapabilityAnnounce => handle_capability_announce(session, runtime, hub, outbound, incoming),
        _ if !session.is_established() => error_for(&incoming, "hello_required"),
        _ => error_for(&incoming, "unsupported_message_type"),
    }
}

fn handle_hello(session: &mut ConnectionSession, incoming: Envelope) -> Envelope {
    let Some(client_id) = incoming.payload.get("client_id").and_then(Value::as_str) else { return error_for(&incoming, "missing_client_id"); };
    let session_id = session.establish(client_id.to_owned());
    Envelope::new("server-hello", MessageType::Hello, json!({"server":"radome-server","protocol_version":radome_core::PROTOCOL_VERSION})).correlated_to(incoming.id).in_session(session_id)
}

fn handle_capability_announce(session: &mut ConnectionSession, runtime: &SharedRuntime, hub: &SharedHub, outbound: &mpsc::UnboundedSender<Envelope>, incoming: Envelope) -> Envelope {
    if incoming.session_id.as_deref() != session.id.as_deref() { return error_for(&incoming, "invalid_session"); }
    let Some(role) = incoming.payload.get("role").and_then(Value::as_str) else { return error_for(&incoming, "missing_role"); };
    let Some(values) = incoming.payload.get("capabilities").and_then(Value::as_array) else { return error_for(&incoming, "missing_capabilities"); };
    let Some(capabilities) = values.iter().map(Value::as_str).collect::<Option<Vec<_>>>() else { return error_for(&incoming, "invalid_capabilities"); };
    let client_id = session.client_id.clone().expect("established session has client id");
    runtime.lock().expect("runtime mutex poisoned").register_client(Client::new(client_id.clone(), Role::new(role), capabilities.into_iter().map(Capability::new)));
    hub.lock().expect("hub mutex poisoned").register(client_id.clone(), outbound.clone());
    session.registered = true;
    Envelope::new("capabilities-accepted", MessageType::CapabilityAnnounce, json!({"accepted":true,"client_id":client_id})).correlated_to(incoming.id).in_session(session.id.clone().expect("established session"))
}

fn unregister_session(session: &ConnectionSession, runtime: &SharedRuntime, hub: &SharedHub) {
    if session.registered {
        if let Some(client_id) = session.client_id.as_deref() {
            runtime.lock().expect("runtime mutex poisoned").unregister_client(client_id);
            hub.lock().expect("hub mutex poisoned").unregister(client_id);
        }
    }
}

fn error_for(incoming: &Envelope, reason: &str) -> Envelope {
    let mut response = Envelope::new("server-error", MessageType::Error, json!({"reason":reason})).correlated_to(incoming.id.clone());
    if let Some(session_id) = incoming.session_id.clone() { response = response.in_session(session_id); } response
}

#[cfg(test)]
mod tests {
    use super::*;
    use producer::publish_next_sample;
    use radome_core::telemetry::TelemetrySimulator;
    use tokio_tungstenite::connect_async;

    fn hello(id: &str) -> Envelope { Envelope::new(id, MessageType::Hello, json!({"client_id":"dashboard"})) }
    async fn recv_envelope<S>(socket: &mut tokio_tungstenite::WebSocketStream<S>) -> Envelope where S: tokio::io::AsyncRead + tokio::io::AsyncWrite + Unpin {
        let message = socket.next().await.expect("websocket response").expect("valid websocket message");
        let Message::Text(text) = message else { panic!("expected text message") }; Envelope::decode_json(text.as_ref()).expect("valid RADOME envelope")
    }

    #[tokio::test]
    async fn websocket_receives_event_from_independent_producer() {
        let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind ephemeral port");
        let addr = listener.local_addr().unwrap(); let runtime = new_runtime(); let hub = new_hub();
        let server_runtime = Arc::clone(&runtime); let server_hub = Arc::clone(&hub);
        let server = tokio::spawn(async move { let (stream, _) = listener.accept().await.expect("accept client"); handle_connection(stream, server_runtime, server_hub).await.expect("serve client"); });
        let (mut socket, _) = connect_async(format!("ws://{addr}")).await.expect("connect websocket");
        socket.send(Message::Text(hello("hello-net-1").encode_json().unwrap().into())).await.unwrap();
        let hello_response = recv_envelope(&mut socket).await; let session_id = hello_response.session_id.expect("server session id");
        let announce = Envelope::new("caps-net-1", MessageType::CapabilityAnnounce, json!({"role":"driver-display","capabilities":["display"]})).in_session(session_id);
        socket.send(Message::Text(announce.encode_json().unwrap().into())).await.unwrap();
        let accepted = recv_envelope(&mut socket).await; assert_eq!(accepted.message_type, MessageType::CapabilityAnnounce);

        let mut simulator = TelemetrySimulator::demo_drive();
        assert!(publish_next_sample(&mut simulator, &runtime, &hub));
        let speed = recv_envelope(&mut socket).await; let rpm = recv_envelope(&mut socket).await;
        assert_eq!(speed.payload["name"], "vehicle.speed_changed"); assert_eq!(rpm.payload["name"], "vehicle.engine_rpm_changed");

        socket.close(None).await.unwrap(); server.await.unwrap();
        assert_eq!(runtime.lock().unwrap().client_count(), 0); assert_eq!(hub.lock().unwrap().client_count(), 0);
    }
}
