mod actuators;
mod command_executor;
mod commands;
mod hub;
mod producer;
mod server;
mod socketcan;
#[cfg(test)]
mod ordering_tests;

use actuators::{
    DemoClimateActuator, DemoMediaActuator, SharedClimateActuator, SharedMediaActuator,
};
use hub::ConnectionHub;
use producer::{
    publish_next_bus_frame, run_demo_telemetry, SharedHub, SharedRuntime, VehicleSourceError,
};
use radome_core::runtime::Runtime;
use radome_core::vehicle_bus::DemoCanAdapter;
use radome_core::{Capability, SystemCapabilities};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::net::TcpListener;

const DEFAULT_ADDR: &str = "127.0.0.1:8787";
const DEFAULT_CAN_RETRY_MS: u64 = 1_000;

fn new_runtime() -> SharedRuntime {
    Arc::new(Mutex::new(Runtime::new(SystemCapabilities::new([
        Capability::new("vehicle.telemetry"),
    ]))))
}

fn new_hub() -> SharedHub {
    Arc::new(Mutex::new(ConnectionHub::default()))
}

fn new_climate_actuator() -> SharedClimateActuator {
    Arc::new(DemoClimateActuator::new())
}

fn new_media_actuator() -> SharedMediaActuator {
    Arc::new(DemoMediaActuator::new())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = std::env::var("RADOME_ADDR").unwrap_or_else(|_| DEFAULT_ADDR.to_owned());
    let listener = TcpListener::bind(&addr).await?;
    let runtime = new_runtime();
    let hub = new_hub();
    let climate_actuator = new_climate_actuator();
    let media_actuator = new_media_actuator();

    start_telemetry_source(Arc::clone(&runtime), Arc::clone(&hub))?;
    println!("RADOME server listening on ws://{addr}");
    server::serve(listener, runtime, hub, climate_actuator, media_actuator).await
}

fn start_telemetry_source(
    runtime: SharedRuntime,
    hub: SharedHub,
) -> Result<(), Box<dyn std::error::Error>> {
    let source = std::env::var("RADOME_TELEMETRY_SOURCE").unwrap_or_else(|_| "demo".to_owned());
    match source.as_str() {
        "demo" => {
            tokio::spawn(run_demo_telemetry(runtime, hub, Duration::from_secs(1)));
            println!("RADOME telemetry source: demo");
            Ok(())
        }
        "socketcan" => start_socketcan(runtime, hub),
        other => Err(format!("unknown RADOME_TELEMETRY_SOURCE: {other}").into()),
    }
}

fn can_retry_delay() -> Result<Duration, Box<dyn std::error::Error>> {
    let value = std::env::var("RADOME_CAN_RETRY_MS")
        .unwrap_or_else(|_| DEFAULT_CAN_RETRY_MS.to_string());
    let milliseconds = value
        .parse::<u64>()
        .map_err(|_| format!("invalid RADOME_CAN_RETRY_MS: {value}"))?;
    if milliseconds == 0 {
        return Err("RADOME_CAN_RETRY_MS must be greater than zero".into());
    }
    Ok(Duration::from_millis(milliseconds))
}

#[cfg(target_os = "linux")]
fn start_socketcan(
    runtime: SharedRuntime,
    hub: SharedHub,
) -> Result<(), Box<dyn std::error::Error>> {
    use socketcan::{
        source_error_requires_reconnect, ReconnectingVehicleSource, SocketCanSource,
    };

    let interface = std::env::var("RADOME_CAN_INTERFACE").unwrap_or_else(|_| "can0".to_owned());
    if interface.as_bytes().contains(&0) {
        return Err("RADOME_CAN_INTERFACE contains an invalid NUL byte".into());
    }
    let retry_delay = can_retry_delay()?;
    let interface_for_open = interface.clone();
    let mut source = ReconnectingVehicleSource::new(move || {
        SocketCanSource::open(&interface_for_open)
    });

    println!(
        "RADOME telemetry source: SocketCAN ({interface}), retry={}ms",
        retry_delay.as_millis()
    );

    tokio::task::spawn_blocking(move || {
        let adapter = DemoCanAdapter;
        loop {
            match publish_next_bus_frame(&mut source, &adapter, &runtime, &hub) {
                Ok(_) => {}
                Err(VehicleSourceError::Decode(error)) => {
                    eprintln!("CAN frame ignored: {error:?}");
                }
                Err(VehicleSourceError::Read(error)) => {
                    if source_error_requires_reconnect(&error) {
                        eprintln!(
                            "SocketCAN unavailable on {interface}: {error}; retry in {}ms",
                            retry_delay.as_millis()
                        );
                        std::thread::sleep(retry_delay);
                    } else {
                        eprintln!("SocketCAN frame read ignored on {interface}: {error}");
                    }
                }
            }
        }
    });
    Ok(())
}

#[cfg(not(target_os = "linux"))]
fn start_socketcan(
    _runtime: SharedRuntime,
    _hub: SharedHub,
) -> Result<(), Box<dyn std::error::Error>> {
    Err("SocketCAN telemetry is only available on Linux".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_retry_delay_defaults_to_one_second() {
        std::env::remove_var("RADOME_CAN_RETRY_MS");
        assert_eq!(can_retry_delay().unwrap(), Duration::from_secs(1));
    }
}
