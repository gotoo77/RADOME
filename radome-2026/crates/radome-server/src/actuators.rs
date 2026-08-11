use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, PartialEq)]
pub enum ActuatorError { Rejected(&'static str) }

pub trait ClimateActuator: Send + Sync { fn set_temperature(&self, temperature_c:f64)->Result<(),ActuatorError>; }
pub type SharedClimateActuator=Arc<dyn ClimateActuator>;
#[derive(Debug,Default)]pub struct DemoClimateActuator{last_temperature_c:Mutex<Option<f64>>}
impl DemoClimateActuator{pub fn new()->Self{Self::default()}#[cfg(test)]pub fn last_temperature_c(&self)->Option<f64>{*self.last_temperature_c.lock().expect("demo climate actuator mutex poisoned")}}
impl ClimateActuator for DemoClimateActuator{fn set_temperature(&self,temperature_c:f64)->Result<(),ActuatorError>{*self.last_temperature_c.lock().expect("demo climate actuator mutex poisoned")=Some(temperature_c);Ok(())}}

pub trait MediaActuator: Send+Sync {
    fn play(&self)->Result<(),ActuatorError>;
    fn pause(&self)->Result<(),ActuatorError>;
    fn toggle_playback(&self)->Result<(),ActuatorError>;
    fn next_track(&self)->Result<(),ActuatorError>;
    fn previous_track(&self)->Result<(),ActuatorError>;
    fn volume_up(&self)->Result<(),ActuatorError>;
    fn volume_down(&self)->Result<(),ActuatorError>;
    fn set_volume(&self,volume:u8)->Result<(),ActuatorError>;
}
pub type SharedMediaActuator=Arc<dyn MediaActuator>;
#[derive(Debug,Clone,Copy,PartialEq,Eq)]pub enum DemoMediaAction{Play,Pause,TogglePlayback,NextTrack,PreviousTrack,VolumeUp,VolumeDown,SetVolume(u8)}
#[derive(Debug,Default)]pub struct DemoMediaActuator{last_action:Mutex<Option<DemoMediaAction>>}
impl DemoMediaActuator{pub fn new()->Self{Self::default()}#[cfg(test)]pub fn last_action(&self)->Option<DemoMediaAction>{*self.last_action.lock().expect("demo media actuator mutex poisoned")}fn record(&self,action:DemoMediaAction)->Result<(),ActuatorError>{*self.last_action.lock().expect("demo media actuator mutex poisoned")=Some(action);Ok(())}}
impl MediaActuator for DemoMediaActuator{
    fn play(&self)->Result<(),ActuatorError>{self.record(DemoMediaAction::Play)}
    fn pause(&self)->Result<(),ActuatorError>{self.record(DemoMediaAction::Pause)}
    fn toggle_playback(&self)->Result<(),ActuatorError>{self.record(DemoMediaAction::TogglePlayback)}
    fn next_track(&self)->Result<(),ActuatorError>{self.record(DemoMediaAction::NextTrack)}
    fn previous_track(&self)->Result<(),ActuatorError>{self.record(DemoMediaAction::PreviousTrack)}
    fn volume_up(&self)->Result<(),ActuatorError>{self.record(DemoMediaAction::VolumeUp)}
    fn volume_down(&self)->Result<(),ActuatorError>{self.record(DemoMediaAction::VolumeDown)}
    fn set_volume(&self,volume:u8)->Result<(),ActuatorError>{self.record(DemoMediaAction::SetVolume(volume))}
}

#[cfg(test)]mod tests{use super::*;
#[test]fn demo_climate_actuator_records_the_requested_temperature(){let actuator=DemoClimateActuator::new();actuator.set_temperature(21.5).unwrap();assert_eq!(actuator.last_temperature_c(),Some(21.5));}
#[test]fn demo_media_actuator_records_player_commands(){let actuator=DemoMediaActuator::new();actuator.play().unwrap();assert_eq!(actuator.last_action(),Some(DemoMediaAction::Play));actuator.previous_track().unwrap();assert_eq!(actuator.last_action(),Some(DemoMediaAction::PreviousTrack));actuator.set_volume(42).unwrap();assert_eq!(actuator.last_action(),Some(DemoMediaAction::SetVolume(42)));}}
