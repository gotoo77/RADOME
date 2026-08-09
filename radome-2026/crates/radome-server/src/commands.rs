use radome_core::Capability;
use serde_json::{json, Value};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CommandKind {
    TogglePlayback,
    NextTrack,
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

impl CommandDefinition {
    pub fn execute(&self, _data: &Value) -> CommandExecution {
        let event_data = match self.kind {
            CommandKind::TogglePlayback => json!("toggle"),
            CommandKind::NextTrack => json!("next"),
        };
        CommandExecution { event_name: self.event_name, event_data }
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
    fn next_track_uses_the_same_router_with_a_distinct_execution() {
        let command = find("media.next_track").expect("registered command");
        assert_eq!(command.required_capability, Capability::new("media.control"));
        let execution = command.execute(&Value::Null);
        assert_eq!(execution.event_name, "media.next_track_requested");
        assert_eq!(execution.event_data, "next");
    }

    #[test]
    fn unknown_command_is_not_registered() {
        assert!(find("vehicle.launch_missiles").is_none());
    }
}
