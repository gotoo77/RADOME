use crate::actuators::SharedClimateActuator;
use crate::commands::{self, CommandAction};
use radome_core::Capability;
use serde_json::Value;

#[derive(Debug, Clone, PartialEq)]
pub struct CommandSuccess {
    pub event_name: &'static str,
    pub event_data: Value,
}

#[derive(Debug, Clone, PartialEq)]
pub enum CommandExecutionError {
    UnsupportedCommand,
    CapabilityDenied,
    InvalidPayload { code: &'static str, detail: &'static str },
    ActuatorRejected,
}

pub struct CommandExecutor {
    climate_actuator: SharedClimateActuator,
}

impl CommandExecutor {
    pub fn new(climate_actuator: SharedClimateActuator) -> Self {
        Self { climate_actuator }
    }

    pub fn execute(
        &self,
        command_name: &str,
        data: &Value,
        has_capability: impl FnOnce(&Capability) -> bool,
    ) -> Result<CommandSuccess, CommandExecutionError> {
        let definition = commands::find(command_name)
            .ok_or(CommandExecutionError::UnsupportedCommand)?;

        if !has_capability(&definition.required_capability) {
            return Err(CommandExecutionError::CapabilityDenied);
        }

        let action = definition.prepare(data).map_err(|error| {
            CommandExecutionError::InvalidPayload {
                code: error.code(),
                detail: error.detail(),
            }
        })?;

        self.apply(&action)?;

        Ok(CommandSuccess {
            event_name: definition.event_name,
            event_data: definition.event_data(&action),
        })
    }

    fn apply(&self, action: &CommandAction) -> Result<(), CommandExecutionError> {
        match action {
            CommandAction::None(_) => Ok(()),
            CommandAction::SetClimateTemperature { temperature_c } => self
                .climate_actuator
                .set_temperature(*temperature_c)
                .map_err(|_| CommandExecutionError::ActuatorRejected),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::actuators::{ActuatorError, ClimateActuator, DemoClimateActuator};
    use serde_json::json;
    use std::sync::Arc;

    #[derive(Debug)]
    struct RejectingClimateActuator;

    impl ClimateActuator for RejectingClimateActuator {
        fn set_temperature(&self, _temperature_c: f64) -> Result<(), ActuatorError> {
            Err(ActuatorError::Rejected("test_rejection"))
        }
    }

    #[test]
    fn climate_command_is_validated_actuated_and_converted_to_event() {
        let actuator = Arc::new(DemoClimateActuator::new());
        let executor = CommandExecutor::new(actuator.clone());

        let success = executor
            .execute(
                "climate.set_temperature",
                &json!({"temperature_c":21.5}),
                |capability| capability == &Capability::new("climate.control"),
            )
            .unwrap();

        assert_eq!(actuator.last_temperature_c(), Some(21.5));
        assert_eq!(success.event_name, "climate.temperature_changed");
        assert_eq!(success.event_data, json!({"temperature_c":21.5}));
    }

    #[test]
    fn actuator_rejection_does_not_produce_a_success() {
        let executor = CommandExecutor::new(Arc::new(RejectingClimateActuator));
        let result = executor.execute(
            "climate.set_temperature",
            &json!({"temperature_c":21.5}),
            |_| true,
        );
        assert_eq!(result, Err(CommandExecutionError::ActuatorRejected));
    }

    #[test]
    fn capability_is_checked_before_command_execution() {
        let executor = CommandExecutor::new(Arc::new(DemoClimateActuator::new()));
        let result = executor.execute("climate.set_temperature", &json!({"temperature_c":21.5}), |_| false);
        assert_eq!(result, Err(CommandExecutionError::CapabilityDenied));
    }

    #[test]
    fn invalid_payload_is_reported_as_a_typed_execution_error() {
        let executor = CommandExecutor::new(Arc::new(DemoClimateActuator::new()));
        let result = executor.execute("climate.set_temperature", &json!({"temperature_c":"chaud"}), |_| true);
        assert_eq!(
            result,
            Err(CommandExecutionError::InvalidPayload {
                code: "invalid_payload",
                detail: "temperature_c_required",
            })
        );
    }
}