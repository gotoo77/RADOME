mod actuators;
mod command_executor;
mod commands;
mod hub;
mod producer;
mod server;
mod socketcan;

use actuators::{DemoClimateActuator, SharedClimateActuator};
use hub::ConnectionHub;
use producer::{publish_bus_frame, run_demo_telemetry, SharedHub, SharedRuntime};
use radome_core::runtime::Runtime;
use radome_core::vehicle_bus::DemoCanAdapter;
use radome_core::{Capability, SystemCapabilities};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::net::TcpListener;

const DEFAULT_ADDR: &str = "127.0.0.1:8787";

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

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = std::env::var("RADOME_ADDR").unwrap_or_else(|_| DEFAULT_ADDR.to_owned());
    let listener = TcpListener::bind(&addr).await?;
    let runtime = new_runtime();
    let hub = new_hub();
    let climate_actuator = new_climate_actuator();
    start_telemetry_source(Arc::clone(&runtime), Arc::clone(&hub))?;
    println!("RADOME server listening on ws://{addr}");
    server::serve(listener, runtime, hub, climate_actuator).await
}

fn start_telemetry_source(runtime: SharedRuntime, hub: SharedHub) -> Result<(), Box<dyn std::error::Error>> {
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

#[cfg(target_os = "linux")]
fn start_socketcan(runtime: SharedRuntime, hub: SharedHub) -> Result<(), Box<dyn std::error::Error>> {
    use socketcan::{SocketCanSource, VehicleFrameSource};
    let interface = std::env::var("RADOME_CAN_INTERFACE").unwrap_or_else(|_| "can0".to_owned());
    let mut source = SocketCanSource::open(&interface)?;
    println!("RADOME telemetry source: SocketCAN ({interface})");
    tokio::task::spawn_blocking(move || {
        let adapter = DemoCanAdapter;
        loop {
            match source.recv() {
                Ok(frame) => {
                    if let Err(error) = publish_bus_frame(&adapter, &frame, &runtime, &hub) {
                        eprintln!("CAN frame ignored: {error:?}");
                    }
                }
                Err(error) => {
                    eprintln!("SocketCAN receive failed: {error}");
                    break;
                }
            }
        }
    });
    Ok(())
}

#[cfg(not(target_os = "linux"))]
fn start_socketcan(_runtime: SharedRuntime, _hub: SharedHub) -> Result<(), Box<dyn std::error::Error>> {
    Err("SocketCAN telemetry is only available on Linux".into())
}
