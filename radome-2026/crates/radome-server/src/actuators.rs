use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, PartialEq)]
pub enum ActuatorError {
    Rejected(&'static str),
}

pub trait ClimateActuator: Send + Sync {
    fn set_temperature(&self, temperature_c: f64) -> Result<(), ActuatorError>;
}

pub type SharedClimateActuator = Arc<dyn ClimateActuator>;

#[derive(Debug, Default)]
pub struct DemoClimateActuator {
    last_temperature_c: Mutex<Option<f64>>,
}

impl DemoClimateActuator {
    pub fn new() -> Self { Self::default() }
    #[cfg(test)]
    pub fn last_temperature_c(&self) -> Option<f64> { *self.last_temperature_c.lock().expect("demo climate actuator mutex poisoned") }
}

impl ClimateActuator for DemoClimateActuator {
    fn set_temperature(&self, temperature_c: f64) -> Result<(), ActuatorError> {
        *self.last_temperature_c.lock().expect("demo climate actuator mutex poisoned") = Some(temperature_c);
        Ok(())
    }
}

pub trait MediaActuator: Send + Sync {
    fn toggle_playback(&self) -> Result<(), ActuatorError>;
    fn next_track(&self) -> Result<(), ActuatorError>;
}

pub type SharedMediaActuator = Arc<dyn MediaActuator>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DemoMediaAction { TogglePlayback, NextTrack }

#[derive(Debug, Default)]
pub struct DemoMediaActuator { last_action: Mutex<Option<DemoMediaAction>> }
impl DemoMediaActuator {
    pub fn new() -> Self { Self::default() }
    #[cfg(test)]
    pub fn last_action(&self) -> Option<DemoMediaAction> { *self.last_action.lock().expect("demo media actuator mutex poisoned") }
}
impl MediaActuator for DemoMediaActuator {
    fn toggle_playback(&self) -> Result<(), ActuatorError> { *self.last_action.lock().expect("demo media actuator mutex poisoned") = Some(DemoMediaAction::TogglePlayback); Ok(()) }
    fn next_track(&self) -> Result<(), ActuatorError> { *self.last_action.lock().expect("demo media actuator mutex poisoned") = Some(DemoMediaAction::NextTrack); Ok(()) }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn demo_climate_actuator_records_the_requested_temperature() { let actuator=DemoClimateActuator::new(); actuator.set_temperature(21.5).unwrap(); assert_eq!(actuator.last_temperature_c(),Some(21.5)); }
    #[test]
    fn demo_media_actuator_records_commands() { let actuator=DemoMediaActuator::new(); actuator.toggle_playback().unwrap(); assert_eq!(actuator.last_action(),Some(DemoMediaAction::TogglePlayback)); actuator.next_track().unwrap(); assert_eq!(actuator.last_action(),Some(DemoMediaAction::NextTrack)); }
}