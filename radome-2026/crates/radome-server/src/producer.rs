use crate::hub::{event_envelope, ConnectionHub};
use radome_core::runtime::Runtime;
use radome_core::telemetry::TelemetrySimulator;
use radome_core::{Capability, Experience, Role};
use std::sync::{Arc, Mutex};
use std::time::Duration;

pub type SharedRuntime = Arc<Mutex<Runtime>>;
pub type SharedHub = Arc<Mutex<ConnectionHub>>;

pub fn telemetry_experience() -> Experience {
    Experience::new(
        "telemetry",
        [Capability::new("vehicle.telemetry")],
        [Capability::new("display")],
        [Capability::new("touch")],
        [Role::new("driver-display"), Role::new("center-console")],
    )
}

pub fn publish_next_sample(
    simulator: &mut TelemetrySimulator,
    runtime: &SharedRuntime,
    hub: &SharedHub,
) -> bool {
    let Some(events) = simulator.next_events() else { return false; };
    let experience = telemetry_experience();
    for event in events {
        let deliveries = runtime
            .lock()
            .expect("runtime mutex poisoned")
            .publish_for_experience(&experience, event);
        for delivery in deliveries {
            hub.lock()
                .expect("hub mutex poisoned")
                .send_to(&delivery.client_id, event_envelope(&delivery.event, "telemetry"));
        }
    }
    true
}

pub async fn run_demo_telemetry(runtime: SharedRuntime, hub: SharedHub, period: Duration) {
    let mut simulator = TelemetrySimulator::demo_drive();
    loop {
        if !publish_next_sample(&mut simulator, &runtime, &hub) {
            simulator.reset();
        }
        tokio::time::sleep(period).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use radome_core::{Client, MessageType, SystemCapabilities};
    use tokio::sync::mpsc;

    #[test]
    fn independent_producer_routes_telemetry_through_runtime_and_hub() {
        let runtime = Arc::new(Mutex::new(Runtime::new(SystemCapabilities::new([
            Capability::new("vehicle.telemetry"),
        ]))));
        runtime.lock().unwrap().register_client(Client::new(
            "dashboard",
            Role::new("driver-display"),
            [Capability::new("display")],
        ));
        let (tx, mut rx) = mpsc::unbounded_channel();
        let hub = Arc::new(Mutex::new(ConnectionHub::default()));
        hub.lock().unwrap().register("dashboard", tx);
        let mut simulator = TelemetrySimulator::demo_drive();

        assert!(publish_next_sample(&mut simulator, &runtime, &hub));
        let speed = rx.try_recv().expect("speed event");
        let rpm = rx.try_recv().expect("rpm event");
        assert_eq!(speed.message_type, MessageType::Event);
        assert_eq!(speed.payload["name"], "vehicle.speed_changed");
        assert_eq!(rpm.payload["name"], "vehicle.engine_rpm_changed");
    }
}
