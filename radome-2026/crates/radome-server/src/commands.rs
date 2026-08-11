use radome_core::Capability;
use serde_json::{json, Value};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CommandKind {
    Play,
    Pause,
    TogglePlayback,
    NextTrack,
    PreviousTrack,
    VolumeUp,
    VolumeDown,
    SetVolume,
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
    Play,
    Pause,
    TogglePlayback,
    NextTrack,
    PreviousTrack,
    VolumeUp,
    VolumeDown,
    SetVolume { volume: u8 },
    SetClimateTemperature { temperature_c: f64 },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CommandError { InvalidPayload(&'static str) }
impl CommandError {
    pub fn code(&self) -> &'static str { "invalid_payload" }
    pub fn detail(&self) -> &'static str { match self { Self::InvalidPayload(detail) => detail } }
}

impl CommandDefinition {
    pub fn prepare(&self, data: &Value) -> Result<CommandAction, CommandError> {
        match self.kind {
            CommandKind::Play => Ok(CommandAction::Play),
            CommandKind::Pause => Ok(CommandAction::Pause),
            CommandKind::TogglePlayback => Ok(CommandAction::TogglePlayback),
            CommandKind::NextTrack => Ok(CommandAction::NextTrack),
            CommandKind::PreviousTrack => Ok(CommandAction::PreviousTrack),
            CommandKind::VolumeUp => Ok(CommandAction::VolumeUp),
            CommandKind::VolumeDown => Ok(CommandAction::VolumeDown),
            CommandKind::SetVolume => {
                let Some(volume) = data.get("volume").and_then(Value::as_u64) else { return Err(CommandError::InvalidPayload("volume_required")); };
                if volume > 100 { return Err(CommandError::InvalidPayload("volume_out_of_range")); }
                Ok(CommandAction::SetVolume { volume: volume as u8 })
            }
            CommandKind::SetClimateTemperature => {
                let Some(temperature_c) = data.get("temperature_c").and_then(Value::as_f64) else { return Err(CommandError::InvalidPayload("temperature_c_required")); };
                if !temperature_c.is_finite() || !(16.0..=30.0).contains(&temperature_c) { return Err(CommandError::InvalidPayload("temperature_c_out_of_range")); }
                Ok(CommandAction::SetClimateTemperature { temperature_c })
            }
        }
    }

    pub fn event_data(&self, action: &CommandAction) -> Value {
        match action {
            CommandAction::Play => json!({"state":"playing"}),
            CommandAction::Pause => json!({"state":"paused"}),
            CommandAction::TogglePlayback => json!({"action":"toggle"}),
            CommandAction::NextTrack => json!({"direction":"next"}),
            CommandAction::PreviousTrack => json!({"direction":"previous"}),
            CommandAction::VolumeUp => json!({"direction":"up"}),
            CommandAction::VolumeDown => json!({"direction":"down"}),
            CommandAction::SetVolume { volume } => json!({"volume":volume}),
            CommandAction::SetClimateTemperature { temperature_c } => json!({"temperature_c":temperature_c}),
        }
    }
}

fn media(name: &'static str, event_name: &'static str, kind: CommandKind) -> CommandDefinition {
    CommandDefinition { name, required_capability: Capability::new("media.control"), event_name, kind }
}

pub fn find(name: &str) -> Option<CommandDefinition> {
    match name {
        "media.play" => Some(media("media.play", "media.playback_started", CommandKind::Play)),
        "media.pause" => Some(media("media.pause", "media.playback_paused", CommandKind::Pause)),
        "media.toggle_playback" => Some(media("media.toggle_playback", "media.playback_toggled", CommandKind::TogglePlayback)),
        "media.next_track" => Some(media("media.next_track", "media.next_track_requested", CommandKind::NextTrack)),
        "media.previous_track" => Some(media("media.previous_track", "media.previous_track_requested", CommandKind::PreviousTrack)),
        "media.volume_up" => Some(media("media.volume_up", "media.volume_up_requested", CommandKind::VolumeUp)),
        "media.volume_down" => Some(media("media.volume_down", "media.volume_down_requested", CommandKind::VolumeDown)),
        "media.set_volume" => Some(media("media.set_volume", "media.volume_changed", CommandKind::SetVolume)),
        "climate.set_temperature" => Some(CommandDefinition { name: "climate.set_temperature", required_capability: Capability::new("climate.control"), event_name: "climate.temperature_changed", kind: CommandKind::SetClimateTemperature }),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn media_player_exposes_a_complete_command_surface() {
        let cases = [
            ("media.play", CommandAction::Play),
            ("media.pause", CommandAction::Pause),
            ("media.toggle_playback", CommandAction::TogglePlayback),
            ("media.next_track", CommandAction::NextTrack),
            ("media.previous_track", CommandAction::PreviousTrack),
            ("media.volume_up", CommandAction::VolumeUp),
            ("media.volume_down", CommandAction::VolumeDown),
        ];
        for (name, expected) in cases { assert_eq!(find(name).unwrap().prepare(&Value::Null).unwrap(), expected); }
    }
    #[test]
    fn set_volume_is_typed_and_bounded() {
        let command = find("media.set_volume").unwrap();
        assert_eq!(command.prepare(&json!({"volume":42})).unwrap(), CommandAction::SetVolume { volume:42 });
        assert_eq!(command.prepare(&json!({"volume":101})), Err(CommandError::InvalidPayload("volume_out_of_range")));
        assert_eq!(command.prepare(&Value::Null), Err(CommandError::InvalidPayload("volume_required")));
    }
    #[test]
    fn climate_temperature_is_still_validated() {
        let command=find("climate.set_temperature").unwrap();
        assert_eq!(command.prepare(&json!({"temperature_c":21.5})).unwrap(),CommandAction::SetClimateTemperature{temperature_c:21.5});
        assert_eq!(command.prepare(&json!({"temperature_c":30.1})),Err(CommandError::InvalidPayload("temperature_c_out_of_range")));
    }
    #[test] fn unknown_command_is_not_registered(){assert!(find("vehicle.launch_missiles").is_none());}
}