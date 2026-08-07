# Capabilities RADOME

## Pourquoi

Le prototype 2015 exposait directement des fonctions techniques telles que `CAN1`…`CAN5`, `AUDIO`, `VIDEO` et `NAV`.

Cette approche était suffisante pour une démonstration, mais elle mélange deux niveaux :

- **ce que l'expérience utilisateur veut obtenir** ;
- **le matériel ou protocole utilisé pour l'obtenir**.

RADOME 2026 doit séparer ces niveaux.

## Cas historique CAN

Les flux `CAN1`…`CAN5` du prototype sont des **simulations** : les valeurs sont produites depuis des tableaux statiques et envoyées comme flux WebSocket. Ils n'ont pas été validés avec un contrôleur ou un véhicule réellement connecté à un bus CAN.

Ils doivent donc être documentés comme simulateurs de télémétrie, et non comme support CAN historique.

L'intuition utile à conserver est différente : RADOME pouvait développer et démontrer une expérience infotainment **sans disposer du matériel final**.

Ce principe devient une propriété explicite de RADOME 2026.

## Capability vs adapter

Une capability exprime un besoin ou une fonction stable :

```text
VehicleTelemetry
Navigation
AudioPlayback
VideoPlayback
Display
TouchInput
```

Un adapter explique comment cette fonction est réalisée sur une plateforme donnée :

```text
VehicleTelemetry
    ├── SimulatorAdapter
    ├── SocketCanAdapter
    ├── CanFdAdapter
    └── VendorVehicleAdapter
```

Le core RADOME ne doit pas savoir si une vitesse véhicule provient d'un tableau de démonstration, de SocketCAN, d'un calculateur ou d'un replay de trace.

## Exemple de contrat conceptuel

Un fournisseur de télémétrie pourrait exposer :

```text
capability: vehicle.telemetry
signals:
  - vehicle.speed
  - engine.rpm
  - fuel.level
```

L'implémentation peut ensuite être :

```text
simulator
socketcan
recorded-trace
vendor-api
```

Le nom physique `CAN1` n'apparaît donc plus dans l'API métier.

## Simulateurs comme citoyens de premier rang

Chaque capability matérielle importante devrait pouvoir disposer d'un simulateur déterministe.

Objectifs :

- développement sans matériel ;
- CI ;
- démonstrations reproductibles ;
- scénarios d'erreur ;
- tests de charge ;
- replay de situations terrain.

Exemple :

```text
vehicle.telemetry.simulator
  profile: highway-drive
  seed: 42
```

Un test doit pouvoir rejouer exactement le même scénario.

## Adapters réels

Les adapters matériels vivent hors du core.

Exemple Linux automobile/embarqué :

```text
SocketCAN
    ↓
SocketCanAdapter
    ↓
vehicle.telemetry
    ↓
RADOME Core
```

L'adapter est responsable du protocole physique et de sa traduction vers le modèle RADOME.

Cette frontière permettra ultérieurement de supporter CAN, CAN FD ou d'autres sources sans changer les clients RADOME.

## Capabilities clientes

Le même concept peut décrire les terminaux d'affichage.

Un client peut annoncer par exemple :

```json
{
  "display": {
    "width": 1280,
    "height": 480,
    "density": 1.0
  },
  "input": {
    "touch": true
  },
  "audio": {
    "output": true
  },
  "video": {
    "decode": ["h264"]
  }
}
```

Ce JSON est illustratif : il ne constitue pas encore le schéma du protocole.

RADOME peut alors adapter une expérience à ce que le terminal sait réellement faire plutôt qu'à un type d'appareil codé en dur.

## Capabilities système et capabilities terminal

Deux catégories doivent être distinguées :

### System capabilities

Services disponibles dans l'installation :

- télémétrie véhicule ;
- navigation ;
- bibliothèque média ;
- connectivité ;
- données de vol, le cas échéant.

### Client capabilities

Fonctions disponibles sur un terminal :

- écran ;
- tactile ;
- audio ;
- vidéo ;
- stockage local ;
- capteurs locaux.

Une expérience RADOME peut être sélectionnée/adaptée à l'intersection des deux.

## Exemple infotainment

```text
                    RADOME Core
                         │
        ┌────────────────┼────────────────┐
        │                │                │
 VehicleTelemetry    Navigation       MediaLibrary
        ▲                ▲                ▲
        │                │                │
 Simulator/CAN       GPS/vendor        filesystem

                         │
               capability matching
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
      dashboard      center screen    rear tablet
      display ✓      display ✓        display ✓
      touch ✗        touch ✓          touch ✓
      audio ✗        audio ✓          audio ✓
```

Le protocole ne doit pas envoyer aveuglément la même interface à ces trois terminaux.

## Principe de sécurité

Découvrir une capability ne donne pas automatiquement le droit de l'utiliser.

Par exemple :

```text
vehicle.telemetry.read
vehicle.control.write
```

sont deux permissions radicalement différentes.

RADOME 2026 devra séparer :

- disponibilité d'une capability ;
- permissions associées au client/rôle ;
- opérations effectivement autorisées.

C'est particulièrement important si RADOME est utilisé dans un véhicule ou un avion.

## Décisions reportées

Ce document ne choisit pas encore :

- le format exact de déclaration des capabilities ;
- leur nomenclature normative ;
- le mécanisme de découverte ;
- le modèle de permissions ;
- le système de plugins ;
- SocketCAN ou une bibliothèque précise.

Il fixe seulement une frontière architecturale : **RADOME manipule des capacités fonctionnelles ; les protocoles et matériels sont fournis par des adapters interchangeables, réels ou simulés.**
