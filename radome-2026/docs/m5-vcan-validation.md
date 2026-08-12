# M5 — Validation SocketCAN avec `vcan`

Cette tranche valide le chemin SocketCAN réel sans dépendre d'un véhicule ni d'une interface CAN physique.

## Ce qui est validé

Le test Linux `vcan_frame_reaches_runtime_and_hub_through_real_socketcan` utilise une vraie interface `vcan` du noyau Linux et le binaire `cansend` de `can-utils`.

Le chemin testé est :

```text
cansend
  → vcan0 (noyau Linux)
  → SocketCanSource
  → VehicleBusFrame
  → DemoCanAdapter
  → TelemetryEvent
  → Runtime
  → ConnectionHub
  → Envelope Event
```

La trame de référence est :

```text
100#005A
```

Dans le profil CAN de démonstration RADOME, elle doit produire :

```text
vehicle.speed_changed
speed_kmh=90
```

Le test vérifie donc autre chose qu'un simple `bind()` sur une socket CAN : il traverse le pipeline de publication jusqu'au client logique enregistré dans le hub.

## CI

Le job `SocketCAN vcan smoke test` de `.github/workflows/radome-2026-ci.yml` :

1. s'exécute uniquement sur Linux ;
2. installe `can-utils` ;
3. crée et active `vcan0` ;
4. positionne `RADOME_VCAN_INTERFACE=vcan0` ;
5. exécute uniquement le test SocketCAN réel.

Le test reste neutre lors d'un `cargo test` ordinaire : si `RADOME_VCAN_INTERFACE` n'est pas défini, il ne tente pas d'accéder à une interface CAN.

## Reproduction locale

Sur une machine Linux disposant de SocketCAN :

```bash
sudo modprobe vcan
sudo ip link add dev vcan0 type vcan
sudo ip link set up vcan0
sudo dnf install can-utils    # Fedora
# ou : sudo apt install can-utils

cd radome-2026
RADOME_VCAN_INTERFACE=vcan0 \
  cargo test -p radome-server \
  vcan_frame_reaches_runtime_and_hub_through_real_socketcan \
  -- --nocapture
```

Nettoyage :

```bash
sudo ip link del vcan0
```

## Limite de cette tranche

`vcan` valide l'intégration avec l'API SocketCAN et le noyau Linux, mais pas un contrôleur CAN physique, le câblage, les terminaisons ni les erreurs d'un bus réel.

Les risques M5 restant à traiter sont donc principalement :

- récupération après perte ou indisponibilité d'interface ;
- mapping CAN configurable au lieu du seul profil `DemoCanAdapter` compilé en dur ;
- validation optionnelle sur matériel CAN réel.
