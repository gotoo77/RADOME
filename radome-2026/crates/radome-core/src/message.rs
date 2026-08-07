#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct MessageId(String);
impl MessageId {
    pub fn new(value: impl Into<String>) -> Self { Self(value.into()) }
    pub fn value(&self) -> &str { &self.0 }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Command {
    pub id: MessageId,
    pub name: String,
    pub payload: String,
}
impl Command {
    pub fn new(id: MessageId, name: impl Into<String>, payload: impl Into<String>) -> Self {
        Self { id, name: name.into(), payload: payload.into() }
    }
    pub fn succeeded(&self, payload: impl Into<String>) -> CommandResult {
        CommandResult { correlation_id: self.id.clone(), outcome: CommandOutcome::Succeeded, payload: payload.into() }
    }
    pub fn failed(&self, error: impl Into<String>) -> CommandResult {
        CommandResult { correlation_id: self.id.clone(), outcome: CommandOutcome::Failed, payload: error.into() }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CommandOutcome { Succeeded, Failed }

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommandResult {
    pub correlation_id: MessageId,
    pub outcome: CommandOutcome,
    pub payload: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Event {
    pub id: MessageId,
    pub name: String,
    pub payload: String,
}
impl Event {
    pub fn new(id: MessageId, name: impl Into<String>, payload: impl Into<String>) -> Self {
        Self { id, name: name.into(), payload: payload.into() }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn command_results_keep_correlation() {
        let command = Command::new(MessageId::new("cmd-42"), "media.play", "track=7");
        assert_eq!(command.succeeded("playing").correlation_id, command.id);
        assert_eq!(command.failed("failed").correlation_id, command.id);
    }

    #[test]
    fn event_has_its_own_identity() {
        let event = Event::new(MessageId::new("evt-1"), "vehicle.speed_changed", "speed_kmh=90");
        assert_eq!(event.id.value(), "evt-1");
    }
}
