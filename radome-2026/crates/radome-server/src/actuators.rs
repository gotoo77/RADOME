use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, PartialEq)]
pub enum ActuatorError { Rejected(&'static str) }

pub trait ClimateActuator: Send + Sync { fn set_temperature(&self, temperature_c:f64)->Result<(),ActuatorError>; }
pub type SharedClimateActuator=Arc<dyn ClimateActuator>;
#[derive(Debug,Default)]pub struct DemoClimateActuator{last_temperature_c:Mutex<Option<f64>>}
impl DemoClimateActuator{pub fn new()->Self{Self::default()}#[cfg(test)]pub fn last_temperature_c(&self)->Option<f64>{*self.last_temperature_c.lock().expect("demo climate actuator mutex poisoned")}}
impl ClimateActuator for DemoClimateActuator{fn set_temperature(&self,temperature_c:f64)->Result<(),ActuatorError>{*self.last_temperature_c.lock().expect("demo climate actuator mutex poisoned")=Some(temperature_c);Ok(())}}

#[derive(Debug,Clone,Copy,PartialEq,Eq)]
pub enum PlaybackState { Playing, Paused }

#[derive(Debug,Clone,PartialEq,Eq)]
pub struct MediaState {
    pub playback: PlaybackState,
    pub volume: u8,
    pub track_index: u32,
}
impl Default for MediaState {
    fn default()->Self{Self{playback:PlaybackState::Paused,volume:50,track_index:0}}
}

pub trait MediaActuator: Send+Sync {
    fn play(&self)->Result<(),ActuatorError>;
    fn pause(&self)->Result<(),ActuatorError>;
    fn toggle_playback(&self)->Result<(),ActuatorError>;
    fn next_track(&self)->Result<(),ActuatorError>;
    fn previous_track(&self)->Result<(),ActuatorError>;
    fn volume_up(&self)->Result<(),ActuatorError>;
    fn volume_down(&self)->Result<(),ActuatorError>;
    fn set_volume(&self,volume:u8)->Result<(),ActuatorError>;
    fn state(&self)->MediaState;
}
pub type SharedMediaActuator=Arc<dyn MediaActuator>;

#[derive(Debug,Default)]pub struct DemoMediaActuator{state:Mutex<MediaState>}
impl DemoMediaActuator {
    pub fn new()->Self{Self::default()}
    fn mutate(&self, f:impl FnOnce(&mut MediaState))->Result<(),ActuatorError>{let mut state=self.state.lock().expect("demo media actuator mutex poisoned");f(&mut state);Ok(())}
}
impl MediaActuator for DemoMediaActuator {
    fn play(&self)->Result<(),ActuatorError>{self.mutate(|s|s.playback=PlaybackState::Playing)}
    fn pause(&self)->Result<(),ActuatorError>{self.mutate(|s|s.playback=PlaybackState::Paused)}
    fn toggle_playback(&self)->Result<(),ActuatorError>{self.mutate(|s|s.playback=match s.playback{PlaybackState::Playing=>PlaybackState::Paused,PlaybackState::Paused=>PlaybackState::Playing})}
    fn next_track(&self)->Result<(),ActuatorError>{self.mutate(|s|s.track_index=s.track_index.saturating_add(1))}
    fn previous_track(&self)->Result<(),ActuatorError>{self.mutate(|s|s.track_index=s.track_index.saturating_sub(1))}
    fn volume_up(&self)->Result<(),ActuatorError>{self.mutate(|s|s.volume=s.volume.saturating_add(5).min(100))}
    fn volume_down(&self)->Result<(),ActuatorError>{self.mutate(|s|s.volume=s.volume.saturating_sub(5))}
    fn set_volume(&self,volume:u8)->Result<(),ActuatorError>{if volume>100{return Err(ActuatorError::Rejected("volume_out_of_range"));}self.mutate(|s|s.volume=volume)}
    fn state(&self)->MediaState{self.state.lock().expect("demo media actuator mutex poisoned").clone()}
}

#[cfg(test)]mod tests{use super::*;
#[test]fn demo_climate_actuator_records_the_requested_temperature(){let actuator=DemoClimateActuator::new();actuator.set_temperature(21.5).unwrap();assert_eq!(actuator.last_temperature_c(),Some(21.5));}
#[test]fn media_state_has_safe_defaults(){assert_eq!(DemoMediaActuator::new().state(),MediaState{playback:PlaybackState::Paused,volume:50,track_index:0});}
#[test]fn playback_commands_update_observable_state(){let actuator=DemoMediaActuator::new();actuator.play().unwrap();assert_eq!(actuator.state().playback,PlaybackState::Playing);actuator.toggle_playback().unwrap();assert_eq!(actuator.state().playback,PlaybackState::Paused);actuator.pause().unwrap();assert_eq!(actuator.state().playback,PlaybackState::Paused);}
#[test]fn track_navigation_updates_observable_state_without_underflow(){let actuator=DemoMediaActuator::new();actuator.previous_track().unwrap();assert_eq!(actuator.state().track_index,0);actuator.next_track().unwrap();actuator.next_track().unwrap();actuator.previous_track().unwrap();assert_eq!(actuator.state().track_index,1);}
#[test]fn volume_commands_are_bounded(){let actuator=DemoMediaActuator::new();actuator.set_volume(98).unwrap();actuator.volume_up().unwrap();assert_eq!(actuator.state().volume,100);actuator.set_volume(2).unwrap();actuator.volume_down().unwrap();assert_eq!(actuator.state().volume,0);assert_eq!(actuator.set_volume(101),Err(ActuatorError::Rejected("volume_out_of_range")));}}
