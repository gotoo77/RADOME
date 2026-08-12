use radome_core::vehicle_bus::VehicleBusFrame;
use std::io;

/// Source de trames véhicule.
///
/// L'interface est volontairement indépendante de SocketCAN afin que la
/// conversion et la boucle de publication restent testables sans matériel.
pub trait VehicleFrameSource {
    fn recv(&mut self) -> io::Result<VehicleBusFrame>;
}

/// Source qui ouvre sa source physique à la demande et l'oublie lorsqu'une
/// erreur indique que le transport n'est plus utilisable.
///
/// Le prochain appel à `recv` tentera alors une nouvelle ouverture. Cette
/// mécanique permet au serveur de survivre aussi bien à une interface absente
/// au démarrage qu'à une disparition/réapparition en cours d'exécution.
pub struct ReconnectingVehicleSource<S, O> {
    source: Option<S>,
    open: O,
}

impl<S, O> ReconnectingVehicleSource<S, O>
where
    S: VehicleFrameSource,
    O: FnMut() -> io::Result<S>,
{
    pub fn new(open: O) -> Self {
        Self { source: None, open }
    }
}

impl<S, O> VehicleFrameSource for ReconnectingVehicleSource<S, O>
where
    S: VehicleFrameSource,
    O: FnMut() -> io::Result<S>,
{
    fn recv(&mut self) -> io::Result<VehicleBusFrame> {
        if self.source.is_none() {
            self.source = Some((self.open)()?);
        }

        let result = self
            .source
            .as_mut()
            .expect("source initialized before recv")
            .recv();

        if let Err(error) = &result {
            if source_error_requires_reconnect(error) {
                self.source = None;
            }
        }

        result
    }
}

/// Les erreurs de contenu de trame et interruptions transitoires ne justifient
/// pas de jeter le socket. Les autres erreurs sont considérées comme une perte
/// de source et provoqueront une réouverture au prochain `recv`.
pub fn source_error_requires_reconnect(error: &io::Error) -> bool {
    !matches!(
        error.kind(),
        io::ErrorKind::InvalidData | io::ErrorKind::Interrupted | io::ErrorKind::WouldBlock
    )
}

#[cfg(target_os = "linux")]
mod linux {
    use super::*;
    use std::mem::{size_of, zeroed};
    use std::os::fd::{AsRawFd, FromRawFd, OwnedFd};

    const PF_CAN: libc::c_int = 29;
    const AF_CAN: libc::sa_family_t = PF_CAN as libc::sa_family_t;
    const SOCK_RAW: libc::c_int = 3;
    const CAN_RAW: libc::c_int = 1;
    const CAN_EFF_FLAG: u32 = 0x8000_0000;
    const CAN_RTR_FLAG: u32 = 0x4000_0000;
    const CAN_ERR_FLAG: u32 = 0x2000_0000;
    const CAN_SFF_MASK: u32 = 0x0000_07ff;
    const CAN_EFF_MASK: u32 = 0x1fff_ffff;

    #[repr(C)]
    struct CanFrame {
        can_id: u32,
        can_dlc: u8,
        pad: u8,
        res0: u8,
        len8_dlc: u8,
        data: [u8; 8],
    }

    #[repr(C)]
    struct SockAddrCan {
        can_family: libc::sa_family_t,
        can_ifindex: libc::c_int,
        addr: [u8; 8],
    }

    pub struct SocketCanSource {
        fd: OwnedFd,
    }

    impl SocketCanSource {
        pub fn open(interface: &str) -> io::Result<Self> {
            let interface = std::ffi::CString::new(interface)
                .map_err(|_| io::Error::new(io::ErrorKind::InvalidInput, "invalid CAN interface"))?;

            let fd = unsafe { libc::socket(PF_CAN, SOCK_RAW, CAN_RAW) };
            if fd < 0 {
                return Err(io::Error::last_os_error());
            }
            let fd = unsafe { OwnedFd::from_raw_fd(fd) };

            let ifindex = unsafe { libc::if_nametoindex(interface.as_ptr()) };
            if ifindex == 0 {
                return Err(io::Error::last_os_error());
            }

            let address = SockAddrCan {
                can_family: AF_CAN,
                can_ifindex: ifindex as libc::c_int,
                addr: [0; 8],
            };
            let result = unsafe {
                libc::bind(
                    fd.as_raw_fd(),
                    &address as *const SockAddrCan as *const libc::sockaddr,
                    size_of::<SockAddrCan>() as libc::socklen_t,
                )
            };
            if result < 0 {
                return Err(io::Error::last_os_error());
            }
            Ok(Self { fd })
        }
    }

    impl VehicleFrameSource for SocketCanSource {
        fn recv(&mut self) -> io::Result<VehicleBusFrame> {
            let mut frame: CanFrame = unsafe { zeroed() };
            let read = unsafe {
                libc::read(
                    self.fd.as_raw_fd(),
                    &mut frame as *mut CanFrame as *mut libc::c_void,
                    size_of::<CanFrame>(),
                )
            };
            if read < 0 {
                return Err(io::Error::last_os_error());
            }
            if read as usize != size_of::<CanFrame>() {
                return Err(io::Error::new(
                    io::ErrorKind::UnexpectedEof,
                    "incomplete CAN frame",
                ));
            }
            if frame.can_id & (CAN_RTR_FLAG | CAN_ERR_FLAG) != 0 {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "unsupported CAN RTR/error frame",
                ));
            }
            let len = usize::from(frame.can_dlc.min(8));
            let id = if frame.can_id & CAN_EFF_FLAG != 0 {
                frame.can_id & CAN_EFF_MASK
            } else {
                frame.can_id & CAN_SFF_MASK
            };
            Ok(VehicleBusFrame::new(id, frame.data[..len].to_vec()))
        }
    }
}

#[cfg(target_os = "linux")]
pub use linux::SocketCanSource;

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;
    use std::collections::VecDeque;
    use std::rc::Rc;

    enum FakeRead {
        Frame(VehicleBusFrame),
        Error(io::ErrorKind),
    }

    struct FakeSource(VecDeque<FakeRead>);

    impl FakeSource {
        fn with_frame(frame: VehicleBusFrame) -> Self {
            Self(VecDeque::from([FakeRead::Frame(frame)]))
        }

        fn failing(kind: io::ErrorKind) -> Self {
            Self(VecDeque::from([FakeRead::Error(kind)]))
        }
    }

    impl VehicleFrameSource for FakeSource {
        fn recv(&mut self) -> io::Result<VehicleBusFrame> {
            match self.0.pop_front() {
                Some(FakeRead::Frame(frame)) => Ok(frame),
                Some(FakeRead::Error(kind)) => Err(io::Error::new(kind, "fake source failure")),
                None => Err(io::Error::new(io::ErrorKind::UnexpectedEof, "done")),
            }
        }
    }

    #[test]
    fn frame_source_contract_is_testable_without_can_hardware() {
        let expected = VehicleBusFrame::new(0x100, [0, 90]);
        let mut source = FakeSource::with_frame(expected.clone());
        assert_eq!(source.recv().unwrap(), expected);
    }

    #[test]
    fn reconnecting_source_reopens_after_transport_failure() {
        let expected = VehicleBusFrame::new(0x100, [0, 90]);
        let opens = Rc::new(Cell::new(0));
        let opens_for_factory = Rc::clone(&opens);
        let mut sources = VecDeque::from([
            FakeSource::failing(io::ErrorKind::NotConnected),
            FakeSource::with_frame(expected.clone()),
        ]);

        let mut source = ReconnectingVehicleSource::new(move || {
            opens_for_factory.set(opens_for_factory.get() + 1);
            Ok(sources.pop_front().expect("fake source available"))
        });

        assert_eq!(source.recv().unwrap_err().kind(), io::ErrorKind::NotConnected);
        assert_eq!(source.recv().unwrap(), expected);
        assert_eq!(opens.get(), 2);
    }

    #[test]
    fn reconnecting_source_recovers_when_interface_appears_after_startup() {
        let expected = VehicleBusFrame::new(0x101, [0x0a, 0x28]);
        let attempts = Rc::new(Cell::new(0));
        let attempts_for_factory = Rc::clone(&attempts);
        let mut recovered = Some(FakeSource::with_frame(expected.clone()));

        let mut source = ReconnectingVehicleSource::new(move || {
            let attempt = attempts_for_factory.get();
            attempts_for_factory.set(attempt + 1);
            if attempt == 0 {
                Err(io::Error::new(io::ErrorKind::NotFound, "interface absent"))
            } else {
                Ok(recovered.take().expect("recovered source available"))
            }
        });

        assert_eq!(source.recv().unwrap_err().kind(), io::ErrorKind::NotFound);
        assert_eq!(source.recv().unwrap(), expected);
        assert_eq!(attempts.get(), 2);
    }

    #[test]
    fn invalid_frame_does_not_force_socket_reopen() {
        let opens = Rc::new(Cell::new(0));
        let opens_for_factory = Rc::clone(&opens);
        let expected = VehicleBusFrame::new(0x100, [0, 90]);
        let mut initial = Some(FakeSource(VecDeque::from([
            FakeRead::Error(io::ErrorKind::InvalidData),
            FakeRead::Frame(expected.clone()),
        ])));

        let mut source = ReconnectingVehicleSource::new(move || {
            opens_for_factory.set(opens_for_factory.get() + 1);
            Ok(initial.take().expect("single socket expected"))
        });

        assert_eq!(source.recv().unwrap_err().kind(), io::ErrorKind::InvalidData);
        assert_eq!(source.recv().unwrap(), expected);
        assert_eq!(opens.get(), 1);
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn vcan_frame_reaches_runtime_and_hub_through_real_socketcan() {
        use crate::hub::ConnectionHub;
        use crate::producer::publish_next_bus_frame;
        use radome_core::runtime::Runtime;
        use radome_core::vehicle_bus::DemoCanAdapter;
        use radome_core::{Capability, Client, MessageType, Role, SystemCapabilities};
        use std::process::Command;
        use std::sync::{Arc, Mutex};
        use tokio::sync::mpsc;

        let Ok(interface) = std::env::var("RADOME_VCAN_INTERFACE") else {
            eprintln!("RADOME_VCAN_INTERFACE absent: test vcan ignore");
            return;
        };

        let runtime = Arc::new(Mutex::new(Runtime::new(SystemCapabilities::new([
            Capability::new("vehicle.telemetry"),
        ]))));
        runtime.lock().unwrap().register_client(Client::new(
            "vcan-dashboard",
            Role::new("driver-display"),
            [Capability::new("display")],
        ));

        let (tx, mut rx) = mpsc::channel(4);
        let hub = Arc::new(Mutex::new(ConnectionHub::default()));
        hub.lock().unwrap().register("vcan-dashboard", tx);

        let mut source = SocketCanSource::open(&interface).expect("open configured vcan interface");
        let status = Command::new("cansend")
            .args([interface.as_str(), "100#005A"])
            .status()
            .expect("execute cansend from can-utils");
        assert!(status.success(), "cansend must inject the vcan frame");

        let published = publish_next_bus_frame(&mut source, &DemoCanAdapter, &runtime, &hub)
            .expect("vcan frame must traverse the real SocketCAN pipeline");
        assert_eq!(published, 1);

        let envelope = rx.try_recv().expect("dashboard receives vcan-derived event");
        assert_eq!(envelope.message_type, MessageType::Event);
        assert_eq!(envelope.payload["name"], "vehicle.speed_changed");
        assert_eq!(envelope.payload["data"], "speed_kmh=90");
        assert!(rx.try_recv().is_err());
    }
}
