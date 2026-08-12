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

async fn hello(socket: &mut Socket, request_id: &str) -> String {
    send(
        socket,
        Envelope::new(
            request_id,
            MessageType::Hello,
            json!({"client_id":"reconnect-console"}),
        ),
    )
    .await;
    receive(socket).await.session_id.expect("hello session id")
}

async fn announce_media(socket: &mut Socket, session_id: &str) {
    send(
        socket,
        Envelope::new(
            "caps-media",
            MessageType::CapabilityAnnounce,
            json!({"role":"center-console","capabilities":["media.control"]}),
        )
        .in_session(session_id),
    )
    .await;
    assert_eq!(receive(socket).await.payload["accepted"], true);
}

#[tokio::test]
async fn reconnecting_same_client_gets_fresh_session_without_resetting_server_state() {
    let addr = free_addr();
    let _server = spawn_server(&addr);

    let mut first = connect(&addr).await;
    let first_session = hello(&mut first, "hello-first").await;
    announce_media(&mut first, &first_session).await;

    send(
        &mut first,
        Envelope::new(
            "cmd-before-disconnect",
            MessageType::Command,
            json!({"name":"media.next_track"}),
        )
        .in_session(first_session.clone()),
    )
    .await;
    assert_eq!(receive(&mut first).await.payload["outcome"], "succeeded");
    assert_eq!(receive(&mut first).await.payload["data"]["track_index"], 1);

    first.close(None).await.unwrap();
    sleep(Duration::from_millis(50)).await;

    let mut second = connect(&addr).await;
    let second_session = hello(&mut second, "hello-second").await;
    assert_ne!(second_session, first_session);

    send(
        &mut second,
        Envelope::new(
            "old-session-command",
            MessageType::Command,
            json!({"name":"media.play"}),
        )
        .in_session(first_session),
    )
    .await;
    assert_eq!(receive(&mut second).await.payload["code"], "invalid_session");

    send(
        &mut second,
        Envelope::new(
            "fresh-session-command",
            MessageType::Command,
            json!({"name":"media.play"}),
        )
        .in_session(second_session.clone()),
    )
    .await;
    assert_eq!(
        receive(&mut second).await.payload["code"],
        "capability_announce_required"
    );

    send(
        &mut second,
        Envelope::new(
            "snapshot-after-reconnect",
            MessageType::StateSnapshotRequest,
            json!({}),
        )
        .in_session(second_session.clone()),
    )
    .await;
    let snapshot = receive(&mut second).await;
    assert_eq!(snapshot.message_type, MessageType::StateSnapshot);
    assert_eq!(snapshot.session_id.as_deref(), Some(second_session.as_str()));
    assert_eq!(snapshot.payload["media"]["track_index"], 1);

    second.close(None).await.unwrap();
}
