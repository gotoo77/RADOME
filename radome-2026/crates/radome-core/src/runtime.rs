use std::collections::BTreeMap;

use crate::{Client, Event, Experience, MatchResult, SystemCapabilities};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Delivery {
    pub client_id: String,
    pub event: Event,
}

#[derive(Debug, Clone, Default)]
pub struct Runtime {
    clients: BTreeMap<String, Client>,
    system: SystemCapabilities,
}

impl Runtime {
    pub fn new(system: SystemCapabilities) -> Self {
        Self { clients: BTreeMap::new(), system }
    }

    pub fn register_client(&mut self, client: Client) {
        self.clients.insert(client.id.clone(), client);
    }

    pub fn unregister_client(&mut self, client_id: &str) -> Option<Client> {
        self.clients.remove(client_id)
    }

    pub fn evaluate(&self, experience: &Experience, client_id: &str) -> Option<MatchResult> {
        self.clients
            .get(client_id)
            .map(|client| experience.evaluate(&self.system, client))
    }

    pub fn publish_for_experience(&self, experience: &Experience, event: Event) -> Vec<Delivery> {
        self.clients
            .values()
            .filter(|client| experience.evaluate(&self.system, client).available)
            .map(|client| Delivery {
                client_id: client.id.clone(),
                event: event.clone(),
            })
            .collect()
    }

    pub fn client_count(&self) -> usize {
        self.clients.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Capability, MessageId, Role};

    fn cap(name: &str) -> Capability { Capability::new(name) }
    fn role(name: &str) -> Role { Role::new(name) }

    fn experience() -> Experience {
        Experience::new(
            "telemetry",
            [cap("vehicle.telemetry")],
            [cap("display")],
            [cap("touch")],
            [role("driver-display"), role("center-console")],
        )
    }

    #[test]
    fn runtime_registers_and_unregisters_clients() {
        let mut runtime = Runtime::new(SystemCapabilities::new([cap("vehicle.telemetry")]));
        runtime.register_client(Client::new("dashboard", role("driver-display"), [cap("display")]));
        assert_eq!(runtime.client_count(), 1);
        assert!(runtime.unregister_client("dashboard").is_some());
        assert_eq!(runtime.client_count(), 0);
    }

    #[test]
    fn runtime_distributes_an_event_only_to_eligible_clients() {
        let mut runtime = Runtime::new(SystemCapabilities::new([cap("vehicle.telemetry")]));
        runtime.register_client(Client::new("dashboard", role("driver-display"), [cap("display")]));
        runtime.register_client(Client::new("console", role("center-console"), [cap("display"), cap("touch")]));
        runtime.register_client(Client::new("rear-tablet", role("rear-passenger"), [cap("display"), cap("touch")]));
        runtime.register_client(Client::new("headless", role("driver-display"), []));

        let event = Event::new(MessageId::new("evt-1"), "vehicle.speed_changed", "speed_kmh=90");
        let deliveries = runtime.publish_for_experience(&experience(), event.clone());

        assert_eq!(deliveries, vec![
            Delivery { client_id: "console".into(), event: event.clone() },
            Delivery { client_id: "dashboard".into(), event },
        ]);
    }

    #[test]
    fn missing_system_capability_prevents_all_deliveries() {
        let mut runtime = Runtime::new(SystemCapabilities::default());
        runtime.register_client(Client::new("dashboard", role("driver-display"), [cap("display")]));

        let event = Event::new(MessageId::new("evt-1"), "vehicle.speed_changed", "speed_kmh=90");

        assert!(runtime.publish_for_experience(&experience(), event).is_empty());
    }
}
