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
    pub fn new() -> Self {
        Self::default()
    }

    #[cfg(test)]
    pub fn last_temperature_c(&self) -> Option<f64> {
        *self.last_temperature_c.lock().expect("demo climate actuator mutex poisoned")
    }
}

impl ClimateActuator for DemoClimateActuator {
    fn set_temperature(&self, temperature_c: f64) -> Result<(), ActuatorError> {
        *self.last_temperature_c.lock().expect("demo climate actuator mutex poisoned") = Some(temperature_c);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn demo_climate_actuator_records_the_requested_temperature() {
        let actuator = DemoClimateActuator::new();
        actuator.set_temperature(21.5).unwrap();
        assert_eq!(actuator.last_temperature_c(), Some(21.5));
    }
}
