mod actuators;
mod command_executor;
mod commands;
mod config;
mod hub;
mod producer;
mod server;
mod socketcan;
#[cfg(test)]
mod ordering_tests;

use actuators::{
    DemoClimateActuator, DemoMediaActuator, SharedClimateActuator, SharedMediaActuator,
};
use config::{ServerConfig, SocketCanConfig, TelemetrySource};
use hub::ConnectionHub;
use producer::{
    publish_next_bus_frame, run_demo_telemetry, SharedHub, SharedRuntime, VehicleSourceError,
};
use radome_core::runtime::Runtime;
use radome_core::vehicle_bus::{CanSignal, ConfigurableCanAdapter};
use radome_core::{Capability, SystemCapabilities};
use serde_json::Value;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::net::TcpListener;

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
    let config = ServerConfig::load().map_err(|error| {
        std::io::Error::new(std::io::ErrorKind::InvalidInput, error)
    })?;
    let listener = TcpListener::bind(&config.listen_addr).await?;
    let runtime = new_runtime();
    let hub = new_hub();
    let climate_actuator = new_climate_actuator();
    let media_actuator = new_media_actuator();

    start_telemetry_source(&config, Arc::clone(&runtime), Arc::clone(&hub))?;
    if let Some(path) = &config.config_path {
        println!("RADOME configuration: {}", path.display());
    } else {
        println!("RADOME configuration: defaults + environment");
    }
    println!("RADOME server listening on ws://{}", config.listen_addr);
    server::serve(listener, runtime, hub, climate_actuator, media_actuator).await
}

fn start_telemetry_source(
    config: &ServerConfig,
    runtime: SharedRuntime,
    hub: SharedHub,
) -> Result<(), Box<dyn std::error::Error>> {
    match config.telemetry.source {
        TelemetrySource::Demo => {
            tokio::spawn(run_demo_telemetry(runtime, hub, Duration::from_secs(1)));
            println!("RADOME telemetry source: demo");
            Ok(())
        }
        TelemetrySource::SocketCan => start_socketcan(&config.telemetry.socketcan, runtime, hub),
    }
}

fn parse_can_frame_id(value: &Value) -> Result<u32, String> {
    match value {
        Value::Number(number) => {
            let id = number
                .as_u64()
                .ok_or_else(|| format!("CAN frame id must be an unsigned integer: {number}"))?;
            u32::try_from(id).map_err(|_| format!("CAN frame id out of u32 range: {id}"))
        }
        Value::String(text) => {
            let text = text.trim();
            if text.is_empty() {
                return Err("CAN frame id cannot be empty".to_owned());
            }
            if let Some(hex) = text
                .strip_prefix("0x")
                .or_else(|| text.strip_prefix("0X"))
            {
                u32::from_str_radix(hex, 16)
                    .map_err(|_| format!("invalid hexadecimal CAN frame id: {text}"))
            } else {
                text.parse::<u32>()
                    .map_err(|_| format!("invalid decimal CAN frame id: {text}"))
            }
        }
        other => Err(format!(
            "CAN frame id must be a number or string, got {other}"
        )),
    }
}

fn parse_can_profile(contents: &str) -> Result<ConfigurableCanAdapter, String> {
    let root: Value =
        serde_json::from_str(contents).map_err(|error| format!("invalid CAN profile JSON: {error}"))?;
    let frames = root
        .get("frames")
        .and_then(Value::as_array)
        .ok_or_else(|| "CAN profile must contain a `frames` array".to_owned())?;

    let mut mappings = Vec::with_capacity(frames.len());
    for (index, frame) in frames.iter().enumerate() {
        let object = frame
            .as_object()
            .ok_or_else(|| format!("CAN profile frame #{index} must be an object"))?;
        let id = object
            .get("id")
            .ok_or_else(|| format!("CAN profile frame #{index} is missing `id`"))
            .and_then(parse_can_frame_id)?;
        let signal_name = object
            .get("signal")
            .and_then(Value::as_str)
            .ok_or_else(|| format!("CAN profile frame #{index} is missing string `signal`"))?;
        let signal = CanSignal::from_profile_name(signal_name).ok_or_else(|| {
            format!("unsupported CAN signal `{signal_name}` in frame #{index}")
        })?;
        mappings.push((id, signal));
    }

    ConfigurableCanAdapter::new(mappings)
        .map_err(|error| format!("invalid CAN profile mapping: {error:?}"))
}

fn configured_can_adapter(profile: Option<&Path>) -> Result<(ConfigurableCanAdapter, String), String> {
    match profile {
        Some(path) => {
            let contents = std::fs::read_to_string(path)
                .map_err(|error| format!("cannot read CAN profile `{}`: {error}", path.display()))?;
            let adapter = parse_can_profile(&contents)?;
            Ok((adapter, path.display().to_string()))
        }
        None => Ok((ConfigurableCanAdapter::demo(), "builtin-demo".to_owned())),
    }
}

#[cfg(target_os = "linux")]
fn start_socketcan(
    config: &SocketCanConfig,
    runtime: SharedRuntime,
    hub: SharedHub,
) -> Result<(), Box<dyn std::error::Error>> {
    use socketcan::{
        source_error_requires_reconnect, ReconnectingVehicleSource, SocketCanSource,
    };

    let interface = config.interface.clone();
    let retry_delay = config.retry_delay;
    let (adapter, profile) = configured_can_adapter(config.profile.as_deref()).map_err(|error| {
        std::io::Error::new(std::io::ErrorKind::InvalidInput, error)
    })?;
    let interface_for_open = interface.clone();
    let mut source = ReconnectingVehicleSource::new(move || {
        SocketCanSource::open(&interface_for_open)
    });

    println!(
        "RADOME telemetry source: SocketCAN ({interface}), profile={profile}, retry={}ms",
        retry_delay.as_millis()
    );

    tokio::task::spawn_blocking(move || loop {
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
    });
    Ok(())
}

#[cfg(not(target_os = "linux"))]
fn start_socketcan(
    _config: &SocketCanConfig,
    _runtime: SharedRuntime,
    _hub: SharedHub,
) -> Result<(), Box<dyn std::error::Error>> {
    Err("SocketCAN telemetry is only available on Linux".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_profile_accepts_decimal_and_hexadecimal_ids() {
        let adapter = parse_can_profile(
            r#"{
                "frames": [
                    {"id": "0x321", "signal": "speed_kmh_u16_be"},
                    {"id": 1110, "signal": "engine_rpm_u16_be"}
                ]
            }"#,
        )
        .unwrap();

        assert_eq!(adapter.signal_for(0x321), Some(CanSignal::SpeedKmhU16Be));
        assert_eq!(
            adapter.signal_for(1110),
            Some(CanSignal::EngineRpmU16Be)
        );
    }

    #[test]
    fn can_profile_rejects_unknown_signals_and_duplicate_ids() {
        assert!(parse_can_profile(
            r#"{"frames":[{"id":"0x100","signal":"flux_capacitor"}]}"#
        )
        .unwrap_err()
        .contains("unsupported CAN signal"));

        assert!(parse_can_profile(
            r#"{
                "frames": [
                    {"id": "0x100", "signal": "speed_kmh_u16_be"},
                    {"id": 256, "signal": "engine_rpm_u16_be"}
                ]
            }"#,
        )
        .unwrap_err()
        .contains("DuplicateFrame"));
    }
}
