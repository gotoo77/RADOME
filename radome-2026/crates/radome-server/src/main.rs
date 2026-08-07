use futures_util::{SinkExt, StreamExt};
use radome_core::{Envelope, MessageType};
use serde_json::{json, Value};
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::Message};

const DEFAULT_ADDR: &str = "127.0.0.1:8787";
static NEXT_SESSION_ID: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Default)]
struct ConnectionSession {
    id: Option<String>,
    client_id: Option<String>,
    role: Option<String>,
    capabilities: Vec<String>,
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
    println!("RADOME server listening on ws://{addr}");

    loop {
        let (stream, peer) = listener.accept().await?;
        tokio::spawn(async move {
            if let Err(error) = handle_connection(stream).await {
                eprintln!("connection {peer} closed with error: {error}");
            }
        });
    }
}

async fn handle_connection(stream: TcpStream) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut websocket = accept_async(stream).await?;
    let mut session = ConnectionSession::default();

    while let Some(message) = websocket.next().await {
        let message = message?;
        match message {
            Message::Text(text) => {
                let response = match Envelope::decode_json(text.as_ref()) {
                    Ok(incoming) => handle_envelope(&mut session, incoming),
                    Err(error) => Envelope::new("server-error", MessageType::Error, json!({"reason": format!("{error:?}")})),
                };
                websocket.send(Message::Text(response.encode_json()?.into())).await?;
            }
            Message::Ping(payload) => websocket.send(Message::Pong(payload)).await?,
            Message::Close(_) => break,
            _ => {}
        }
    }
    Ok(())
}

fn handle_envelope(session: &mut ConnectionSession, incoming: Envelope) -> Envelope {
    match incoming.message_type {
        MessageType::Hello if !session.is_established() => handle_hello(session, incoming),
        MessageType::Hello => error_for(&incoming, "session_already_established"),
        MessageType::CapabilityAnnounce if !session.is_established() => error_for(&incoming, "hello_required"),
        MessageType::CapabilityAnnounce => handle_capability_announce(session, incoming),
        _ if !session.is_established() => error_for(&incoming, "hello_required"),
        _ => error_for(&incoming, "unsupported_message_type"),
    }
}

fn handle_hello(session: &mut ConnectionSession, incoming: Envelope) -> Envelope {
    let Some(client_id) = incoming.payload.get("client_id").and_then(Value::as_str) else {
        return error_for(&incoming, "missing_client_id");
    };
    let session_id = session.establish(client_id.to_owned());
    Envelope::new(
        "server-hello",
        MessageType::Hello,
        json!({"server": "radome-server", "protocol_version": radome_core::PROTOCOL_VERSION}),
    )
    .correlated_to(incoming.id)
    .in_session(session_id)
}

fn handle_capability_announce(session: &mut ConnectionSession, incoming: Envelope) -> Envelope {
    if incoming.session_id.as_deref() != session.id.as_deref() {
        return error_for(&incoming, "invalid_session");
    }
    let Some(role) = incoming.payload.get("role").and_then(Value::as_str) else {
        return error_for(&incoming, "missing_role");
    };
    let Some(capabilities) = incoming.payload.get("capabilities").and_then(Value::as_array) else {
        return error_for(&incoming, "missing_capabilities");
    };
    let capabilities = capabilities.iter().map(Value::as_str).collect::<Option<Vec<_>>>();
    let Some(capabilities) = capabilities else {
        return error_for(&incoming, "invalid_capabilities");
    };
    session.role = Some(role.to_owned());
    session.capabilities = capabilities.into_iter().map(str::to_owned).collect();

    Envelope::new(
        "capabilities-accepted",
        MessageType::CapabilityAnnounce,
        json!({"accepted": true, "client_id": session.client_id}),
    )
    .correlated_to(incoming.id)
    .in_session(session.id.clone().expect("established session"))
}

fn error_for(incoming: &Envelope, reason: &str) -> Envelope {
    let mut response = Envelope::new("server-error", MessageType::Error, json!({"reason": reason}))
        .correlated_to(incoming.id.clone());
    if let Some(session_id) = incoming.session_id.clone() {
        response = response.in_session(session_id);
    }
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hello(id: &str) -> Envelope {
        Envelope::new(id, MessageType::Hello, json!({"client_id": "dashboard"}))
    }

    #[test]
    fn hello_establishes_a_session() {
        let mut session = ConnectionSession::default();
        let response = handle_envelope(&mut session, hello("hello-42"));
        assert_eq!(response.message_type, MessageType::Hello);
        assert_eq!(response.correlation_id.as_deref(), Some("hello-42"));
        assert!(response.session_id.is_some());
        assert_eq!(session.client_id.as_deref(), Some("dashboard"));
    }

    #[test]
    fn capabilities_require_hello_first() {
        let mut session = ConnectionSession::default();
        let incoming = Envelope::new("caps-1", MessageType::CapabilityAnnounce, json!({"role":"driver-display","capabilities":["display"]}));
        let response = handle_envelope(&mut session, incoming);
        assert_eq!(response.message_type, MessageType::Error);
        assert_eq!(response.payload["reason"], "hello_required");
    }

    #[test]
    fn capabilities_are_attached_to_the_established_session() {
        let mut session = ConnectionSession::default();
        let hello_response = handle_envelope(&mut session, hello("hello-1"));
        let session_id = hello_response.session_id.unwrap();
        let incoming = Envelope::new(
            "caps-1",
            MessageType::CapabilityAnnounce,
            json!({"role":"driver-display","capabilities":["display","touch"]}),
        ).in_session(session_id.clone());
        let response = handle_envelope(&mut session, incoming);
        assert_eq!(response.message_type, MessageType::CapabilityAnnounce);
        assert_eq!(response.session_id.as_deref(), Some(session_id.as_str()));
        assert_eq!(session.role.as_deref(), Some("driver-display"));
        assert_eq!(session.capabilities, vec!["display", "touch"]);
    }

    #[test]
    fn capability_announce_rejects_a_wrong_session_id() {
        let mut session = ConnectionSession::default();
        handle_envelope(&mut session, hello("hello-1"));
        let incoming = Envelope::new(
            "caps-1",
            MessageType::CapabilityAnnounce,
            json!({"role":"driver-display","capabilities":["display"]}),
        ).in_session("session-wrong");
        let response = handle_envelope(&mut session, incoming);
        assert_eq!(response.message_type, MessageType::Error);
        assert_eq!(response.payload["reason"], "invalid_session");
    }

    #[test]
    fn a_second_hello_is_rejected() {
        let mut session = ConnectionSession::default();
        handle_envelope(&mut session, hello("hello-1"));
        let response = handle_envelope(&mut session, hello("hello-2"));
        assert_eq!(response.payload["reason"], "session_already_established");
    }
}
