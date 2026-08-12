use serde::Deserialize;
use std::collections::BTreeMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

const DEFAULT_ADDR: &str = "127.0.0.1:8787";
const DEFAULT_CAN_INTERFACE: &str = "can0";
const DEFAULT_CAN_RETRY_MS: u64 = 1_000;
const DEFAULT_METRICS_INTERVAL_MS: u64 = 30_000;
const DEFAULT_OUTBOUND_QUEUE_CAPACITY: usize = 128;
const DEFAULT_COMMAND_CACHE_CAPACITY: usize = 256;
const DEFAULT_MAX_CAPABILITIES: usize = 32;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TelemetrySource {
    Demo,
    SocketCan,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SocketCanConfig {
    pub interface: String,
    pub retry_delay: Duration,
    pub profile: Option<PathBuf>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TelemetryConfig {
    pub source: TelemetrySource,
    pub socketcan: SocketCanConfig,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ConnectionLimits {
    pub outbound_queue_capacity: usize,
    pub command_cache_capacity: usize,
    pub max_capabilities: usize,
}

impl Default for ConnectionLimits {
    fn default() -> Self {
        Self {
            outbound_queue_capacity: DEFAULT_OUTBOUND_QUEUE_CAPACITY,
            command_cache_capacity: DEFAULT_COMMAND_CACHE_CAPACITY,
            max_capabilities: DEFAULT_MAX_CAPABILITIES,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ServerConfig {
    pub listen_addr: String,
    pub telemetry: TelemetryConfig,
    pub metrics_interval: Duration,
    pub connection_limits: ConnectionLimits,
    pub config_path: Option<PathBuf>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct FileConfig {
    listen_addr: Option<String>,
    telemetry: Option<FileTelemetryConfig>,
    metrics_interval_ms: Option<u64>,
    limits: Option<FileConnectionLimits>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct FileTelemetryConfig {
    source: Option<String>,
    socketcan: Option<FileSocketCanConfig>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct FileSocketCanConfig {
    interface: Option<String>,
    retry_ms: Option<u64>,
    profile: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct FileConnectionLimits {
    outbound_queue_capacity: Option<usize>,
    command_cache_capacity: Option<usize>,
    max_capabilities: Option<usize>,
}

impl ServerConfig {
    pub fn load() -> Result<Self, String> {
        let vars = collect_environment()?;
        let config_path = vars.get("RADOME_CONFIG").map(PathBuf::from);
        let file = match config_path.as_deref() {
            Some(path) => Some(load_file(path)?),
            None => None,
        };
        resolve(file, config_path, &vars)
    }
}

fn collect_environment() -> Result<BTreeMap<String, String>, String> {
    const KEYS: &[&str] = &[
        "RADOME_CONFIG",
        "RADOME_ADDR",
        "RADOME_TELEMETRY_SOURCE",
        "RADOME_CAN_INTERFACE",
        "RADOME_CAN_RETRY_MS",
        "RADOME_CAN_PROFILE",
        "RADOME_METRICS_INTERVAL_MS",
        "RADOME_OUTBOUND_QUEUE_CAPACITY",
        "RADOME_COMMAND_CACHE_CAPACITY",
        "RADOME_MAX_CAPABILITIES",
    ];

    let mut vars = BTreeMap::new();
    for key in KEYS {
        match env::var(key) {
            Ok(value) => {
                vars.insert((*key).to_owned(), value);
            }
            Err(env::VarError::NotPresent) => {}
            Err(env::VarError::NotUnicode(_)) => {
                return Err(format!("{key} is not valid Unicode"));
            }
        }
    }
    Ok(vars)
}

fn load_file(path: &Path) -> Result<FileConfig, String> {
    let contents = fs::read_to_string(path)
        .map_err(|error| format!("cannot read RADOME config `{}`: {error}", path.display()))?;
    serde_json::from_str(&contents)
        .map_err(|error| format!("invalid RADOME config JSON `{}`: {error}", path.display()))
}

fn resolve(
    file: Option<FileConfig>,
    config_path: Option<PathBuf>,
    vars: &BTreeMap<String, String>,
) -> Result<ServerConfig, String> {
    let file = file.unwrap_or_default();
    let telemetry = file.telemetry.unwrap_or_default();
    let socketcan = telemetry.socketcan.unwrap_or_default();
    let limits = file.limits.unwrap_or_default();

    let listen_addr = vars
        .get("RADOME_ADDR")
        .cloned()
        .or(file.listen_addr)
        .unwrap_or_else(|| DEFAULT_ADDR.to_owned());
    if listen_addr.trim().is_empty() {
        return Err("RADOME listen address cannot be empty".to_owned());
    }

    let source_text = vars
        .get("RADOME_TELEMETRY_SOURCE")
        .cloned()
        .or(telemetry.source)
        .unwrap_or_else(|| "demo".to_owned());
    let source = parse_telemetry_source(&source_text)?;

    let interface = vars
        .get("RADOME_CAN_INTERFACE")
        .cloned()
        .or(socketcan.interface)
        .unwrap_or_else(|| DEFAULT_CAN_INTERFACE.to_owned());
    validate_interface(&interface)?;

    let retry_ms = match vars.get("RADOME_CAN_RETRY_MS") {
        Some(value) => value
            .parse::<u64>()
            .map_err(|_| format!("invalid RADOME_CAN_RETRY_MS: {value}"))?,
        None => socketcan.retry_ms.unwrap_or(DEFAULT_CAN_RETRY_MS),
    };
    if retry_ms == 0 {
        return Err("SocketCAN retry_ms must be greater than zero".to_owned());
    }

    let metrics_interval_ms = match vars.get("RADOME_METRICS_INTERVAL_MS") {
        Some(value) => value
            .parse::<u64>()
            .map_err(|_| format!("invalid RADOME_METRICS_INTERVAL_MS: {value}"))?,
        None => file.metrics_interval_ms.unwrap_or(DEFAULT_METRICS_INTERVAL_MS),
    };
    if metrics_interval_ms == 0 {
        return Err("metrics_interval_ms must be greater than zero".to_owned());
    }

    let connection_limits = ConnectionLimits {
        outbound_queue_capacity: resolve_positive_usize(
            vars.get("RADOME_OUTBOUND_QUEUE_CAPACITY"),
            limits.outbound_queue_capacity,
            DEFAULT_OUTBOUND_QUEUE_CAPACITY,
            "RADOME_OUTBOUND_QUEUE_CAPACITY",
        )?,
        command_cache_capacity: resolve_positive_usize(
            vars.get("RADOME_COMMAND_CACHE_CAPACITY"),
            limits.command_cache_capacity,
            DEFAULT_COMMAND_CACHE_CAPACITY,
            "RADOME_COMMAND_CACHE_CAPACITY",
        )?,
        max_capabilities: resolve_positive_usize(
            vars.get("RADOME_MAX_CAPABILITIES"),
            limits.max_capabilities,
            DEFAULT_MAX_CAPABILITIES,
            "RADOME_MAX_CAPABILITIES",
        )?,
    };

    let profile = match vars.get("RADOME_CAN_PROFILE") {
        Some(path) => Some(non_empty_path(path, "RADOME_CAN_PROFILE")?),
        None => match socketcan.profile {
            Some(path) => {
                let path = non_empty_path(&path, "telemetry.socketcan.profile")?;
                Some(resolve_relative_to_config(path, config_path.as_deref()))
            }
            None => None,
        },
    };

    Ok(ServerConfig {
        listen_addr,
        telemetry: TelemetryConfig {
            source,
            socketcan: SocketCanConfig {
                interface,
                retry_delay: Duration::from_millis(retry_ms),
                profile,
            },
        },
        metrics_interval: Duration::from_millis(metrics_interval_ms),
        connection_limits,
        config_path,
    })
}

fn resolve_positive_usize(
    environment: Option<&String>,
    file: Option<usize>,
    default: usize,
    name: &str,
) -> Result<usize, String> {
    let value = match environment {
        Some(value) => value
            .parse::<usize>()
            .map_err(|_| format!("invalid {name}: {value}"))?,
        None => file.unwrap_or(default),
    };
    if value == 0 {
        return Err(format!("{name} must be greater than zero"));
    }
    Ok(value)
}

fn parse_telemetry_source(value: &str) -> Result<TelemetrySource, String> {
    match value {
        "demo" => Ok(TelemetrySource::Demo),
        "socketcan" => Ok(TelemetrySource::SocketCan),
        other => Err(format!("unknown RADOME telemetry source: {other}")),
    }
}

fn validate_interface(interface: &str) -> Result<(), String> {
    if interface.trim().is_empty() {
        return Err("SocketCAN interface cannot be empty".to_owned());
    }
    if interface.as_bytes().contains(&0) {
        return Err("SocketCAN interface contains an invalid NUL byte".to_owned());
    }
    Ok(())
}

fn non_empty_path(value: &str, field: &str) -> Result<PathBuf, String> {
    if value.trim().is_empty() {
        return Err(format!("{field} cannot be empty"));
    }
    Ok(PathBuf::from(value))
}

fn resolve_relative_to_config(path: PathBuf, config_path: Option<&Path>) -> PathBuf {
    if path.is_absolute() {
        return path;
    }
    match config_path.and_then(Path::parent) {
        Some(parent) if !parent.as_os_str().is_empty() => parent.join(path),
        _ => path,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn vars(values: &[(&str, &str)]) -> BTreeMap<String, String> {
        values
            .iter()
            .map(|(key, value)| ((*key).to_owned(), (*value).to_owned()))
            .collect()
    }

    fn parse_file(json: &str) -> FileConfig {
        serde_json::from_str(json).unwrap()
    }

    #[test]
    fn defaults_preserve_the_current_server_behaviour() {
        let config = resolve(None, None, &BTreeMap::new()).unwrap();
        assert_eq!(config.listen_addr, "127.0.0.1:8787");
        assert_eq!(config.telemetry.source, TelemetrySource::Demo);
        assert_eq!(config.telemetry.socketcan.interface, "can0");
        assert_eq!(config.telemetry.socketcan.retry_delay, Duration::from_secs(1));
        assert_eq!(config.telemetry.socketcan.profile, None);
        assert_eq!(config.metrics_interval, Duration::from_secs(30));
        assert_eq!(config.connection_limits, ConnectionLimits::default());
    }

    #[test]
    fn file_configures_socketcan_limits_and_resolves_profile_relative_to_itself() {
        let file = parse_file(
            r#"{
                "listen_addr": "0.0.0.0:9000",
                "metrics_interval_ms": 2500,
                "limits": {
                    "outbound_queue_capacity": 64,
                    "command_cache_capacity": 120,
                    "max_capabilities": 8
                },
                "telemetry": {
                    "source": "socketcan",
                    "socketcan": {
                        "interface": "vcan0",
                        "retry_ms": 250,
                        "profile": "can-profile.json"
                    }
                }
            }"#,
        );
        let config = resolve(
            Some(file),
            Some(PathBuf::from("/etc/radome/server.json")),
            &BTreeMap::new(),
        )
        .unwrap();

        assert_eq!(config.listen_addr, "0.0.0.0:9000");
        assert_eq!(config.telemetry.source, TelemetrySource::SocketCan);
        assert_eq!(config.telemetry.socketcan.interface, "vcan0");
        assert_eq!(config.telemetry.socketcan.retry_delay, Duration::from_millis(250));
        assert_eq!(config.metrics_interval, Duration::from_millis(2500));
        assert_eq!(
            config.connection_limits,
            ConnectionLimits {
                outbound_queue_capacity: 64,
                command_cache_capacity: 120,
                max_capabilities: 8,
            }
        );
        assert_eq!(
            config.telemetry.socketcan.profile,
            Some(PathBuf::from("/etc/radome/can-profile.json"))
        );
    }

    #[test]
    fn environment_overrides_the_external_file_for_backward_compatibility() {
        let file = parse_file(
            r#"{
                "listen_addr": "0.0.0.0:9000",
                "metrics_interval_ms": 5000,
                "limits": {
                    "outbound_queue_capacity": 64,
                    "command_cache_capacity": 120,
                    "max_capabilities": 8
                },
                "telemetry": {
                    "source": "socketcan",
                    "socketcan": {"interface": "can0", "retry_ms": 5000}
                }
            }"#,
        );
        let config = resolve(
            Some(file),
            Some(PathBuf::from("config/server.json")),
            &vars(&[
                ("RADOME_ADDR", "127.0.0.1:9999"),
                ("RADOME_TELEMETRY_SOURCE", "demo"),
                ("RADOME_CAN_INTERFACE", "vcan42"),
                ("RADOME_CAN_RETRY_MS", "25"),
                ("RADOME_CAN_PROFILE", "override.json"),
                ("RADOME_METRICS_INTERVAL_MS", "75"),
                ("RADOME_OUTBOUND_QUEUE_CAPACITY", "16"),
                ("RADOME_COMMAND_CACHE_CAPACITY", "24"),
                ("RADOME_MAX_CAPABILITIES", "4"),
            ]),
        )
        .unwrap();

        assert_eq!(config.listen_addr, "127.0.0.1:9999");
        assert_eq!(config.telemetry.source, TelemetrySource::Demo);
        assert_eq!(config.telemetry.socketcan.interface, "vcan42");
        assert_eq!(config.telemetry.socketcan.retry_delay, Duration::from_millis(25));
        assert_eq!(config.metrics_interval, Duration::from_millis(75));
        assert_eq!(
            config.connection_limits,
            ConnectionLimits {
                outbound_queue_capacity: 16,
                command_cache_capacity: 24,
                max_capabilities: 4,
            }
        );
        assert_eq!(
            config.telemetry.socketcan.profile,
            Some(PathBuf::from("override.json"))
        );
    }

    #[test]
    fn invalid_values_fail_before_the_server_starts() {
        assert!(resolve(
            Some(parse_file(r#"{"telemetry":{"source":"magic"}}"#)),
            None,
            &BTreeMap::new(),
        )
        .unwrap_err()
        .contains("unknown RADOME telemetry source"));

        assert!(resolve(
            Some(parse_file(r#"{"telemetry":{"socketcan":{"retry_ms":0}}}"#)),
            None,
            &BTreeMap::new(),
        )
        .unwrap_err()
        .contains("greater than zero"));

        assert!(resolve(
            Some(parse_file(r#"{"metrics_interval_ms":0}"#)),
            None,
            &BTreeMap::new(),
        )
        .unwrap_err()
        .contains("metrics_interval_ms"));

        for field in [
            "outbound_queue_capacity",
            "command_cache_capacity",
            "max_capabilities",
        ] {
            let json = format!(r#"{{"limits":{{"{field}":0}}}}"#);
            assert!(resolve(Some(parse_file(&json)), None, &BTreeMap::new())
                .unwrap_err()
                .contains("must be greater than zero"));
        }

        assert!(serde_json::from_str::<FileConfig>(r#"{"surprise":true}"#).is_err());
    }
}