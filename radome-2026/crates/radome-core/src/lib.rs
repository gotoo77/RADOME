pub mod telemetry;

use std::collections::BTreeSet;

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Capability(String);
impl Capability { pub fn new(name: impl Into<String>) -> Self { Self(name.into()) } pub fn name(&self) -> &str { &self.0 } }

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Role(String);
impl Role { pub fn new(name: impl Into<String>) -> Self { Self(name.into()) } pub fn name(&self) -> &str { &self.0 } }

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct MessageId(String);
impl MessageId { pub fn new(value: impl Into<String>) -> Self { Self(value.into()) } pub fn value(&self) -> &str { &self.0 } }

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Client { pub id: String, pub role: Role, capabilities: BTreeSet<Capability> }
impl Client {
    pub fn new(id: impl Into<String>, role: Role, capabilities: impl IntoIterator<Item = Capability>) -> Self { Self { id: id.into(), role, capabilities: capabilities.into_iter().collect() } }
    pub fn has(&self, capability: &Capability) -> bool { self.capabilities.contains(capability) }
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct SystemCapabilities { capabilities: BTreeSet<Capability> }
impl SystemCapabilities {
    pub fn new(capabilities: impl IntoIterator<Item = Capability>) -> Self { Self { capabilities: capabilities.into_iter().collect() } }
    pub fn has(&self, capability: &Capability) -> bool { self.capabilities.contains(capability) }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Experience { pub id: String, required_system: BTreeSet<Capability>, required_client: BTreeSet<Capability>, preferred_client: BTreeSet<Capability>, allowed_roles: BTreeSet<Role> }
impl Experience {
    pub fn new(id: impl Into<String>, required_system: impl IntoIterator<Item = Capability>, required_client: impl IntoIterator<Item = Capability>, preferred_client: impl IntoIterator<Item = Capability>, allowed_roles: impl IntoIterator<Item = Role>) -> Self {
        Self { id: id.into(), required_system: required_system.into_iter().collect(), required_client: required_client.into_iter().collect(), preferred_client: preferred_client.into_iter().collect(), allowed_roles: allowed_roles.into_iter().collect() }
    }
    pub fn evaluate(&self, system: &SystemCapabilities, client: &Client) -> MatchResult {
        let missing_system = self.required_system.iter().filter(|c| !system.has(c)).cloned().collect::<Vec<_>>();
        let missing_client = self.required_client.iter().filter(|c| !client.has(c)).cloned().collect::<Vec<_>>();
        let missing_preferred = self.preferred_client.iter().filter(|c| !client.has(c)).cloned().collect::<Vec<_>>();
        let role_allowed = self.allowed_roles.is_empty() || self.allowed_roles.contains(&client.role);
        MatchResult { available: missing_system.is_empty() && missing_client.is_empty() && role_allowed, role_allowed, missing_system, missing_client, missing_preferred }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MatchResult { pub available: bool, pub role_allowed: bool, pub missing_system: Vec<Capability>, pub missing_client: Vec<Capability>, pub missing_preferred: Vec<Capability> }

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Command { pub id: MessageId, pub name: String, pub payload: String }
impl Command {
    pub fn new(id: MessageId, name: impl Into<String>, payload: impl Into<String>) -> Self { Self { id, name: name.into(), payload: payload.into() } }
    pub fn succeeded(&self, payload: impl Into<String>) -> CommandResult { CommandResult { correlation_id: self.id.clone(), outcome: CommandOutcome::Succeeded, payload: payload.into() } }
    pub fn failed(&self, error: impl Into<String>) -> CommandResult { CommandResult { correlation_id: self.id.clone(), outcome: CommandOutcome::Failed, payload: error.into() } }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CommandOutcome { Succeeded, Failed }
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommandResult { pub correlation_id: MessageId, pub outcome: CommandOutcome, pub payload: String }

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Event { pub id: MessageId, pub name: String, pub payload: String }
impl Event { pub fn new(id: MessageId, name: impl Into<String>, payload: impl Into<String>) -> Self { Self { id, name: name.into(), payload: payload.into() } } }

#[cfg(test)]
mod tests {
    use super::*;
    fn cap(name: &str) -> Capability { Capability::new(name) }
    fn role(name: &str) -> Role { Role::new(name) }
    fn telemetry_system() -> SystemCapabilities { SystemCapabilities::new([cap("vehicle.telemetry")]) }
    fn telemetry_experience() -> Experience { Experience::new("telemetry", [cap("vehicle.telemetry")], [cap("display")], [cap("touch")], [role("driver-display"), role("center-console")]) }

    #[test] fn dashboard_matches_without_optional_touch() { let c = Client::new("dashboard", role("driver-display"), [cap("display")]); let r = telemetry_experience().evaluate(&telemetry_system(), &c); assert!(r.available); assert!(r.role_allowed); assert_eq!(r.missing_preferred, vec![cap("touch")]); }
    #[test] fn missing_system_capability_blocks_experience() { let c = Client::new("dashboard", role("driver-display"), [cap("display")]); let r = telemetry_experience().evaluate(&SystemCapabilities::default(), &c); assert!(!r.available); assert_eq!(r.missing_system, vec![cap("vehicle.telemetry")]); }
    #[test] fn missing_client_capability_blocks_experience() { let c = Client::new("headless", role("driver-display"), []); let r = telemetry_experience().evaluate(&telemetry_system(), &c); assert!(!r.available); assert_eq!(r.missing_client, vec![cap("display")]); }
    #[test] fn role_can_block_an_otherwise_capable_client() { let c = Client::new("rear-tablet", role("rear-passenger"), [cap("display"), cap("touch")]); let r = telemetry_experience().evaluate(&telemetry_system(), &c); assert!(!r.available); assert!(!r.role_allowed); assert!(r.missing_system.is_empty()); assert!(r.missing_client.is_empty()); }
    #[test] fn matching_is_explainable_for_two_different_clients() { let d = Client::new("dashboard", role("driver-display"), [cap("display")]); let c = Client::new("console", role("center-console"), [cap("display"), cap("touch")]); let e = telemetry_experience(); let s = telemetry_system(); let rd = e.evaluate(&s, &d); let rc = e.evaluate(&s, &c); assert!(rd.available); assert_eq!(rd.missing_preferred, vec![cap("touch")]); assert!(rc.available); assert!(rc.missing_preferred.is_empty()); }
    #[test] fn command_result_is_correlated_with_command() { let c = Command::new(MessageId::new("cmd-42"), "media.play", "track=7"); let r = c.succeeded("playing"); assert_eq!(r.correlation_id, c.id); assert_eq!(r.outcome, CommandOutcome::Succeeded); }
    #[test] fn failed_command_keeps_the_same_correlation_id() { let c = Command::new(MessageId::new("cmd-43"), "navigation.set_destination", "destination=moon"); let r = c.failed("destination_unreachable"); assert_eq!(r.correlation_id, c.id); assert_eq!(r.outcome, CommandOutcome::Failed); }
    #[test] fn event_represents_a_fact_independently_from_a_command() { let e = Event::new(MessageId::new("evt-1"), "vehicle.speed_changed", "speed_kmh=90"); assert_eq!(e.name, "vehicle.speed_changed"); assert_eq!(e.id.value(), "evt-1"); }
}
