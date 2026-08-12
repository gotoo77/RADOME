use futures_util::{SinkExt, StreamExt};
use radome_core::{Envelope, MessageType};
use serde_json::json;
use std::net::TcpListener as StdTcpListener;
use std::process::{Child, Command, Stdio};
use std::time::Duration;
use tokio::net::TcpStream;
use tokio::time::{sleep, timeout};
use tokio_tungstenite::{
    connect_async,
    tungstenite::Message,
    MaybeTlsStream,
    WebSocketStream,
};

type Socket = WebSocketStream<MaybeTlsStream<TcpStream>>;

struct ServerGuard(Child);

impl Drop for ServerGuard {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

fn free_addr() -> String {
    let listener = StdTcpListener::bind("127.0.0.1:0").expect("reserve test address");
    let addr = listener.local_addr().expect("read test address");
    drop(listener);
    addr.to_string()
}

fn spawn_server(addr: &str) -> ServerGuard {
    let child = Command::new(env!("CARGO_BIN_EXE_radome-server"))
        .env("RADOME_ADDR", addr)
        .env("RADOME_TELEMETRY_SOURCE", "demo")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .expect("spawn radome-server");
    ServerGuard(child)
}

async fn connect(addr: &str) -> Socket {
    let url = format!("ws://{addr}");
    for _ in 0..50 {
        if let Ok((socket, _)) = connect_async(&url).await {
            return socket;
        }
        sleep(Duration::from_millis(20)).await;
    }
    panic!("radome-server did not accept connections at {url}");
}

async fn send(socket: &mut Socket, envelope: Envelope) {
    socket
        .send(Message::Text(envelope.encode_json().unwrap().into()))
        .await
        .unwrap();
}

async fn receive(socket: &mut Socket) -> Envelope {
    let message = timeout(Duration::from_secs(3), socket.next())
        .await
        .expect("server response timeout")
        .expect("socket closed")
        .expect("websocket error");
    let Message::Text(text) = message else {
        panic!("expected text websocket message");
    };
    Envelope::decode_json(text.as_ref()).unwrap()
}

async fn receive_correlated(socket: &mut Socket, request_id: &str) -> Envelope {
    loop {
        let envelope = receive(socket).await;
        if envelope.correlation_id.as_deref() == Some(request_id) {
            return envelope;
        }
    }
}

async fn receive_vehicle_event(socket: &mut Socket) -> Envelope {
    loop {
        let envelope = receive(socket).await;
        if envelope.message_type == MessageType::Event
            && envelope.payload["name"]
                .as_str()
                .is_some_and(|name| name.starts_with("vehicle."))
        {
            return envelope;
        }
    }
}

async fn hello(socket: &mut Socket, client_id: &str, request_id: &str) -> String {
    send(
        socket,
        Envelope::new(
            request_id,
            MessageType::Hello,
            json!({"client_id": client_id}),
        ),
    )
    .await;
    receive_correlated(socket, request_id)
        .await
        .session_id
        .expect("hello session id")
}

async fn announce(
    socket: &mut Socket,
    session_id: &str,
    request_id: &str,
    capabilities: &[&str],
) {
    send(
        socket,
        Envelope::new(
            request_id,
            MessageType::CapabilityAnnounce,
            json!({"role":"center-console","capabilities":capabilities}),
        )
        .in_session(session_id),
    )
    .await;
    assert_eq!(receive_correlated(socket, request_id).await.payload["accepted"], true);
}

#[tokio::test]
async fn simultaneous_clients_keep_sessions_commands_and_routing_isolated() {
    let addr = free_addr();
    let _server = spawn_server(&addr);

    let mut media_only = connect(&addr).await;
    let mut display_and_media = connect(&addr).await;

    let media_session = hello(&mut media_only, "media-console", "hello-media").await;
    let display_session = hello(&mut display_and_media, "display-console", "hello-display").await;
    assert_ne!(media_session, display_session);

    announce(
        &mut media_only,
        &media_session,
        "caps-media",
        &["media.control"],
    )
    .await;
    announce(
        &mut display_and_media,
        &display_session,
        "caps-display",
        &["media.control", "display"],
    )
    .await;

    send(
        &mut display_and_media,
        Envelope::new(
            "foreign-session-command",
            MessageType::Command,
            json!({"name":"media.play"}),
        )
        .in_session(media_session.clone()),
    )
    .await;
    let foreign = receive_correlated(&mut display_and_media, "foreign-session-command").await;
    assert_eq!(foreign.message_type, MessageType::Error);
    assert_eq!(foreign.payload["code"], "invalid_session");

    let first_command = Envelope::new(
        "same-command-id",
        MessageType::Command,
        json!({"name":"media.next_track"}),
    )
    .in_session(media_session.clone());
    send(&mut media_only, first_command).await;
    let first_result = receive_correlated(&mut media_only, "same-command-id").await;
    let first_event = receive_correlated(&mut media_only, "same-command-id").await;
    assert_eq!(first_result.payload["outcome"], "succeeded");
    assert_eq!(first_event.session_id.as_deref(), Some(media_session.as_str()));
    assert_eq!(first_event.payload["data"]["track_index"], 1);

    let second_command = Envelope::new(
        "same-command-id",
        MessageType::Command,
        json!({"name":"media.next_track"}),
    )
    .in_session(display_session.clone());
    send(&mut display_and_media, second_command).await;
    let second_result = receive_correlated(&mut display_and_media, "same-command-id").await;
    let second_event = receive_correlated(&mut display_and_media, "same-command-id").await;
    assert_eq!(second_result.payload["outcome"], "succeeded");
    assert_eq!(second_event.session_id.as_deref(), Some(display_session.as_str()));
    assert_eq!(second_event.payload["data"]["track_index"], 2);

    assert!(timeout(Duration::from_millis(150), media_only.next()).await.is_err());

    let telemetry = receive_vehicle_event(&mut display_and_media).await;
    assert!(matches!(
        telemetry.payload["name"].as_str(),
        Some("vehicle.speed_changed" | "vehicle.engine_rpm_changed")
    ));
    assert!(timeout(Duration::from_millis(150), media_only.next()).await.is_err());

    send(
        &mut media_only,
        Envelope::new(
            "snapshot-media",
            MessageType::StateSnapshotRequest,
            json!({}),
        )
        .in_session(media_session.clone()),
    )
    .await;
    let media_snapshot = receive_correlated(&mut media_only, "snapshot-media").await;
    assert_eq!(media_snapshot.session_id.as_deref(), Some(media_session.as_str()));
    assert_eq!(media_snapshot.payload["media"]["track_index"], 2);

    send(
        &mut display_and_media,
        Envelope::new(
            "snapshot-display",
            MessageType::StateSnapshotRequest,
            json!({}),
        )
        .in_session(display_session.clone()),
    )
    .await;
    let display_snapshot = receive_correlated(&mut display_and_media, "snapshot-display").await;
    assert_eq!(
        display_snapshot.session_id.as_deref(),
        Some(display_session.as_str())
    );
    assert_eq!(display_snapshot.payload["media"]["track_index"], 2);

    media_only.close(None).await.unwrap();
    display_and_media.close(None).await.unwrap();
}
