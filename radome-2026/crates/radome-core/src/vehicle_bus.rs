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
    InvalidIdentifier { id: u32, max: u32 },
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

/// Profil LIN fictif RADOME.
///
/// LIN utilise un identifiant de trame sur 6 bits (0x00..=0x3f). Le profil de
/// démonstration encode volontairement les mêmes faits métier que le profil
/// CAN avec un layout différent, afin de vérifier que le domaine reste
/// indépendant du bus.
#[derive(Debug, Default, Clone, Copy)]
pub struct DemoLinAdapter;

impl DemoLinAdapter {
    pub const VEHICLE_STATUS_FRAME_ID: u32 = 0x12;
}

impl VehicleBusAdapter for DemoLinAdapter {
    fn decode(&self, frame: &VehicleBusFrame) -> Result<Vec<TelemetryEvent>, FrameDecodeError> {
        if frame.id > 0x3f {
            return Err(FrameDecodeError::InvalidIdentifier { id: frame.id, max: 0x3f });
        }
        if frame.id != Self::VEHICLE_STATUS_FRAME_ID {
            return Err(FrameDecodeError::UnknownFrame { id: frame.id });
        }
        if frame.data.len() != 4 {
            return Err(FrameDecodeError::InvalidLength {
                id: frame.id,
                expected: 4,
                actual: frame.data.len(),
            });
        }

        // Profil RADOME : vitesse puis régime, deux u16 little-endian.
        let speed_kmh = u16::from_le_bytes([frame.data[0], frame.data[1]]);
        let engine_rpm = u16::from_le_bytes([frame.data[2], frame.data[3]]);
        Ok(vec![
            TelemetryEvent::SpeedChanged { speed_kmh },
            TelemetryEvent::EngineRpmChanged { engine_rpm },
        ])
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
    fn demo_lin_status_becomes_the_same_domain_telemetry() {
        let events = DemoLinAdapter
            .decode(&VehicleBusFrame::new(DemoLinAdapter::VEHICLE_STATUS_FRAME_ID, [90, 0, 0x28, 0x0a]))
            .unwrap();
        assert_eq!(events, vec![
            TelemetryEvent::SpeedChanged { speed_kmh: 90 },
            TelemetryEvent::EngineRpmChanged { engine_rpm: 2_600 },
        ]);
    }

    #[test]
    fn demo_lin_rejects_identifier_outside_six_bits() {
        assert_eq!(
            DemoLinAdapter.decode(&VehicleBusFrame::new(0x40, [0, 0, 0, 0])),
            Err(FrameDecodeError::InvalidIdentifier { id: 0x40, max: 0x3f })
        );
    }

    #[test]
    fn demo_lin_rejects_malformed_payload() {
        assert_eq!(
            DemoLinAdapter.decode(&VehicleBusFrame::new(DemoLinAdapter::VEHICLE_STATUS_FRAME_ID, [90, 0])),
            Err(FrameDecodeError::InvalidLength {
                id: DemoLinAdapter::VEHICLE_STATUS_FRAME_ID,
                expected: 4,
                actual: 2,
            })
        );
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
