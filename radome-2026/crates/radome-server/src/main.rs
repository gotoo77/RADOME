use futures_util::{SinkExt, StreamExt};
use radome_core::{Envelope, MessageType};
use serde_json::json;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::Message};

const DEFAULT_ADDR: &str = "127.0.0.1:8787";

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

    while let Some(message) = websocket.next().await {
        let message = message?;

        match message {
            Message::Text(text) => {
                let response = match Envelope::decode_json(text.as_ref()) {
                    Ok(incoming) => handle_envelope(incoming),
                    Err(error) => Envelope::new(
                        "server-error",
                        MessageType::Error,
                        json!({"reason": format!("{error:?}")}),
                    ),
                };

                websocket
                    .send(Message::Text(response.encode_json()?.into()))
                    .await?;
            }
            Message::Ping(payload) => websocket.send(Message::Pong(payload)).await?,
            Message::Close(_) => break,
            _ => {}
        }
    }

    Ok(())
}

fn handle_envelope(incoming: Envelope) -> Envelope {
    match incoming.message_type {
        MessageType::Hello => Envelope::new(
            "server-hello",
            MessageType::Hello,
            json!({
                "server": "radome-server",
                "protocol_version": radome_core::PROTOCOL_VERSION
            }),
        )
        .correlated_to(incoming.id),
        _ => Envelope::new(
            "server-error",
            MessageType::Error,
            json!({"reason": "unsupported_message_type"}),
        )
        .correlated_to(incoming.id),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hello_receives_a_correlated_server_hello() {
        let incoming = Envelope::new(
            "hello-42",
            MessageType::Hello,
            json!({"client": "dashboard"}),
        );

        let response = handle_envelope(incoming);

        assert_eq!(response.message_type, MessageType::Hello);
        assert_eq!(response.correlation_id.as_deref(), Some("hello-42"));
        assert_eq!(response.payload["server"], "radome-server");
    }

    #[test]
    fn unsupported_message_type_receives_a_correlated_error() {
        let incoming = Envelope::new(
            "evt-42",
            MessageType::Event,
            json!({"name": "something"}),
        );

        let response = handle_envelope(incoming);

        assert_eq!(response.message_type, MessageType::Error);
        assert_eq!(response.correlation_id.as_deref(), Some("evt-42"));
        assert_eq!(response.payload["reason"], "unsupported_message_type");
    }
}
