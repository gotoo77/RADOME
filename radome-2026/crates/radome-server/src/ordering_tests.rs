use super::{new_climate_actuator, new_hub, new_media_actuator, new_runtime, server};
use futures_util::{SinkExt, StreamExt};
use radome_core::{Envelope, MessageType};
use serde_json::json;
use tokio::net::TcpListener;
use tokio::time::{timeout, Duration};
use tokio_tungstenite::{connect_async, tungstenite::Message};

async fn send(
    socket: &mut tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
    envelope: Envelope,
) {
    socket
        .send(Message::Text(envelope.encode_json().unwrap().into()))
        .await
        .unwrap();
}

async fn receive(
    socket: &mut tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
) -> Envelope {
    let message = timeout(Duration::from_secs(2), socket.next())
        .await
        .expect("server response timeout")
        .expect("socket closed")
        .expect("websocket error");
    let Message::Text(text) = message else {
        panic!("expected text websocket message");
    };
    Envelope::decode_json(text.as_ref()).unwrap()
}

#[tokio::test]
async fn command_result_event_and_later_snapshot_keep_request_order() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let server_task = tokio::spawn(async move {
        let _ = server::serve(
            listener,
            new_runtime(),
            new_hub(),
            new_climate_actuator(),
            new_media_actuator(),
        )
        .await;
    });

    let (mut socket, _) = connect_async(format!("ws://{addr}")).await.unwrap();

    send(
        &mut socket,
        Envelope::new(
            "ordering-hello",
            MessageType::Hello,
            json!({"client_id":"ordering-client"}),
        ),
    )
    .await;
    let session_id = receive(&mut socket).await.session_id.unwrap();

    send(
        &mut socket,
        Envelope::new(
            "ordering-capabilities",
            MessageType::CapabilityAnnounce,
            json!({
                "role":"center-console",
                "capabilities":["media.control"]
            }),
        )
        .in_session(session_id.clone()),
    )
    .await;
    assert_eq!(receive(&mut socket).await.payload["accepted"], true);

    // Intentionally pipeline the next request before consuming either command response.
    // This locks the per-connection ordering contract rather than a client-side wait pattern.
    send(
        &mut socket,
        Envelope::new(
            "ordering-command",
            MessageType::Command,
            json!({"name":"media.play"}),
        )
        .in_session(session_id.clone()),
    )
    .await;
    send(
        &mut socket,
        Envelope::new(
            "ordering-snapshot",
            MessageType::StateSnapshotRequest,
            json!({}),
        )
        .in_session(session_id.clone()),
    )
    .await;

    let result = receive(&mut socket).await;
    let event = receive(&mut socket).await;
    let snapshot = receive(&mut socket).await;

    assert_eq!(result.message_type, MessageType::CommandResult);
    assert_eq!(result.correlation_id.as_deref(), Some("ordering-command"));
    assert_eq!(result.session_id.as_deref(), Some(session_id.as_str()));

    assert_eq!(event.message_type, MessageType::Event);
    assert_eq!(event.correlation_id.as_deref(), Some("ordering-command"));
    assert_eq!(event.session_id.as_deref(), Some(session_id.as_str()));
    assert_eq!(event.payload["name"], "media.playback_started");

    assert_eq!(snapshot.message_type, MessageType::StateSnapshot);
    assert_eq!(snapshot.correlation_id.as_deref(), Some("ordering-snapshot"));
    assert_eq!(snapshot.session_id.as_deref(), Some(session_id.as_str()));
    assert_eq!(snapshot.payload["media"]["playback"], "playing");

    socket.close(None).await.unwrap();
    server_task.abort();
    let _ = server_task.await;
}
