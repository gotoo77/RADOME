use radome_core::{Capability, Client, Experience, Role, SystemCapabilities};
use radome_core::runtime::{Delivery, Runtime};
use radome_core::telemetry::TelemetrySimulator;

fn cap(name: &str) -> Capability { Capability::new(name) }
fn role(name: &str) -> Role { Role::new(name) }

#[test]
fn telemetry_simulator_flows_through_runtime_to_eligible_clients() {
    let mut runtime = Runtime::new(SystemCapabilities::new([cap("vehicle.telemetry")]));
    runtime.register_client(Client::new(
        "dashboard",
        role("driver-display"),
        [cap("display")],
    ));
    runtime.register_client(Client::new(
        "console",
        role("center-console"),
        [cap("display"), cap("touch")],
    ));
    runtime.register_client(Client::new(
        "rear-tablet",
        role("rear-passenger"),
        [cap("display"), cap("touch")],
    ));

    let experience = Experience::new(
        "telemetry",
        [cap("vehicle.telemetry")],
        [cap("display")],
        [cap("touch")],
        [role("driver-display"), role("center-console")],
    );

    let mut simulator = TelemetrySimulator::demo_drive();
    let events = simulator.next_events().expect("first telemetry sample");

    let deliveries = events
        .into_iter()
        .flat_map(|event| runtime.publish_for_experience(&experience, event))
        .collect::<Vec<Delivery>>();

    assert_eq!(deliveries.len(), 4);
    assert_eq!(deliveries[0].client_id, "console");
    assert_eq!(deliveries[1].client_id, "dashboard");
    assert_eq!(deliveries[2].client_id, "console");
    assert_eq!(deliveries[3].client_id, "dashboard");

    assert_eq!(deliveries[0].event.name, "vehicle.speed_changed");
    assert_eq!(deliveries[0].event.payload, "speed_kmh=0");
    assert_eq!(deliveries[2].event.name, "vehicle.engine_rpm_changed");
    assert_eq!(deliveries[2].event.payload, "engine_rpm=800");

    assert!(deliveries.iter().all(|delivery| delivery.client_id != "rear-tablet"));
}

#[test]
fn replay_after_reset_produces_the_same_deliveries() {
    let mut runtime = Runtime::new(SystemCapabilities::new([cap("vehicle.telemetry")]));
    runtime.register_client(Client::new(
        "dashboard",
        role("driver-display"),
        [cap("display")],
    ));

    let experience = Experience::new(
        "telemetry",
        [cap("vehicle.telemetry")],
        [cap("display")],
        [],
        [role("driver-display")],
    );

    let mut simulator = TelemetrySimulator::demo_drive();
    let first = simulator
        .next_events()
        .expect("first sample")
        .into_iter()
        .flat_map(|event| runtime.publish_for_experience(&experience, event))
        .collect::<Vec<_>>();

    simulator.reset();

    let replay = simulator
        .next_events()
        .expect("replayed first sample")
        .into_iter()
        .flat_map(|event| runtime.publish_for_experience(&experience, event))
        .collect::<Vec<_>>();

    assert_eq!(first, replay);
}
