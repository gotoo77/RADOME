# RADOME

**RADOME est un laboratoire de cockpit automobile ouvert, découplé du véhicule et testable hors matériel réel.**

Le projet explore une architecture dans laquelle les producteurs de données — simulateur aujourd'hui, bus CAN demain — ne pilotent pas directement l'interface. Ils publient des événements métier à travers un protocole commun. Le dashboard, l'enregistrement et le replay consomment tous ce même contrat.

L'objectif n'est pas de prétendre fournir aujourd'hui un système embarqué automobile prêt pour la production. RADOME sert à construire et éprouver les briques d'un cockpit observable, reproductible et progressivement connectable à un véhicule réel.

## État actuel

La génération `radome-2026/` fournit déjà :

- un cœur Rust avec runtime, capacités et événements ;
- un serveur WebSocket RADOME ;
- une télémétrie véhicule simulée (vitesse et régime moteur) ;
- un dashboard web avec instrumentation et infotainment ;
- un mode démo utilisable sans serveur ni véhicule ;
- un contrat canonique de télémétrie partagé par les producteurs et consommateurs ;
- l'enregistrement de sessions en JSON versionné ;
- le chargement et le replay déterministe de traces ;
- un cycle de vie observable du replay (`running`, `complete`, annulation) ;
- une CI exécutée sur Linux, Windows et macOS.

## Architecture

Le principe central est de découpler la provenance physique d'une donnée de son usage :

```text
          ┌──────────────┐
          │ Simulateur   │
          └──────┬───────┘
                 │
          ┌──────▼───────┐
          │ futur CAN    │
          └──────┬───────┘
                 │
                 ▼
       événements métier RADOME
                 │
       ┌─────────┼─────────┐
       ▼         ▼         ▼
   Dashboard  Recorder   Replay
       │                   │
       └─────────┬─────────┘
                 ▼
          modèles d'état
       véhicule / infotainment
```

Le dashboard ne doit donc pas avoir à savoir si `vehicle.speed_changed` provient d'un simulateur, d'une trace enregistrée ou, à terme, d'un adaptateur CAN.

## Contrat de télémétrie

Les événements véhicule actuellement définis sont notamment :

```text
vehicle.speed_changed       speed_kmh=<u16>
vehicle.engine_rpm_changed  engine_rpm=<u16>
```

Le cœur Rust construit et décode ces événements via un type `TelemetryEvent`. Le dashboard applique le même contrat : noms, clés et valeurs sont validés plutôt que devinés ou convertis implicitement.

Cette discipline évite que plusieurs dialectes (`speed=`, `speed_kmh=`, valeur brute, etc.) apparaissent silencieusement entre producteurs, fichiers de traces et consommateurs.

## Démo du dashboard

Le dashboard se trouve dans :

```text
radome-2026/clients/dashboard/
```

Il est constitué de HTML, CSS et JavaScript sans framework. Son mode démo fonctionne sans runtime Rust ni connexion WebSocket : il suffit de servir ce répertoire avec un serveur HTTP statique puis d'ouvrir `index.html?demo`.

Par exemple avec Python :

```bash
cd radome-2026/clients/dashboard
python3 -m http.server 8000
```

Puis ouvrir `http://127.0.0.1:8000/?demo` dans le navigateur.

Le dashboard permet également de charger localement un fichier JSON de replay.

## Mode live

Le serveur RADOME écoute par défaut sur :

```text
ws://127.0.0.1:8787
```

Le dashboard utilise cette adresse par défaut hors mode démo. Une autre URL WebSocket peut être fournie avec le paramètre `ws`.

Le serveur publie actuellement une télémétrie de démonstration ; cette frontière est destinée à accueillir ensuite une source physique, notamment CAN, sans modifier les modèles du dashboard.

## Record & replay

RADOME traite le replay comme une propriété du système et pas uniquement comme une animation de démonstration.

Une session peut être enregistrée sous forme d'une trace JSON versionnée contenant les événements et leurs délais relatifs. Cette trace est validée au chargement avant d'être rejouée.

Un invariant est couvert par les tests :

> **Enregistrer puis rejouer une séquence d'événements conserve son état observable.**

La chaîne testée traverse réellement :

```text
événements
   → recorder
   → JSON versionné
   → parsing / validation
   → replay
   → modèles d'état
   → état final observable
```

## Tests

Depuis `radome-2026/` :

```bash
cargo test --workspace
```

Les tests du dashboard utilisent le runner natif de Node.js (`node --test`) et sont également exécutés par la CI du projet.

## Structure

```text
RADOME/
├── radome-2026/
│   ├── crates/
│   │   ├── radome-core/       # domaine, runtime, télémétrie
│   │   ├── radome-protocol/   # primitives de protocole
│   │   └── radome-server/     # serveur WebSocket et producteurs
│   └── clients/
│       └── dashboard/         # cockpit web, démo, record/replay
└── README.md
```

## Direction

Les prochaines étapes naturelles sont :

- publier une démonstration statique via GitHub Pages ;
- améliorer la façade et l'ergonomie du cockpit ;
- connecter une véritable source de télémétrie véhicule derrière la frontière existante ;
- enrichir progressivement le contrat métier sans coupler l'interface au matériel ;
- continuer à renforcer les propriétés de déterminisme, replay et observabilité.

RADOME avance volontairement par tranches courtes : chaque nouvelle source ou fonctionnalité doit préserver le même principe — **le matériel produit des faits ; le protocole les transporte ; les consommateurs restent découplés de leur origine.**
