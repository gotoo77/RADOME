use radome_core::{Envelope, MessageType};
use std::collections::BTreeMap;
use tokio::sync::mpsc;

#[derive(Debug, Default)]
pub struct ConnectionHub {
    clients: BTreeMap<String, mpsc::UnboundedSender<Envelope>>,
}

impl ConnectionHub {
    pub fn register(&mut self, client_id: impl Into<String>, sender: mpsc::UnboundedSender<Envelope>) {
        self.clients.insert(client_id.into(), sender);
    }

    pub fn unregister(&mut self, client_id: &str) {
        self.clients.remove(client_id);
    }

    pub fn send_to(&mut self, client_id: &str, envelope: Envelope) -> bool {
        let Some(sender) = self.clients.get(client_id) else { return false; };
        if sender.send(envelope).is_err() {
            self.clients.remove(client_id);
            return false;
        }
        true
    }

    pub fn client_count(&self) -> usize { self.clients.len() }
}

pub fn event_envelope(event: &radome_core::Event, session_id: impl Into<String>) -> Envelope {
    Envelope::new(
        event.id.value(),
        MessageType::Event,
        serde_json::json!({"name": event.name, "data": event.payload}),
    )
    .in_session(session_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use radome_core::{Event, MessageId};

    #[test]
    fn hub_routes_an_envelope_to_a_registered_client() {
        let (tx, mut rx) = mpsc::unbounded_channel();
        let mut hub = ConnectionHub::default();
        hub.register("dashboard", tx);
        let event = Event::new(MessageId::new("evt-1"), "vehicle.speed_changed", "speed_kmh=90");
        assert!(hub.send_to("dashboard", event_envelope(&event, "session-1")));
        let received = rx.try_recv().expect("routed envelope");
        assert_eq!(received.message_type, MessageType::Event);
        assert_eq!(received.payload["name"], "vehicle.speed_changed");
    }

    #[test]
    fn hub_drops_closed_clients() {
        let (tx, rx) = mpsc::unbounded_channel();
        drop(rx);
        let mut hub = ConnectionHub::default();
        hub.register("dashboard", tx);
        assert!(!hub.send_to("dashboard", Envelope::new("evt", MessageType::Event, serde_json::json!({}))));
        assert_eq!(hub.client_count(), 0);
    }
}
