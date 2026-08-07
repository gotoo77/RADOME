use std::collections::BTreeSet;

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Capability(String);

impl Capability {
    pub fn new(name: impl Into<String>) -> Self {
        Self(name.into())
    }

    pub fn name(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Client {
    pub id: String,
    capabilities: BTreeSet<Capability>,
}

impl Client {
    pub fn new(id: impl Into<String>, capabilities: impl IntoIterator<Item = Capability>) -> Self {
        Self {
            id: id.into(),
            capabilities: capabilities.into_iter().collect(),
        }
    }

    pub fn has(&self, capability: &Capability) -> bool {
        self.capabilities.contains(capability)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Experience {
    pub id: String,
    required: BTreeSet<Capability>,
    preferred: BTreeSet<Capability>,
}

impl Experience {
    pub fn new(
        id: impl Into<String>,
        required: impl IntoIterator<Item = Capability>,
        preferred: impl IntoIterator<Item = Capability>,
    ) -> Self {
        Self {
            id: id.into(),
            required: required.into_iter().collect(),
            preferred: preferred.into_iter().collect(),
        }
    }

    pub fn evaluate(&self, client: &Client) -> MatchResult {
        let missing_required = self
            .required
            .iter()
            .filter(|capability| !client.has(capability))
            .cloned()
            .collect();

        let missing_preferred = self
            .preferred
            .iter()
            .filter(|capability| !client.has(capability))
            .cloned()
            .collect();

        MatchResult {
            available: missing_required.is_empty(),
            missing_required,
            missing_preferred,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MatchResult {
    pub available: bool,
    pub missing_required: Vec<Capability>,
    pub missing_preferred: Vec<Capability>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cap(name: &str) -> Capability {
        Capability::new(name)
    }

    #[test]
    fn experience_is_available_when_required_capabilities_exist() {
        let dashboard = Client::new("dashboard", [cap("display")]);
        let telemetry = Experience::new(
            "telemetry",
            [cap("display")],
            [cap("touch")],
        );

        let result = telemetry.evaluate(&dashboard);

        assert!(result.available);
        assert!(result.missing_required.is_empty());
        assert_eq!(result.missing_preferred, vec![cap("touch")]);
    }

    #[test]
    fn experience_is_unavailable_when_required_capability_is_missing() {
        let headless = Client::new("headless", []);
        let telemetry = Experience::new("telemetry", [cap("display")], []);

        let result = telemetry.evaluate(&headless);

        assert!(!result.available);
        assert_eq!(result.missing_required, vec![cap("display")]);
    }

    #[test]
    fn two_clients_can_match_the_same_experience_differently() {
        let dashboard = Client::new("dashboard", [cap("display")]);
        let tablet = Client::new("tablet", [cap("display"), cap("touch")]);
        let telemetry = Experience::new(
            "telemetry",
            [cap("display")],
            [cap("touch")],
        );

        let dashboard_result = telemetry.evaluate(&dashboard);
        let tablet_result = telemetry.evaluate(&tablet);

        assert!(dashboard_result.available);
        assert_eq!(dashboard_result.missing_preferred, vec![cap("touch")]);

        assert!(tablet_result.available);
        assert!(tablet_result.missing_preferred.is_empty());
    }
}
