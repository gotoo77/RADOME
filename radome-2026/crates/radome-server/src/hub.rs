use crate::metrics::process_metrics;
use radome_core::{Envelope, MessageType};
use std::collections::BTreeMap;
use tokio::sync::mpsc;
use tokio::sync::mpsc::error::TrySendError;

#[derive(Debug, Default)]
pub struct ConnectionHub {
    clients: BTreeMap<String, mpsc::Sender<Envelope>>,
}

impl ConnectionHub {
    pub fn register(&mut self, client_id: impl Into<String>, sender: mpsc::Sender<Envelope>) {
        self.clients.insert(client_id.into(), sender);
        process_metrics().record_client_registration(self.clients.len());
    }

    pub fn unregister(&mut self, client_id: &str) {
        self.clients.remove(client_id);
        process_metrics().set_active_clients(self.clients.len());
    }

    /// Essaie de livrer un événement asynchrone sans jamais agrandir la mémoire
    /// de manière non bornée. Une file pleine signifie que ce client est en
    /// retard : l'événement est abandonné pour ce client, mais la connexion est
    /// conservée afin qu'un futur snapshot puisse la resynchroniser.
    pub fn send_to(&mut self, client_id: &str, envelope: Envelope) -> bool {
        let Some(sender) = self.clients.get(client_id).cloned() else {
            return false;
        };

        match sender.try_send(envelope) {
            Ok(()) => true,
            Err(TrySendError::Full(_)) => {
                process_metrics().record_outbound_backpressure_drop();
                false
            }
            Err(TrySendError::Closed(_)) => {
                self.clients.remove(client_id);
                process_metrics().set_active_clients(self.clients.len());
                false
            }
        }
    }

    pub fn client_count(&self) -> usize {
        self.clients.len()
    }
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
        let (tx, mut rx) = mpsc::channel(2);
        let mut hub = ConnectionHub::default();
        hub.register("dashboard", tx);
        let event = Event::new(
            MessageId::new("evt-1"),
            "vehicle.speed_changed",
            "speed_kmh=90",
        );
        assert!(hub.send_to("dashboard", event_envelope(&event, "session-1")));
        let received = rx.try_recv().expect("routed envelope");
        assert_eq!(received.message_type, MessageType::Event);
        assert_eq!(received.payload["name"], "vehicle.speed_changed");
    }

    #[test]
    fn hub_drops_closed_clients() {
        let (tx, rx) = mpsc::channel(1);
        drop(rx);
        let mut hub = ConnectionHub::default();
        hub.register("dashboard", tx);
        assert!(!hub.send_to(
            "dashboard",
            Envelope::new("evt", MessageType::Event, serde_json::json!({}))
        ));
        assert_eq!(hub.client_count(), 0);
    }

    #[test]
    fn hub_drops_only_the_overflowing_event_and_keeps_the_client() {
        let (tx, mut rx) = mpsc::channel(1);
        let mut hub = ConnectionHub::default();
        hub.register("slow-dashboard", tx);

        assert!(hub.send_to(
            "slow-dashboard",
            Envelope::new("evt-1", MessageType::Event, serde_json::json!({"n": 1}))
        ));
        assert!(!hub.send_to(
            "slow-dashboard",
            Envelope::new("evt-2", MessageType::Event, serde_json::json!({"n": 2}))
        ));
        assert_eq!(hub.client_count(), 1);

        assert_eq!(rx.try_recv().unwrap().id, "evt-1");
        assert!(hub.send_to(
            "slow-dashboard",
            Envelope::new("evt-3", MessageType::Event, serde_json::json!({"n": 3}))
        ));
        assert_eq!(rx.try_recv().unwrap().id, "evt-3");
    }
}
