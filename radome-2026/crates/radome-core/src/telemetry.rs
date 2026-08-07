use crate::{Event, MessageId};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TelemetrySample {
    pub speed_kmh: u16,
    pub engine_rpm: u16,
}

#[derive(Debug, Clone)]
pub struct TelemetrySimulator {
    samples: Vec<TelemetrySample>,
    cursor: usize,
    sequence: u64,
}

impl TelemetrySimulator {
    pub fn new(samples: impl IntoIterator<Item = TelemetrySample>) -> Self {
        Self {
            samples: samples.into_iter().collect(),
            cursor: 0,
            sequence: 0,
        }
    }

    pub fn demo_drive() -> Self {
        Self::new([
            TelemetrySample { speed_kmh: 0, engine_rpm: 800 },
            TelemetrySample { speed_kmh: 30, engine_rpm: 1_500 },
            TelemetrySample { speed_kmh: 50, engine_rpm: 2_000 },
            TelemetrySample { speed_kmh: 90, engine_rpm: 2_600 },
            TelemetrySample { speed_kmh: 110, engine_rpm: 3_000 },
        ])
    }

    pub fn next_events(&mut self) -> Option<Vec<Event>> {
        let sample = self.samples.get(self.cursor)?.clone();
        self.cursor += 1;
        self.sequence += 1;

        let prefix = format!("telemetry-{}", self.sequence);
        Some(vec![
            Event::new(
                MessageId::new(format!("{prefix}-speed")),
                "vehicle.speed_changed",
                format!("speed_kmh={}", sample.speed_kmh),
            ),
            Event::new(
                MessageId::new(format!("{prefix}-rpm")),
                "vehicle.engine_rpm_changed",
                format!("engine_rpm={}", sample.engine_rpm),
            ),
        ])
    }

    pub fn reset(&mut self) {
        self.cursor = 0;
        self.sequence = 0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn simulator_emits_events_from_a_known_sample() {
        let mut simulator = TelemetrySimulator::new([TelemetrySample {
            speed_kmh: 90,
            engine_rpm: 2_600,
        }]);

        let events = simulator.next_events().expect("one sample");

        assert_eq!(events.len(), 2);
        assert_eq!(events[0].name, "vehicle.speed_changed");
        assert_eq!(events[0].payload, "speed_kmh=90");
        assert_eq!(events[1].name, "vehicle.engine_rpm_changed");
        assert_eq!(events[1].payload, "engine_rpm=2600");
    }

    #[test]
    fn simulator_is_deterministic_after_reset() {
        let mut simulator = TelemetrySimulator::demo_drive();

        let first_run = simulator.next_events().expect("first sample");
        simulator.reset();
        let second_run = simulator.next_events().expect("first sample after reset");

        assert_eq!(first_run, second_run);
    }

    #[test]
    fn simulator_stops_after_the_last_sample() {
        let mut simulator = TelemetrySimulator::new([TelemetrySample {
            speed_kmh: 0,
            engine_rpm: 800,
        }]);

        assert!(simulator.next_events().is_some());
        assert!(simulator.next_events().is_none());
    }
}
