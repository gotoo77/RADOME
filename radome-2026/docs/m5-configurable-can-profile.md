# M5 — Profil CAN configurable

## Objectif

Le serveur SocketCAN ne doit pas imposer les IDs `0x100` et `0x101` du profil de démonstration RADOME. Ces IDs ne décrivent aucun véhicule réel : ils servent uniquement à éprouver le pipeline.

Cette tranche rend donc le mapping **ID CAN → signal métier RADOME** configurable au démarrage, sans déplacer la logique de décodage dans la couche SocketCAN.

## Configuration

La variable suivante sélectionne un profil JSON :

```text
RADOME_CAN_PROFILE=/chemin/vers/can-profile.json
```

Si elle est absente, RADOME conserve le profil de démonstration intégré :

```text
0x100 → speed_kmh_u16_be
0x101 → engine_rpm_u16_be
```

Un exemple versionné est disponible dans :

```text
config/can-profile.example.json
```

Exemple :

```json
{
  "frames": [
    { "id": "0x321", "signal": "speed_kmh_u16_be" },
    { "id": "0x456", "signal": "engine_rpm_u16_be" }
  ]
}
```

Les IDs acceptent soit un entier JSON décimal, soit une chaîne décimale ou hexadécimale préfixée par `0x`.

## Signaux supportés

Cette première version reste volontairement fermée sur des décodeurs explicites :

- `speed_kmh_u16_be` : payload de 2 octets, entier non signé big-endian, produit `vehicle.speed_changed` ;
- `engine_rpm_u16_be` : payload de 2 octets, entier non signé big-endian, produit `vehicle.engine_rpm_changed`.

Le fichier de configuration choisit **où** se trouve un signal sur le bus, mais ne devient pas un mini-langage de parsing arbitraire. Quand un nouveau layout réel sera nécessaire, il sera ajouté comme décodeur nommé, testé et versionné.

## Validation

Le chargement refuse au démarrage :

- un JSON invalide ;
- l'absence du tableau `frames` ;
- un profil vide ;
- un ID hors plage CAN 29 bits ;
- deux mappings portant le même ID ;
- un nom de signal inconnu.

La configuration est donc validée avant le lancement du worker SocketCAN.

## Architecture

`SocketCanSource` reste totalement ignorant du profil. Il continue de produire uniquement des `VehicleBusFrame` brutes.

Le chemin devient :

```text
SocketCAN
  → VehicleBusFrame
  → ConfigurableCanAdapter
  → TelemetryEvent
  → Runtime
  → Hub
```

Le profil par défaut et un profil externe empruntent exactement le même pipeline.

## Démarrage

Exemple :

```bash
cd radome-2026
RADOME_TELEMETRY_SOURCE=socketcan \
RADOME_CAN_INTERFACE=can0 \
RADOME_CAN_PROFILE=config/can-profile.example.json \
  cargo run -p radome-server
```

Le serveur indique au démarrage le profil chargé dans la ligne de diagnostic SocketCAN.

## Limites

Cette tranche ne prétend pas encore décrire un DBC complet, des bitfields, des facteurs d'échelle ou des multiplexeurs CAN. L'objectif M5 est de rendre le mapping actuel remplaçable sans recompilation, pas de développer un compilateur DBC maison avant d'en avoir un besoin réel.
