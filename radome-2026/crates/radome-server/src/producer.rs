use crate::hub::{event_envelope, ConnectionHub};
use crate::metrics::process_metrics;
use crate::socketcan::VehicleFrameSource;
use radome_core::runtime::Runtime;
use radome_core::telemetry::{TelemetryEvent, TelemetrySimulator};
use radome_core::vehicle_bus::{FrameDecodeError, VehicleBusAdapter, VehicleBusFrame};
use radome_core::{Capability, Experience, MessageId, Role};
use std::io;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

pub type SharedRuntime = Arc<Mutex<Runtime>>;
pub type SharedHub = Arc<Mutex<ConnectionHub>>;
static NEXT_BUS_EVENT_ID: AtomicU64 = AtomicU64::new(1);

#[derive(Debug)]
pub enum VehicleSourceError {
    Read(io::Error),
    Decode(FrameDecodeError),
}

pub fn telemetry_experience() -> Experience {
    Experience::new(
        "telemetry",
        [Capability::new("vehicle.telemetry")],
        [Capability::new("display")],
        [Capability::new("touch")],
        [Role::new("driver-display"), Role::new("center-console")],
    )
}

fn publish_events(
    events: impl IntoIterator<Item = radome_core::Event>,
    runtime: &SharedRuntime,
    hub: &SharedHub,
) {
    let experience = telemetry_experience();
    for event in events {
        process_metrics().add_telemetry_events(1);
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
}

pub fn publish_next_sample(
    simulator: &mut TelemetrySimulator,
    runtime: &SharedRuntime,
    hub: &SharedHub,
) -> bool {
    let Some(events) = simulator.next_events() else {
        return false;
    };
    publish_events(events, runtime, hub);
    true
}

pub fn publish_bus_frame<A: VehicleBusAdapter>(
    adapter: &A,
    frame: &VehicleBusFrame,
    runtime: &SharedRuntime,
    hub: &SharedHub,
) -> Result<usize, FrameDecodeError> {
    let telemetry = adapter.decode(frame)?;
    let count = telemetry.len();
    publish_events(telemetry.into_iter().map(bus_telemetry_event), runtime, hub);
    Ok(count)
}

/// Lit exactement une trame depuis une source véhicule, la décode puis la
/// publie via le pipeline domaine/runtime/hub commun.
///
/// Cette fonction est utilisée aussi bien par SocketCAN que par les sources
/// simulées de test : le chemin matériel n'a donc pas de pipeline parallèle.
pub fn publish_next_bus_frame<S, A>(
    source: &mut S,
    adapter: &A,
    runtime: &SharedRuntime,
    hub: &SharedHub,
) -> Result<usize, VehicleSourceError>
where
    S: VehicleFrameSource,
    A: VehicleBusAdapter,
{
    let frame = source.recv().map_err(VehicleSourceError::Read)?;
    publish_bus_frame(adapter, &frame, runtime, hub).map_err(VehicleSourceError::Decode)
}

fn bus_telemetry_event(event: TelemetryEvent) -> radome_core::Event {
    let sequence = NEXT_BUS_EVENT_ID.fetch_add(1, Ordering::Relaxed);
    event.into_event(MessageId::new(format!("vehicle-bus-{sequence}")))
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
    use radome_core::vehicle_bus::{DemoCanAdapter, DemoLinAdapter};
    use radome_core::{Client, MessageType, SystemCapabilities};
    use std::collections::VecDeque;
    use tokio::sync::mpsc;

    struct FakeSource(VecDeque<VehicleBusFrame>);

    impl VehicleFrameSource for FakeSource {
        fn recv(&mut self) -> io::Result<VehicleBusFrame> {
            self.0
                .pop_front()
                .ok_or_else(|| io::Error::new(io::ErrorKind::UnexpectedEof, "done"))
        }
    }

    struct FailingSource;

    impl VehicleFrameSource for FailingSource {
        fn recv(&mut self) -> io::Result<VehicleBusFrame> {
            Err(io::Error::new(io::ErrorKind::NotConnected, "CAN interface lost"))
        }
    }

    fn connected_dashboard() -> (
        SharedRuntime,
        SharedHub,
        mpsc::Receiver<radome_core::Envelope>,
    ) {
        let runtime = Arc::new(Mutex::new(Runtime::new(SystemCapabilities::new([
            Capability::new("vehicle.telemetry"),
        ]))));
        runtime.lock().unwrap().register_client(Client::new(
            "dashboard",
            Role::new("driver-display"),
            [Capability::new("display")],
        ));
        let (tx, rx) = mpsc::channel(16);
        let hub = Arc::new(Mutex::new(ConnectionHub::default()));
        hub.lock().unwrap().register("dashboard", tx);
        (runtime, hub, rx)
    }

    #[test]
    fn independent_producer_routes_telemetry_through_runtime_and_hub() {
        let (runtime, hub, mut rx) = connected_dashboard();
        let mut simulator = TelemetrySimulator::demo_drive();
        assert!(publish_next_sample(&mut simulator, &runtime, &hub));
        let speed = rx.try_recv().expect("speed event");
        let rpm = rx.try_recv().expect("rpm event");
        assert_eq!(speed.message_type, MessageType::Event);
        assert_eq!(speed.payload["name"], "vehicle.speed_changed");
        assert_eq!(rpm.payload["name"], "vehicle.engine_rpm_changed");
    }

    #[test]
    fn simulated_vehicle_source_uses_the_same_pipeline_as_socketcan() {
        let (runtime, hub, mut rx) = connected_dashboard();
        let mut source = FakeSource(VecDeque::from([VehicleBusFrame::new(
            DemoCanAdapter::SPEED_FRAME_ID,
            [0x00, 0x5a],
        )]));

        let published = publish_next_bus_frame(&mut source, &DemoCanAdapter, &runtime, &hub)
            .expect("valid simulated CAN frame");

        assert_eq!(published, 1);
        let envelope = rx.try_recv().expect("dashboard receives source-derived event");
        assert_eq!(envelope.message_type, MessageType::Event);
        assert_eq!(envelope.payload["name"], "vehicle.speed_changed");
        assert_eq!(envelope.payload["data"], "speed_kmh=90");
        assert!(rx.try_recv().is_err());
    }

    #[test]
    fn source_read_failure_is_distinct_from_frame_decode_failure() {
        let (runtime, hub, mut rx) = connected_dashboard();
        let mut source = FailingSource;
        let error = publish_next_bus_frame(&mut source, &DemoCanAdapter, &runtime, &hub)
            .expect_err("source failure must propagate");
        assert!(matches!(error, VehicleSourceError::Read(_)));
        assert!(rx.try_recv().is_err());

        let mut malformed = FakeSource(VecDeque::from([VehicleBusFrame::new(
            DemoCanAdapter::SPEED_FRAME_ID,
            [90],
        )]));
        let error = publish_next_bus_frame(&mut malformed, &DemoCanAdapter, &runtime, &hub)
            .expect_err("decode failure must propagate");
        assert!(matches!(
            error,
            VehicleSourceError::Decode(FrameDecodeError::InvalidLength { .. })
        ));
        assert!(rx.try_recv().is_err());
    }

    #[test]
    fn fake_can_reaches_dashboard_as_the_same_domain_event() {
        let (runtime, hub, mut rx) = connected_dashboard();
        let published = publish_bus_frame(
            &DemoCanAdapter,
            &VehicleBusFrame::new(DemoCanAdapter::SPEED_FRAME_ID, [0x00, 0x5a]),
            &runtime,
            &hub,
        )
        .expect("valid CAN frame");
        assert_eq!(published, 1);
        let envelope = rx.try_recv().expect("dashboard receives CAN-derived event");
        assert_eq!(envelope.message_type, MessageType::Event);
        assert_eq!(envelope.payload["name"], "vehicle.speed_changed");
        assert_eq!(envelope.payload["data"], "speed_kmh=90");
        assert!(rx.try_recv().is_err());
    }

    #[test]
    fn fake_lin_reaches_dashboard_without_a_lin_specific_pipeline() {
        let (runtime, hub, mut rx) = connected_dashboard();
        let published = publish_bus_frame(
            &DemoLinAdapter,
            &VehicleBusFrame::new(
                DemoLinAdapter::VEHICLE_STATUS_FRAME_ID,
                [90, 0, 0x28, 0x0a],
            ),
            &runtime,
            &hub,
        )
        .expect("valid LIN frame");

        assert_eq!(published, 2);
        let speed = rx.try_recv().expect("LIN speed event");
        let rpm = rx.try_recv().expect("LIN rpm event");
        assert_eq!(speed.payload["name"], "vehicle.speed_changed");
        assert_eq!(speed.payload["data"], "speed_kmh=90");
        assert_eq!(rpm.payload["name"], "vehicle.engine_rpm_changed");
        assert_eq!(rpm.payload["data"], "engine_rpm=2600");
        assert!(rx.try_recv().is_err());
    }

    #[test]
    fn malformed_bus_frame_is_not_published() {
        let (runtime, hub, mut rx) = connected_dashboard();
        let result = publish_bus_frame(
            &DemoCanAdapter,
            &VehicleBusFrame::new(DemoCanAdapter::SPEED_FRAME_ID, [90]),
            &runtime,
            &hub,
        );
        assert!(matches!(
            result,
            Err(FrameDecodeError::InvalidLength { .. })
        ));
        assert!(rx.try_recv().is_err());
    }
}
