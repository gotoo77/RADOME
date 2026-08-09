use radome_core::Capability;
use serde_json::{json, Value};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommandDefinition {
    pub name: &'static str,
    pub required_capability: Capability,
    pub event_name: &'static str,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CommandExecution {
    pub event_name: &'static str,
    pub event_data: Value,
}

impl CommandDefinition {
    pub fn execute(&self, _data: &Value) -> CommandExecution {
        CommandExecution {
            event_name: self.event_name,
            event_data: json!("toggle"),
        }
    }
}

pub fn find(name: &str) -> Option<CommandDefinition> {
    match name {
        "media.toggle_playback" => Some(CommandDefinition {
            name: "media.toggle_playback",
            required_capability: Capability::new("media.control"),
            event_name: "media.playback_toggled",
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
        assert_eq!(command.name, "media.toggle_playback");
        assert_eq!(command.required_capability, Capability::new("media.control"));
        let execution = command.execute(&Value::Null);
        assert_eq!(execution.event_name, "media.playback_toggled");
        assert_eq!(execution.event_data, "toggle");
    }

    #[test]
    fn unknown_command_is_not_registered() {
        assert!(find("vehicle.launch_missiles").is_none());
    }
}
