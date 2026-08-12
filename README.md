# RADOME

**RADOME est un laboratoire de cockpit automobile ouvert, découplé du véhicule et testable hors matériel réel.**

> **Démo publique : https://gotoo77.github.io/RADOME/**  
> Aucun serveur, runtime Rust ou véhicule n'est nécessaire pour essayer le cockpit en simulation.

Le projet explore une architecture dans laquelle les producteurs de données — simulateur, replay ou SocketCAN — ne pilotent pas directement l'interface. Ils publient des événements métier à travers un protocole commun. Le dashboard, l'enregistrement et le replay consomment tous ce même contrat.

L'objectif n'est pas de prétendre fournir aujourd'hui un système embarqué automobile prêt pour la production. RADOME sert à construire et éprouver les briques d'un cockpit observable, reproductible et progressivement connectable à un véhicule réel.

## État actuel

La génération `radome-2026/` fournit :

- un cœur Rust avec runtime, capacités et événements ;
- un serveur WebSocket RADOME versionné ;
- une télémétrie véhicule simulée et une source SocketCAN Linux ;
- un mapping CAN configurable et une validation `vcan` en CI ;
- un SDK JavaScript avec discovery, snapshot, commandes, reconnexion et resynchronisation ;
- un cockpit web avec Vehicle Info Display, Media Player et Climate Control ;
- un mode diagnostic séparé de l'IHM normale ;
- un mode démo utilisable sans serveur ni véhicule, publié sur GitHub Pages ;
- l'enregistrement de sessions en JSON versionné et leur replay déterministe ;
- une CI Linux/Windows/macOS, plus des smoke tests SocketCAN et serveur ↔ SDK réel.

## Architecture

Le principe central est de découpler la provenance physique d'une donnée de son usage :

```text
      simulateur / replay / SocketCAN
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
       véhicule / média / climat
```

Le dashboard ne doit donc pas avoir à savoir si `vehicle.speed_changed` provient d'un simulateur, d'une trace enregistrée ou d'un adaptateur CAN.

## Démo publique

La façon la plus simple d'essayer RADOME est :

**https://gotoo77.github.io/RADOME/**

Le site publie le vrai client situé dans `radome-2026/clients/dashboard/` ainsi que son SDK. Le mode simulation fonctionne entièrement dans le navigateur et le replay d'un fichier JSON reste local au navigateur.

## Démo live complète

Pour exercer le vrai serveur Rust et le vrai client JavaScript ensemble :

```bash
cd radome-2026
bash scripts/run-live-demo.sh
```

Puis ouvrir :

```text
http://127.0.0.1:8000/dashboard/
```

Le script lance le serveur RADOME sur `ws://127.0.0.1:8787` et sert le cockpit en HTTP local. Le client effectue automatiquement :

```text
hello → discovery → capability_announce → state_snapshot → connected
```

Les commandes Media Player et Climate Control sont activées uniquement si elles ont réellement été découvertes. Les changements affichés proviennent ensuite de l'état observé côté serveur, pas d'une mutation optimiste du navigateur.

Le mode diagnostic est disponible séparément :

```text
http://127.0.0.1:8000/dashboard/?diagnostic
```

La procédure complète, y compris reconnexion et resynchronisation, est documentée dans `radome-2026/docs/m6-end-to-end-demo.md`.

## Mode live manuel

Le serveur RADOME écoute par défaut sur :

```text
ws://127.0.0.1:8787
```

Dans un premier terminal :

```bash
cd radome-2026
cargo run -p radome-server
```

Dans un second :

```bash
cd radome-2026/clients
python3 -m http.server 8000
```

Le dashboard utilise l'adresse WebSocket par défaut hors mode démo. Une autre URL peut être fournie avec le paramètre `ws`.

## Contrat de télémétrie

Les événements véhicule actuellement définis sont notamment :

```text
vehicle.speed_changed       speed_kmh=<u16>
vehicle.engine_rpm_changed  engine_rpm=<u16>
```

Le cœur Rust construit et décode ces événements via un type `TelemetryEvent`. Le dashboard applique le même contrat : noms, clés et valeurs sont validés plutôt que devinés ou convertis implicitement.

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
node --test clients/dashboard/*.test.mjs
node --test clients/sdk/*.test.mjs
```

La CI ajoute un E2E Linux qui construit le vrai `radome-server`, connecte le SDK JavaScript, reçoit la télémétrie, exécute des commandes média et climat, force une reconnexion puis vérifie la resynchronisation par snapshot.

## Structure

```text
RADOME/
├── radome-2026/
│   ├── crates/
│   │   ├── radome-core/       # domaine, runtime, télémétrie
│   │   └── radome-server/     # serveur WebSocket, actionneurs, SocketCAN
│   ├── clients/
│   │   ├── dashboard/         # cockpit web, démo, record/replay
│   │   └── sdk/               # client JavaScript du protocole RADOME
│   ├── docs/
│   └── scripts/
├── site/                      # façade publique GitHub Pages
└── README.md
```

## Direction

Après les fondations protocole, le bus véhicule et le premier cockpit complet, la suite vise surtout le **durcissement d'exploitation** : configuration externe, observabilité structurée, limites de ressources, shutdown propre, charge, packaging Linux et évolution du protocole au-delà de V1.

RADOME avance volontairement par tranches courtes : chaque nouvelle source ou fonctionnalité doit préserver le même principe — **le matériel produit des faits ; le protocole les transporte ; les consommateurs restent découplés de leur origine.**
