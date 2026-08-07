# Audit RADOME — restauration 2026

> Statut : audit initial terminé. Ce document distingue les faits observés dans le dépôt des orientations retenues pour RADOME 2026.

## 1. Intention

RADOME est un prototype historique d'interface distribuée pour systèmes embarqués et multi-écrans. Le dépôt contient un client Web et un serveur C communiquant par WebSocket et JSON.

Le chantier 2026 vise à :

1. comprendre suffisamment RADOME 2015 pour préserver ses idées utiles ;
2. documenter son protocole et ses défauts ;
3. séparer les concepts métier de ses choix techniques historiques ;
4. concevoir un RADOME moderne, portable et testable ;
5. conserver le legacy comme archive de référence, sans obligation de maintenance.

## 2. Décision sur le legacy C

Le serveur C 2015 est désormais considéré comme une **archive documentaire et comportementale**, pas comme une implémentation à maintenir.

Il n'existe aucune exigence de :

- le porter vers Linux/macOS ;
- maintenir ses anciennes dépendances ;
- corriger tous ses bugs ;
- conserver sa compatibilité binaire ;
- l'intégrer au runtime RADOME 2026.

Une tentative ponctuelle de compilation/exécution reste acceptable uniquement si elle apporte rapidement une information utile ou une trace de protocole. Elle doit être abandonnée dès que son coût devient disproportionné.

Le code C reste précieux pour comprendre le prototype ; il ne doit pas dicter l'architecture moderne.

## 3. Photographie du dépôt historique

### Client

Le client historique est une application Web statique utilisant notamment JavaScript, AngularJS, jQuery, Bootstrap, WebSocket, des fonctions multimédia et une interface bilingue français/anglais.

`RADOME_Main.js` concentre une grande quantité de responsabilités et plusieurs états globaux.

### Serveur

Le serveur historique est écrit en C. Le code RADOME principal se trouve dans `RADOME_Server_v2/RADOME_WebSocket/`, notamment :

- `RADOME_WebSocket.c` ;
- `RADOME_JSON.c` ;
- `RADOME_Functions.c` ;
- `RADOME_Utils.c` ;
- `RADOME_pthread.c` ;
- `RADOME_export.h`.

Le dépôt contient également `json-c`, une version historique de `libwebsockets`, du support pthread Windows et leurs artefacts/outils de build.

### Build et artefacts

Le dépôt mélange code RADOME, dépendances vendored, CMake, projets Visual Studio, sorties de build, binaires/bibliothèques Windows et tests de dépendances tierces.

Ce mélange sera conservé comme archive tant qu'une réorganisation du dépôt moderne n'aura pas clairement isolé le legacy.

## 4. Résultats principaux de l'archéologie

Le protocole legacy est documenté dans `LEGACY-PROTOCOL.md`.

Les principaux défauts observés sont recensés dans `LEGACY-DEFECTS.md`.

Points structurants :

- neuf WebSockets spécialisés (MAIN, CAN1…CAN5, VIDEO, AUDIO, NAV) ;
- commandes client → serveur principalement en texte brut ;
- réponses/flux serveur → client en JSON routé par `AppID` ;
- absence observée de versionnement protocolaire formel, corrélation générique, sessions et reconnexion ;
- état serveur global fortement couplé ;
- client Web fortement couplé à son UI et à ses WebSockets ;
- `CAN1`…`CAN5` sont des simulateurs de flux, pas une intégration CAN automobile validée.

## 5. Ce qui mérite d'être conservé

L'intérêt du prototype n'est pas son implémentation C/AngularJS mais plusieurs intuitions :

- UI/expérience distribuée sur plusieurs terminaux ;
- communication événementielle locale ;
- adaptation à plusieurs écrans ;
- séparation possible entre sources de données et présentation ;
- développement avec des sources matérielles simulées ;
- cible infotainment/embarqué local-first.

Ces idées sont reformulées dans `ARCHITECTURE-2026.md` et `CAPABILITIES.md`.

## 6. Cible RADOME 2026

RADOME 2026 est proposé comme un **runtime local-first d'expériences distribuées pour terminaux embarqués et multi-écrans**.

Les concepts minimaux sont :

- `Node` ;
- `Client` ;
- `Capability` ;
- `Adapter` ;
- `Experience` ;
- `Role` ;
- `Permission` ;
- `Session` ;
- `State` ;
- `Command` ;
- `Event`.

Le protocole, le core et les modèles ne doivent dépendre ni d'un OS, ni d'un framework UI, ni du matériel CAN, ni d'une bibliothèque WebSocket précise.

## 7. Langages et implémentations

Aucun langage ne fait partie de l'identité de RADOME.

Orientation actuelle :

- **Rust** : candidat privilégié pour le premier runtime moderne ;
- **Python** : simulateurs, outils, tests de conformité et prototypes ;
- **C++** : SDK/runtime uniquement lorsqu'un cas d'intégration réel le justifie ;
- **C legacy** : archive non maintenue.

Cette orientation reste falsifiable par le prototype : Rust n'est pas retenu parce qu'il est moderne, mais parce qu'il correspond bien aux contraintes réseau, concurrence, portabilité, embarqué Linux et binaire autonome.

## 8. Portabilité

La stratégie est détaillée dans `PORTABILITY-PLAN.md`.

Cibles modernes : Linux x86_64, Linux ARM64, Windows x64 et macOS ARM64.

Une plateforme n'est supportée que si elle compile et passe les tests/scénarios de conformité correspondants. La présence de branches `#ifdef` n'est pas une preuve de portabilité.

Cette exigence concerne RADOME 2026, **pas le serveur C legacy**.

## 9. Roadmap révisée

### R0 — Archéologie — terminée pour démarrer la suite

- architecture historique comprise à un niveau suffisant ;
- protocole legacy reconstruit statiquement ;
- défauts concrets recensés ;
- rôle des simulations CAN clarifié.

L'archéologie peut être enrichie plus tard, mais elle ne bloque plus le développement moderne.

### R1 — Modèle moderne — cadré

- architecture minimale ;
- capabilities/adapters ;
- local-first ;
- invariants ;
- V1 volontairement petite.

### R2 — Spike RADOME 2026

Créer un démonstrateur minimal :

- runtime local ;
- deux clients ;
- annonce de capabilities ;
- `vehicle.telemetry` simulée ;
- matching d'une expérience ;
- commande + résultat ;
- événements ;
- reconnexion simple ;
- traces structurées.

Le candidat initial pour le runtime est Rust.

### R3 — Protocole V1

À partir du spike :

- figer uniquement les concepts éprouvés ;
- définir l'enveloppe et le versionnement ;
- ajouter schémas et fixtures ;
- construire une suite de conformité indépendante.

### R4 — Portabilité et interopérabilité

- CI Linux/Windows/macOS ;
- ARM64 ;
- simulateurs/outils Python ;
- SDK C++ si besoin réel ;
- tests croisés entre implémentations.

### R5 — Infotainment réel

Seulement après validation du core :

- adapter CAN/CAN-FD/SocketCAN si pertinent ;
- navigation ;
- média ;
- rôles d'écrans ;
- sécurité renforcée ;
- intégration matérielle réelle.

## 10. Compatibilité legacy

RADOME 2026 n'a aucune obligation de reproduire les défauts ou la topologie à neuf sockets du legacy.

Si une compatibilité devient utile, elle sera réalisée en périphérie :

```text
legacy protocol
      ↓
LegacyAdapter
      ↓
RADOME 2026
```

Cette compatibilité ne doit jamais contaminer le modèle du core.

## 11. Conclusion de l'audit

RADOME 2015 a rempli son rôle de prototype : il matérialise plusieurs intuitions intéressantes mais son implémentation n'est pas une fondation adaptée à une maintenance moderne.

La stratégie retenue est donc **préserver les idées et les observations, pas le code par principe**.

La prochaine étape n'est plus de restaurer le serveur C. Elle est de construire un petit spike RADOME 2026 permettant de tester les frontières architecturales proposées avant de figer un nouveau protocole.
