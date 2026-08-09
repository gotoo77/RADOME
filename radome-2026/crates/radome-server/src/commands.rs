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
pub enum CommandAction {
    None(Value),
    SetClimateTemperature { temperature_c: f64 },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CommandError {
    InvalidPayload(&'static str),
}

impl CommandError {
    pub fn code(&self) -> &'static str { "invalid_payload" }
    pub fn detail(&self) -> &'static str { match self { Self::InvalidPayload(detail) => detail } }
}

impl CommandDefinition {
    pub fn prepare(&self, data: &Value) -> Result<CommandAction, CommandError> {
        match self.kind {
            CommandKind::TogglePlayback => Ok(CommandAction::None(json!("toggle"))),
            CommandKind::NextTrack => Ok(CommandAction::None(json!("next"))),
            CommandKind::SetClimateTemperature => {
                let Some(temperature_c) = data.get("temperature_c").and_then(Value::as_f64) else {
                    return Err(CommandError::InvalidPayload("temperature_c_required"));
                };
                if !temperature_c.is_finite() || !(16.0..=30.0).contains(&temperature_c) {
                    return Err(CommandError::InvalidPayload("temperature_c_out_of_range"));
                }
                Ok(CommandAction::SetClimateTemperature { temperature_c })
            }
        }
    }

    pub fn event_data(&self, action: &CommandAction) -> Value {
        match action {
            CommandAction::None(data) => data.clone(),
            CommandAction::SetClimateTemperature { temperature_c } => json!({"temperature_c":temperature_c}),
        }
    }
}

pub fn find(name: &str) -> Option<CommandDefinition> {
    match name {
        "media.toggle_playback" => Some(CommandDefinition { name:"media.toggle_playback", required_capability:Capability::new("media.control"), event_name:"media.playback_toggled", kind:CommandKind::TogglePlayback }),
        "media.next_track" => Some(CommandDefinition { name:"media.next_track", required_capability:Capability::new("media.control"), event_name:"media.next_track_requested", kind:CommandKind::NextTrack }),
        "climate.set_temperature" => Some(CommandDefinition { name:"climate.set_temperature", required_capability:Capability::new("climate.control"), event_name:"climate.temperature_changed", kind:CommandKind::SetClimateTemperature }),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn climate_temperature_prepares_a_typed_action() {
        let command = find("climate.set_temperature").unwrap();
        let action = command.prepare(&json!({"temperature_c":21.5})).unwrap();
        assert_eq!(action, CommandAction::SetClimateTemperature { temperature_c:21.5 });
        assert_eq!(command.event_data(&action), json!({"temperature_c":21.5}));
    }

    #[test]
    fn climate_temperature_rejects_invalid_payloads_before_actuation() {
        let command = find("climate.set_temperature").unwrap();
        assert_eq!(command.prepare(&Value::Null), Err(CommandError::InvalidPayload("temperature_c_required")));
        assert_eq!(command.prepare(&json!({"temperature_c":30.1})), Err(CommandError::InvalidPayload("temperature_c_out_of_range")));
    }

    #[test]
    fn media_commands_prepare_without_hardware_action() {
        let toggle = find("media.toggle_playback").unwrap();
        assert_eq!(toggle.prepare(&Value::Null).unwrap(), CommandAction::None(json!("toggle")));
    }

    #[test]
    fn unknown_command_is_not_registered() {
        assert!(find("vehicle.launch_missiles").is_none());
    }
}
