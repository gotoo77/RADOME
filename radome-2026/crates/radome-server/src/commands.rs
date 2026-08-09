use radome_core::Capability;
use serde_json::{json, Value};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CommandKind {
    TogglePlayback,
    NextTrack,
    SetClimateTemperature,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommandDefinition {
    pub name: &'static str,
    pub required_capability: Capability,
    pub event_name: &'static str,
    kind: CommandKind,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CommandExecution {
    pub event_name: &'static str,
    pub event_data: Value,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CommandError {
    InvalidPayload(&'static str),
}

impl CommandError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::InvalidPayload(_) => "invalid_payload",
        }
    }

    pub fn detail(&self) -> &'static str {
        match self {
            Self::InvalidPayload(detail) => detail,
        }
    }
}

impl CommandDefinition {
    pub fn execute(&self, data: &Value) -> Result<CommandExecution, CommandError> {
        let event_data = match self.kind {
            CommandKind::TogglePlayback => json!("toggle"),
            CommandKind::NextTrack => json!("next"),
            CommandKind::SetClimateTemperature => {
                let Some(temperature_c) = data.get("temperature_c").and_then(Value::as_f64) else {
                    return Err(CommandError::InvalidPayload("temperature_c_required"));
                };
                if !temperature_c.is_finite() || !(16.0..=30.0).contains(&temperature_c) {
                    return Err(CommandError::InvalidPayload("temperature_c_out_of_range"));
                }
                json!({ "temperature_c": temperature_c })
            }
        };
        Ok(CommandExecution { event_name: self.event_name, event_data })
    }
}

pub fn find(name: &str) -> Option<CommandDefinition> {
    match name {
        "media.toggle_playback" => Some(CommandDefinition {
            name: "media.toggle_playback",
            required_capability: Capability::new("media.control"),
            event_name: "media.playback_toggled",
            kind: CommandKind::TogglePlayback,
        }),
        "media.next_track" => Some(CommandDefinition {
            name: "media.next_track",
            required_capability: Capability::new("media.control"),
            event_name: "media.next_track_requested",
            kind: CommandKind::NextTrack,
        }),
        "climate.set_temperature" => Some(CommandDefinition {
            name: "climate.set_temperature",
            required_capability: Capability::new("climate.control"),
            event_name: "climate.temperature_changed",
            kind: CommandKind::SetClimateTemperature,
        }),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn media_toggle_declares_its_contract() {
        let command = find("media.toggle_playback").expect("registered command");
        assert_eq!(command.required_capability, Capability::new("media.control"));
        let execution = command.execute(&Value::Null).unwrap();
        assert_eq!(execution.event_name, "media.playback_toggled");
        assert_eq!(execution.event_data, "toggle");
    }

    #[test]
    fn climate_temperature_accepts_a_valid_typed_payload() {
        let command = find("climate.set_temperature").expect("registered command");
        assert_eq!(command.required_capability, Capability::new("climate.control"));
        let execution = command.execute(&json!({"temperature_c": 21.5})).unwrap();
        assert_eq!(execution.event_name, "climate.temperature_changed");
        assert_eq!(execution.event_data, json!({"temperature_c": 21.5}));
    }

    #[test]
    fn climate_temperature_rejects_missing_or_wrong_typed_payload() {
        let command = find("climate.set_temperature").unwrap();
        assert_eq!(command.execute(&Value::Null), Err(CommandError::InvalidPayload("temperature_c_required")));
        assert_eq!(command.execute(&json!({"temperature_c":"chaud"})), Err(CommandError::InvalidPayload("temperature_c_required")));
    }

    #[test]
    fn climate_temperature_rejects_values_outside_the_contract() {
        let command = find("climate.set_temperature").unwrap();
        assert_eq!(command.execute(&json!({"temperature_c": 15.9})), Err(CommandError::InvalidPayload("temperature_c_out_of_range")));
        assert_eq!(command.execute(&json!({"temperature_c": 30.1})), Err(CommandError::InvalidPayload("temperature_c_out_of_range")));
    }

    #[test]
    fn unknown_command_is_not_registered() {
        assert!(find("vehicle.launch_missiles").is_none());
    }
}
