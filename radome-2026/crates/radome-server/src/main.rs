mod commands;
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
static NEXT_SERVER_MESSAGE_ID: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Default)]
struct ConnectionSession { id: Option<String>, client_id: Option<String>, registered: bool }
impl ConnectionSession {
    fn is_established(&self) -> bool { self.id.is_some() }
    fn establish(&mut self, client_id: String) -> String { let sequence = NEXT_SESSION_ID.fetch_add(1, Ordering::Relaxed); let id = format!("session-{sequence}"); self.id = Some(id.clone()); self.client_id = Some(client_id); id }
}

fn new_runtime() -> SharedRuntime { Arc::new(Mutex::new(Runtime::new(SystemCapabilities::new([Capability::new("vehicle.telemetry")] )))) }
fn new_hub() -> SharedHub { Arc::new(Mutex::new(ConnectionHub::default())) }
fn server_id(prefix: &str) -> String { format!("server-{prefix}-{}", NEXT_SERVER_MESSAGE_ID.fetch_add(1, Ordering::Relaxed)) }

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = std::env::var("RADOME_ADDR").unwrap_or_else(|_| DEFAULT_ADDR.to_owned());
    let listener = TcpListener::bind(&addr).await?; let runtime = new_runtime(); let hub = new_hub();
    start_telemetry_source(Arc::clone(&runtime), Arc::clone(&hub))?;
    println!("RADOME server listening on ws://{addr}"); serve(listener, runtime, hub).await
}

fn start_telemetry_source(runtime: SharedRuntime, hub: SharedHub) -> Result<(), Box<dyn std::error::Error>> {
    let source = std::env::var("RADOME_TELEMETRY_SOURCE").unwrap_or_else(|_| "demo".to_owned());
    match source.as_str() { "demo" => { tokio::spawn(run_demo_telemetry(runtime, hub, Duration::from_secs(1))); println!("RADOME telemetry source: demo"); Ok(()) }, "socketcan" => start_socketcan(runtime, hub), other => Err(format!("unknown RADOME_TELEMETRY_SOURCE: {other}").into()) }
}

#[cfg(target_os = "linux")]
fn start_socketcan(runtime: SharedRuntime, hub: SharedHub) -> Result<(), Box<dyn std::error::Error>> {
    use socketcan::{SocketCanSource, VehicleFrameSource}; let interface = std::env::var("RADOME_CAN_INTERFACE").unwrap_or_else(|_| "can0".to_owned()); let mut source = SocketCanSource::open(&interface)?;
    println!("RADOME telemetry source: SocketCAN ({interface})"); tokio::task::spawn_blocking(move || { let adapter = DemoCanAdapter; loop { match source.recv() { Ok(frame) => { if let Err(error) = publish_bus_frame(&adapter, &frame, &runtime, &hub) { eprintln!("CAN frame ignored: {error:?}"); } }, Err(error) => { eprintln!("SocketCAN receive failed: {error}"); break; } } } }); Ok(())
}
#[cfg(not(target_os = "linux"))]
fn start_socketcan(_runtime: SharedRuntime, _hub: SharedHub) -> Result<(), Box<dyn std::error::Error>> { Err("SocketCAN telemetry is only available on Linux".into()) }

async fn serve(listener: TcpListener, runtime: SharedRuntime, hub: SharedHub) -> Result<(), Box<dyn std::error::Error>> { loop { let (stream, peer) = listener.accept().await?; let runtime = Arc::clone(&runtime); let hub = Arc::clone(&hub); tokio::spawn(async move { if let Err(error) = handle_connection(stream, runtime, hub).await { eprintln!("connection {peer} closed with error: {error}"); } }); } }

async fn handle_connection(stream: TcpStream, runtime: SharedRuntime, hub: SharedHub) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let websocket = accept_async(stream).await?; let (mut sink, mut source) = websocket.split(); let (outbound_tx, mut outbound_rx) = mpsc::unbounded_channel::<Envelope>();
    let writer = tokio::spawn(async move { while let Some(envelope) = outbound_rx.recv().await { sink.send(Message::Text(envelope.encode_json()?.into())).await?; } Ok::<(), Box<dyn std::error::Error + Send + Sync>>(()) });
    let mut session = ConnectionSession::default();
    while let Some(message) = source.next().await { let message = message?; match message { Message::Text(text) => { let responses = match Envelope::decode_json(text.as_ref()) { Ok(incoming) => handle_envelope(&mut session, &runtime, &hub, &outbound_tx, incoming), Err(error) => vec![Envelope::new("server-error", MessageType::Error, json!({"reason":format!("{error:?}")}))] }; for response in responses { outbound_tx.send(response).map_err(|_| "websocket writer closed")?; } }, Message::Close(_) => break, _ => {} } }
    unregister_session(&session, &runtime, &hub); drop(outbound_tx); writer.await??; Ok(())
}

fn handle_envelope(session: &mut ConnectionSession, runtime: &SharedRuntime, hub: &SharedHub, outbound: &mpsc::UnboundedSender<Envelope>, incoming: Envelope) -> Vec<Envelope> {
    let response = match incoming.message_type {
        MessageType::Hello if !session.is_established() => handle_hello(session, incoming),
        MessageType::Hello => error_for(&incoming, "session_already_established"),
        MessageType::CapabilityAnnounce if !session.is_established() => error_for(&incoming, "hello_required"),
        MessageType::CapabilityAnnounce => handle_capability_announce(session, runtime, hub, outbound, incoming),
        MessageType::Command if !session.is_established() => error_for(&incoming, "hello_required"),
        MessageType::Command => return handle_command(session, runtime, incoming),
        _ if !session.is_established() => error_for(&incoming, "hello_required"),
        _ => error_for(&incoming, "unsupported_message_type"),
    };
    vec![response]
}

fn handle_command(session: &ConnectionSession, runtime: &SharedRuntime, incoming: Envelope) -> Vec<Envelope> {
    if incoming.session_id.as_deref() != session.id.as_deref() { return vec![error_for(&incoming, "invalid_session")]; }
    if !session.registered { return vec![error_for(&incoming, "capability_announce_required")]; }
    let Some(name) = incoming.payload.get("name").and_then(Value::as_str) else { return vec![error_for(&incoming, "missing_command_name")]; };
    let Some(definition) = commands::find(name) else { return vec![command_result(&incoming, "failed", "unsupported_command")]; };
    let client_id = session.client_id.as_deref().expect("established session client id");
    if !runtime.lock().expect("runtime mutex poisoned").client_can(client_id, &definition.required_capability) { return vec![command_result(&incoming, "failed", "capability_denied")]; }

    let execution = match definition.execute(incoming.payload.get("data").unwrap_or(&Value::Null)) {
        Ok(execution) => execution,
        Err(error) => return vec![command_error_result(&incoming, &error)],
    };
    let result = command_result(&incoming, "succeeded", "accepted");
    let event = Envelope::new(server_id("event"), MessageType::Event, json!({"name":execution.event_name,"data":execution.event_data}));
    vec![result, event]
}

fn command_result(incoming: &Envelope, outcome: &str, data: &str) -> Envelope {
    command_result_payload(incoming, outcome, json!(data))
}

fn command_error_result(incoming: &Envelope, error: &commands::CommandError) -> Envelope {
    command_result_payload(incoming, "failed", json!({"code":error.code(),"detail":error.detail()}))
}

fn command_result_payload(incoming: &Envelope, outcome: &str, data: Value) -> Envelope {
    let mut result = Envelope::new(server_id("command-result"), MessageType::CommandResult, json!({"outcome":outcome,"data":data})).correlated_to(incoming.id.clone());
    if let Some(session_id) = incoming.session_id.clone() { result = result.in_session(session_id); } result
}

fn handle_hello(session: &mut ConnectionSession, incoming: Envelope) -> Envelope { let Some(client_id) = incoming.payload.get("client_id").and_then(Value::as_str) else { return error_for(&incoming, "missing_client_id"); }; let session_id = session.establish(client_id.to_owned()); Envelope::new("server-hello", MessageType::Hello, json!({"server":"radome-server","protocol_version":radome_core::PROTOCOL_VERSION})).correlated_to(incoming.id).in_session(session_id) }
fn handle_capability_announce(session: &mut ConnectionSession, runtime: &SharedRuntime, hub: &SharedHub, outbound: &mpsc::UnboundedSender<Envelope>, incoming: Envelope) -> Envelope {
    if incoming.session_id.as_deref() != session.id.as_deref() { return error_for(&incoming, "invalid_session"); }
    let Some(role) = incoming.payload.get("role").and_then(Value::as_str) else { return error_for(&incoming, "missing_role"); }; let Some(values) = incoming.payload.get("capabilities").and_then(Value::as_array) else { return error_for(&incoming, "missing_capabilities"); }; let Some(capabilities) = values.iter().map(Value::as_str).collect::<Option<Vec<_>>>() else { return error_for(&incoming, "invalid_capabilities"); };
    let client_id = session.client_id.clone().expect("established session has client id"); runtime.lock().expect("runtime mutex poisoned").register_client(Client::new(client_id.clone(), Role::new(role), capabilities.into_iter().map(Capability::new))); hub.lock().expect("hub mutex poisoned").register(client_id.clone(), outbound.clone()); session.registered = true;
    Envelope::new("capabilities-accepted", MessageType::CapabilityAnnounce, json!({"accepted":true,"client_id":client_id})).correlated_to(incoming.id).in_session(session.id.clone().expect("established session"))
}
fn unregister_session(session: &ConnectionSession, runtime: &SharedRuntime, hub: &SharedHub) { if session.registered { if let Some(client_id) = session.client_id.as_deref() { runtime.lock().expect("runtime mutex poisoned").unregister_client(client_id); hub.lock().expect("hub mutex poisoned").unregister(client_id); } } }
fn error_for(incoming: &Envelope, reason: &str) -> Envelope { let mut response = Envelope::new("server-error", MessageType::Error, json!({"reason":reason})).correlated_to(incoming.id.clone()); if let Some(session_id) = incoming.session_id.clone() { response = response.in_session(session_id); } response }

#[cfg(test)]
mod tests {
    use super::*;

    fn registered_session(runtime: &SharedRuntime, capabilities: &[&str]) -> ConnectionSession {
        let mut session = ConnectionSession::default(); session.establish("console".into()); session.registered = true;
        runtime.lock().unwrap().register_client(Client::new("console", Role::new("center-console"), capabilities.iter().copied().map(Capability::new))); session
    }
    fn command_with_data(session: &ConnectionSession, id: &str, name: &str, data: Value) -> Envelope { Envelope::new(id, MessageType::Command, json!({"name":name,"data":data})).in_session(session.id.clone().unwrap()) }
    fn command(session: &ConnectionSession, id: &str, name: &str) -> Envelope { command_with_data(session, id, name, Value::Null) }

    #[test]
    fn authorized_media_command_returns_result_and_domain_event() {
        let runtime = new_runtime(); let mut session = registered_session(&runtime, &["display", "media.control"]); let hub = new_hub(); let (tx, _rx) = mpsc::unbounded_channel();
        let responses = handle_envelope(&mut session, &runtime, &hub, &tx, command(&session, "cmd-1", "media.toggle_playback"));
        assert_eq!(responses.len(), 2); assert_eq!(responses[0].payload["outcome"], "succeeded"); assert_eq!(responses[1].payload["name"], "media.playback_toggled");
    }

    #[test]
    fn climate_command_with_valid_payload_returns_event() {
        let runtime = new_runtime(); let mut session = registered_session(&runtime, &["climate.control"]); let hub = new_hub(); let (tx, _rx) = mpsc::unbounded_channel();
        let incoming = command_with_data(&session, "cmd-climate", "climate.set_temperature", json!({"temperature_c":21.5}));
        let responses = handle_envelope(&mut session, &runtime, &hub, &tx, incoming);
        assert_eq!(responses.len(), 2); assert_eq!(responses[0].payload["outcome"], "succeeded"); assert_eq!(responses[1].payload["name"], "climate.temperature_changed"); assert_eq!(responses[1].payload["data"]["temperature_c"], 21.5);
    }

    #[test]
    fn invalid_climate_payload_returns_failed_command_result_without_event() {
        let runtime = new_runtime(); let mut session = registered_session(&runtime, &["climate.control"]); let hub = new_hub(); let (tx, _rx) = mpsc::unbounded_channel();
        let incoming = command_with_data(&session, "cmd-bad-climate", "climate.set_temperature", json!({"temperature_c":"chaud"}));
        let responses = handle_envelope(&mut session, &runtime, &hub, &tx, incoming);
        assert_eq!(responses.len(), 1); assert_eq!(responses[0].message_type, MessageType::CommandResult); assert_eq!(responses[0].correlation_id.as_deref(), Some("cmd-bad-climate")); assert_eq!(responses[0].payload["outcome"], "failed"); assert_eq!(responses[0].payload["data"]["code"], "invalid_payload"); assert_eq!(responses[0].payload["data"]["detail"], "temperature_c_required");
    }

    #[test]
    fn media_command_without_capability_is_denied() {
        let runtime = new_runtime(); let mut session = registered_session(&runtime, &["display"]); let hub = new_hub(); let (tx, _rx) = mpsc::unbounded_channel();
        let incoming = command(&session, "cmd-2", "media.toggle_playback"); let responses = handle_envelope(&mut session, &runtime, &hub, &tx, incoming);
        assert_eq!(responses.len(), 1); assert_eq!(responses[0].payload["outcome"], "failed"); assert_eq!(responses[0].payload["data"], "capability_denied");
    }
}