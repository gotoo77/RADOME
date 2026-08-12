use radome_core::vehicle_bus::VehicleBusFrame;
use std::io;

/// Source de trames véhicule.
///
/// L'interface est volontairement indépendante de SocketCAN afin que la
/// conversion et la boucle de publication restent testables sans matériel.
pub trait VehicleFrameSource {
    fn recv(&mut self) -> io::Result<VehicleBusFrame>;
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
                return Err(io::Error::new(io::ErrorKind::UnexpectedEof, "incomplete CAN frame"));
            }
            if frame.can_id & (CAN_RTR_FLAG | CAN_ERR_FLAG) != 0 {
                return Err(io::Error::new(io::ErrorKind::InvalidData, "unsupported CAN RTR/error frame"));
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
    use std::collections::VecDeque;

    struct FakeSource(VecDeque<VehicleBusFrame>);

    impl VehicleFrameSource for FakeSource {
        fn recv(&mut self) -> io::Result<VehicleBusFrame> {
            self.0
                .pop_front()
                .ok_or_else(|| io::Error::new(io::ErrorKind::UnexpectedEof, "done"))
        }
    }

    #[test]
    fn frame_source_contract_is_testable_without_can_hardware() {
        let expected = VehicleBusFrame::new(0x100, [0, 90]);
        let mut source = FakeSource(VecDeque::from([expected.clone()]));
        assert_eq!(source.recv().unwrap(), expected);
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

        let (tx, mut rx) = mpsc::unbounded_channel();
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
