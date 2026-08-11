use crate::actuators::{SharedClimateActuator, SharedMediaActuator};
use crate::commands::{self, CommandAction};
use radome_core::Capability;
use serde_json::Value;

#[derive(Debug, Clone, PartialEq)]
pub struct CommandSuccess { pub event_name: &'static str, pub event_data: Value }
#[derive(Debug, Clone, PartialEq)]
pub enum CommandExecutionError { UnsupportedCommand, CapabilityDenied, InvalidPayload { code: &'static str, detail: &'static str }, ActuatorRejected }

pub struct CommandExecutor { climate_actuator: SharedClimateActuator, media_actuator: SharedMediaActuator }
impl CommandExecutor {
    pub fn new(climate_actuator: SharedClimateActuator, media_actuator: SharedMediaActuator) -> Self { Self { climate_actuator, media_actuator } }
    pub fn execute(&self, command_name:&str, data:&Value, has_capability:impl FnOnce(&Capability)->bool)->Result<CommandSuccess,CommandExecutionError>{
        let definition=commands::find(command_name).ok_or(CommandExecutionError::UnsupportedCommand)?;
        if !has_capability(&definition.required_capability){return Err(CommandExecutionError::CapabilityDenied);}
        let action=definition.prepare(data).map_err(|error|CommandExecutionError::InvalidPayload{code:error.code(),detail:error.detail()})?;
        self.apply(&action)?;
        Ok(CommandSuccess{event_name:definition.event_name,event_data:definition.event_data(&action)})
    }
    fn apply(&self,action:&CommandAction)->Result<(),CommandExecutionError>{
        let result=match action{
            CommandAction::TogglePlayback=>self.media_actuator.toggle_playback(),
            CommandAction::NextTrack=>self.media_actuator.next_track(),
            CommandAction::SetClimateTemperature{temperature_c}=>self.climate_actuator.set_temperature(*temperature_c),
        };
        result.map_err(|_|CommandExecutionError::ActuatorRejected)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::actuators::{ActuatorError,ClimateActuator,DemoClimateActuator,DemoMediaAction,DemoMediaActuator};
    use serde_json::json;
    use std::sync::Arc;
    #[derive(Debug)] struct RejectingClimateActuator;
    impl ClimateActuator for RejectingClimateActuator{fn set_temperature(&self,_:f64)->Result<(),ActuatorError>{Err(ActuatorError::Rejected("test_rejection"))}}
    fn media()->Arc<DemoMediaActuator>{Arc::new(DemoMediaActuator::new())}
    #[test] fn climate_command_is_validated_actuated_and_converted_to_event(){let climate=Arc::new(DemoClimateActuator::new());let executor=CommandExecutor::new(climate.clone(),media());let success=executor.execute("climate.set_temperature",&json!({"temperature_c":21.5}),|cap|cap==&Capability::new("climate.control")).unwrap();assert_eq!(climate.last_temperature_c(),Some(21.5));assert_eq!(success.event_name,"climate.temperature_changed");}
    #[test] fn media_commands_are_actuated(){let media=media();let executor=CommandExecutor::new(Arc::new(DemoClimateActuator::new()),media.clone());let toggle=executor.execute("media.toggle_playback",&Value::Null,|cap|cap==&Capability::new("media.control")).unwrap();assert_eq!(media.last_action(),Some(DemoMediaAction::TogglePlayback));assert_eq!(toggle.event_name,"media.playback_toggled");executor.execute("media.next_track",&Value::Null,|_|true).unwrap();assert_eq!(media.last_action(),Some(DemoMediaAction::NextTrack));}
    #[test] fn actuator_rejection_does_not_produce_a_success(){let executor=CommandExecutor::new(Arc::new(RejectingClimateActuator),media());let result=executor.execute("climate.set_temperature",&json!({"temperature_c":21.5}),|_|true);assert_eq!(result,Err(CommandExecutionError::ActuatorRejected));}
    #[test] fn capability_is_checked_before_command_execution(){let executor=CommandExecutor::new(Arc::new(DemoClimateActuator::new()),media());let result=executor.execute("climate.set_temperature",&json!({"temperature_c":21.5}),|_|false);assert_eq!(result,Err(CommandExecutionError::CapabilityDenied));}
    #[test] fn invalid_payload_is_reported_as_a_typed_execution_error(){let executor=CommandExecutor::new(Arc::new(DemoClimateActuator::new()),media());let result=executor.execute("climate.set_temperature",&json!({"temperature_c":"chaud"}),|_|true);assert_eq!(result,Err(CommandExecutionError::InvalidPayload{code:"invalid_payload",detail:"temperature_c_required"}));}
}