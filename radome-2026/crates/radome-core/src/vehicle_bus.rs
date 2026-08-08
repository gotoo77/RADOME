use crate::telemetry::TelemetryEvent;

/// Trame brute reçue depuis un bus véhicule.
///
/// Le cœur RADOME ne dépend volontairement ni de SocketCAN, ni de LIN, ni d'un
/// pilote particulier : un adaptateur transforme une trame physique en faits
/// métier `TelemetryEvent`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VehicleBusFrame {
    pub id: u32,
    pub data: Vec<u8>,
}

impl VehicleBusFrame {
    pub fn new(id: u32, data: impl Into<Vec<u8>>) -> Self {
        Self { id, data: data.into() }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FrameDecodeError {
    UnknownFrame { id: u32 },
    InvalidLength { id: u32, expected: usize, actual: usize },
}

/// Frontière entre un protocole de bus physique et le domaine RADOME.
pub trait VehicleBusAdapter {
    fn decode(&self, frame: &VehicleBusFrame) -> Result<Vec<TelemetryEvent>, FrameDecodeError>;
}

/// Premier mapping CAN minimal et déterministe utilisé pour éprouver la
/// frontière. Les identifiants sont ceux du profil de démonstration RADOME,
/// pas ceux d'un constructeur automobile réel.
#[derive(Debug, Default, Clone, Copy)]
pub struct DemoCanAdapter;

impl DemoCanAdapter {
    pub const SPEED_FRAME_ID: u32 = 0x100;
    pub const ENGINE_RPM_FRAME_ID: u32 = 0x101;
}

impl VehicleBusAdapter for DemoCanAdapter {
    fn decode(&self, frame: &VehicleBusFrame) -> Result<Vec<TelemetryEvent>, FrameDecodeError> {
        let value = decode_u16_be(frame)?;
        match frame.id {
            Self::SPEED_FRAME_ID => Ok(vec![TelemetryEvent::SpeedChanged { speed_kmh: value }]),
            Self::ENGINE_RPM_FRAME_ID => Ok(vec![TelemetryEvent::EngineRpmChanged { engine_rpm: value }]),
            id => Err(FrameDecodeError::UnknownFrame { id }),
        }
    }
}

fn decode_u16_be(frame: &VehicleBusFrame) -> Result<u16, FrameDecodeError> {
    if frame.data.len() != 2 {
        return Err(FrameDecodeError::InvalidLength {
            id: frame.id,
            expected: 2,
            actual: frame.data.len(),
        });
    }
    Ok(u16::from_be_bytes([frame.data[0], frame.data[1]]))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn demo_can_speed_becomes_domain_telemetry() {
        let events = DemoCanAdapter
            .decode(&VehicleBusFrame::new(DemoCanAdapter::SPEED_FRAME_ID, [0x00, 0x5a]))
            .unwrap();

        assert_eq!(events, vec![TelemetryEvent::SpeedChanged { speed_kmh: 90 }]);
    }

    #[test]
    fn demo_can_rpm_becomes_domain_telemetry() {
        let events = DemoCanAdapter
            .decode(&VehicleBusFrame::new(DemoCanAdapter::ENGINE_RPM_FRAME_ID, [0x0a, 0x28]))
            .unwrap();

        assert_eq!(events, vec![TelemetryEvent::EngineRpmChanged { engine_rpm: 2_600 }]);
    }

    #[test]
    fn adapter_rejects_unknown_frames() {
        assert_eq!(
            DemoCanAdapter.decode(&VehicleBusFrame::new(0x777, [0, 1])),
            Err(FrameDecodeError::UnknownFrame { id: 0x777 })
        );
    }

    #[test]
    fn adapter_rejects_malformed_frames() {
        assert_eq!(
            DemoCanAdapter.decode(&VehicleBusFrame::new(DemoCanAdapter::SPEED_FRAME_ID, [90])),
            Err(FrameDecodeError::InvalidLength {
                id: DemoCanAdapter::SPEED_FRAME_ID,
                expected: 2,
                actual: 1,
            })
        );
    }
}
