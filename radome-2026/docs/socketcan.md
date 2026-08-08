# Source SocketCAN

RADOME peut utiliser une interface CAN Linux comme source de télémétrie tout en conservant le même pipeline métier que le simulateur.

```text
SocketCAN (can0 / vcan0)
        ↓
VehicleBusFrame
        ↓
DemoCanAdapter
        ↓
TelemetryEvent
        ↓
Runtime → Hub → Dashboard
```

## Lancer avec SocketCAN

Sous Linux :

```bash
RADOME_TELEMETRY_SOURCE=socketcan \
RADOME_CAN_INTERFACE=can0 \
cargo run -p radome-server
```

`RADOME_CAN_INTERFACE` vaut `can0` par défaut.

Le profil CAN actuellement compris est volontairement un profil de démonstration RADOME et **ne correspond à aucun constructeur** :

| CAN ID | Donnée | Événement RADOME |
| --- | --- | --- |
| `0x100` | entier non signé 16 bits big-endian | `vehicle.speed_changed` |
| `0x101` | entier non signé 16 bits big-endian | `vehicle.engine_rpm_changed` |

Exemple : `0x100 00 5A` produit `vehicle.speed_changed / speed_kmh=90`.

## Tester sans voiture avec vcan

Sur une machine Linux disposant des outils CAN :

```bash
sudo modprobe vcan
sudo ip link add dev vcan0 type vcan
sudo ip link set up vcan0

RADOME_TELEMETRY_SOURCE=socketcan RADOME_CAN_INTERFACE=vcan0 cargo run -p radome-server
```

Dans un autre terminal, une trame de vitesse peut être injectée avec `cansend` :

```bash
cansend vcan0 100#005A
```

Le dashboard connecté au serveur doit alors recevoir une vitesse de 90 km/h.

## Portabilité

SocketCAN est une implémentation Linux. Le code spécifique est compilé uniquement sous Linux ; demander `RADOME_TELEMETRY_SOURCE=socketcan` sur un autre OS produit une erreur explicite.

Le cœur `radome-core` ne dépend ni de SocketCAN ni de `libc`. Cette séparation est intentionnelle : d'autres transports, notamment LIN, pourront produire les mêmes `VehicleBusFrame` ou événements métier sans modifier le cockpit.
