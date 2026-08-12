# RADOME 2026 — Roadmap

Cette roadmap devient le document de pilotage canonique de `radome-2026`.

Le principe de progression est simple : avancer par **tranches verticales testables**, avec un critère de sortie explicite pour chaque milestone. Une milestone n'est considérée terminée que lorsque son comportement est couvert par les tests adaptés et intégré sur `master`.

## Vue d'ensemble

| Milestone | Objet | État |
|---|---|---|
| M0 | Fondations protocole et domaine | ✅ Terminé |
| M1 | Serveur temps réel et télémétrie | ✅ Terminé |
| M2 | Commandes et actionneurs | ✅ Terminé |
| M3 | Discovery, état et bootstrap dynamique | ✅ Terminé |
| M4 | Robustesse et cohérence du protocole | 🚧 En cours |
| M5 | Bus véhicule réel | ⏳ À venir |
| M6 | Premier client RADOME réel et IHM véhicule | ⏳ À venir |
| M7 | Durcissement et exploitation | ⏳ À venir |

---

## M0 — Fondations protocole et domaine ✅

### Objectif

Disposer d'un noyau déterministe, testable et indépendant du transport réseau.

### Réalisé

- `Envelope` versionné ;
- identifiant propre par message ;
- `correlation_id` ;
- `session_id` ;
- types de messages explicites ;
- `Capability`, `Role`, `Client`, `Experience` ;
- `SystemCapabilities` ;
- runtime d'enregistrement/désenregistrement des clients ;
- filtrage des livraisons selon capacités système, capacités client et rôle ;
- tests de round-trip JSON et de compatibilité de version.

### Critère de sortie

Le cœur peut déterminer, sans I/O, si un client est éligible à une expérience et transporter des messages versionnés et corrélables.

**État : atteint.**

---

## M1 — Serveur temps réel et télémétrie ✅

### Objectif

Faire circuler des événements de domaine jusqu'à de vrais clients WebSocket.

### Réalisé

- serveur WebSocket Tokio ;
- handshake `hello` ;
- sessions serveur ;
- annonce des capacités client ;
- hub de connexions ;
- enregistrement et nettoyage des clients ;
- télémétrie de démonstration déterministe ;
- pipeline télémétrie → runtime → hub → WebSocket ;
- abstraction `VehicleBusAdapter` ;
- adapters CAN/LIN de démonstration ;
- tests d'intégration du pipeline télémétrique.

### Critère de sortie

Un client connecté et éligible reçoit les événements de télémétrie produits par le système via le runtime commun.

**État : atteint.**

---

## M2 — Commandes et actionneurs ✅

### Objectif

Permettre le flux inverse : client → serveur → validation → actionneur → état résultant → événement.

### Réalisé

- registre central des commandes ;
- contrôle par capability avant exécution ;
- validation structurée des payloads ;
- `CommandResult` corrélé à la commande ;
- refus structurés ;
- abstraction d'actionneurs ;
- climat : `set_temperature` et état observable ;
- média : play, pause, toggle, next, previous, volume up/down/set ;
- états `ClimateState` et `MediaState` ;
- contrat commun `ActuatorState` ;
- événements construits depuis l'état réellement obtenu après actuation ;
- tests unitaires et WebSocket E2E.

### Critère de sortie

Une commande autorisée modifie l'état réel de l'actionneur, renvoie un résultat corrélé et produit un événement cohérent avec l'état observé.

**État : atteint.**

---

## M3 — Discovery, état et bootstrap dynamique ✅

### Objectif

Permettre à un client de devenir opérationnel sans catalogue serveur codé en dur.

### Réalisé

- discovery du catalogue des commandes ;
- discovery des capabilities requises ;
- `DiscoveryRequest` / `DiscoveryResult` ;
- `StateSnapshotRequest` / `StateSnapshot` ;
- snapshot global climat + média ;
- cohérence événement → snapshot testée ;
- bootstrap documenté :
  `hello → discovery → capability_announce → state_snapshot → opérationnel` ;
- test E2E où le client sélectionne ses capabilities à partir de la discovery avant d'exécuter une commande.

### Critère de sortie

Un client peut découvrir ce que le serveur propose, annoncer dynamiquement ce qu'il supporte, récupérer l'état courant puis utiliser une commande sans connaître le catalogue serveur à la compilation.

**État : atteint.**

---

## M4 — Robustesse et cohérence du protocole 🚧

### Objectif

Passer d'un protocole fonctionnel à un protocole dont les invariants sont suffisamment stricts pour supporter reconnexions, reprise d'état et clients multiples sans ambiguïté.

### Tranches prévues

- [x] **Contexte de session des événements de commande** : un événement produit à la suite d'une commande WebSocket conserve la `session_id` de la commande d'origine ;
- [x] **Causalité explicite des événements issus de commande** : l'événement porte la corrélation vers la commande causale ;
- [x] **Erreurs protocolaires stables** : les erreurs utilisent un contrat explicite et testable ;
- [x] **Ordering** : l'ordre garanti pour `CommandResult`, `Event` et `StateSnapshot` sur une connexion est documenté et testé ;
- [x] **Idempotence des commandes** : une retransmission exacte d'une commande dans la même session rejoue les mêmes réponses sans seconde actuation ; une réutilisation conflictuelle d'un ID est refusée ;
- [x] **Reconnexion** : le `client_id` logique peut être réutilisé mais chaque nouvelle connexion obtient une nouvelle `session_id`, réannonce ses capabilities et conserve l'état serveur ;
- [x] **Resynchronisation** : le workflow canonique refait le bootstrap puis utilise le snapshot comme barrière de vérité avant de reprendre événements et commandes ;
- [ ] **Tests multi-clients** : vérifier isolation de session, routage et absence de fuite de contexte entre clients.

### Critère de sortie

Un client peut perdre puis rétablir sa connexion, récupérer un état cohérent et reprendre sans double exécution ni ambiguïté de causalité ou de session.

### Prochaine tranche

`feature/multi-client-isolation`

---

## M5 — Bus véhicule réel ⏳

### Objectif

Brancher RADOME sur une vraie source véhicule Linux sans contaminer le domaine par les détails matériels.

### Tranches prévues

- [ ] implémentation réelle de `VehicleFrameSource` via SocketCAN ;
- [ ] configuration de l'interface CAN ;
- [ ] lecture asynchrone et conversion vers `VehicleBusFrame` ;
- [ ] gestion des erreurs et de la perte d'interface ;
- [ ] mapping configurable des IDs/trames vers les événements de domaine ;
- [ ] tests sans hardware via source simulée ;
- [ ] test manuel sur interface `vcan` ;
- [ ] validation optionnelle sur matériel CAN réel.

### Critère de sortie

Le même pipeline de domaine fonctionne avec une source simulée, `vcan` et une interface SocketCAN réelle, sans changement du runtime ou des consommateurs.

### Hors périmètre immédiat

Le support LIN réel reste différé : l'adapter de démonstration existe, mais le chantier matériel LIN n'est pas prioritaire tant que M5 CAN n'est pas stabilisé.

---

## M6 — Premier client RADOME réel et IHM véhicule ⏳

### Objectif

Valider le protocole avec une vraie application indépendante **et produire une IHM qui ressemble à un système embarqué utilisable**, pas à un panneau de debug WebSocket.

Le premier client doit servir à la fois de démonstrateur du protocole et de première incarnation visuelle de RADOME.

### Tranches prévues

- [ ] **M6.1 — Shell client et bootstrap dynamique**
  - connexion/déconnexion ;
  - `hello → discovery → capability_announce → state_snapshot` ;
  - état de connexion visible ;
  - aucun catalogue de commandes serveur dupliqué côté client ;
  - resynchronisation après reconnexion.

- [ ] **M6.2 — Vehicle Info Display**
  - vue véhicule dédiée ;
  - vitesse clairement lisible ;
  - régime moteur / RPM ;
  - autres télémétries disponibles exposées progressivement ;
  - indicateurs animés à partir des événements reçus ;
  - état initial issu du snapshot quand la donnée existe ;
  - comportement explicite en absence ou perte de télémétrie ;
  - présentation pensée pour une lecture rapide de type écran embarqué, pas pour afficher du JSON brut.

- [ ] **M6.3 — Media Player**
  - composant visuel dédié ;
  - play / pause ;
  - précédent / suivant ;
  - volume + / - ;
  - réglage direct du volume ;
  - état de lecture, volume et index de piste synchronisés depuis snapshot + événements ;
  - retour visuel immédiat sur les commandes en attente, réussies ou refusées ;
  - ergonomie tactile avec contrôles suffisamment grands ;
  - identité visuelle cohérente avec le Vehicle Info Display.

- [ ] **M6.4 — Climate Control**
  - température courante ;
  - réglage de consigne ;
  - validation par le serveur et affichage de l'état réellement obtenu ;
  - cohérence graphique avec les autres modules de l'IHM.

- [ ] **M6.5 — Composition de l'écran RADOME**
  - navigation ou composition claire entre véhicule, média et climat ;
  - layout responsive pour écran embarqué / navigateur desktop ;
  - hiérarchie visuelle cohérente ;
  - états connecté, reconnexion, dégradé et erreur ;
  - aucune information protocolaire interne imposée à l'utilisateur normal ;
  - possibilité d'un mode diagnostic séparé pour afficher discovery, session, événements et erreurs brutes.

- [ ] **M6.6 — Boucle UX complète et démonstration**
  - démarrage serveur + client documenté ;
  - bootstrap sans configuration manuelle du catalogue ;
  - télémétrie animant le Vehicle Info Display ;
  - commandes média et climat réellement exécutées ;
  - reconnexion suivie d'une resynchronisation visible ;
  - scénario de démonstration reproductible.

### Contraintes d'architecture

- UI découplée du transport WebSocket ;
- état local dérivé d'un snapshot puis réduit par les événements ;
- composants UI sans connaissance des envelopes réseau ;
- commandes disponibles dérivées de la discovery ;
- erreurs visibles et compréhensibles ;
- le mode normal ne doit pas ressembler à un outil développeur ;
- un éventuel mode diagnostic peut, lui, exposer le protocole brut.

### Direction UX

L'IHM doit viser une esthétique de **cockpit numérique / infotainment sobre et lisible**, avec deux zones particulièrement soignées :

1. **Vehicle Info Display** : priorité à la lecture instantanée des informations de conduite ;
2. **Media Player** : commandes tactiles évidentes et état du lecteur immédiatement perceptible.

L'objectif n'est pas de figer une DA définitive dès M6, mais la première version doit déjà être suffisamment propre pour donner envie de l'utiliser et de la montrer.

### Critère de sortie

Une application distincte du serveur peut se bootstrapper depuis le protocole public, afficher une IHM véhicule cohérente, recevoir la télémétrie, piloter média et climat, puis survivre à une reconnexion sans perdre la cohérence de son état local.

---

## M7 — Durcissement et exploitation ⏳

### Objectif

Rendre RADOME exploitable comme service de longue durée et préparer les extensions futures.

### Tranches prévues

- [ ] configuration externe ;
- [ ] `tracing` structuré ;
- [ ] métriques essentielles ;
- [ ] backpressure ;
- [ ] limites de ressources par connexion ;
- [ ] timeouts explicites ;
- [ ] stratégie de shutdown propre ;
- [ ] tests de charge ciblés ;
- [ ] packaging Linux ;
- [ ] documentation d'exploitation ;
- [ ] compatibilité/versionnement du protocole au-delà de V1.

### Critère de sortie

Le serveur peut être lancé, observé, arrêté et diagnostiqué proprement dans un environnement Linux réel, avec un comportement défini sous charge et en cas de défaillance réseau.

---

## Principes de pilotage

1. **Pas d'abstraction sans au moins deux cas réels.**
2. **Une tranche doit rester verticale** : protocole/domaine → serveur → test E2E quand cela s'applique.
3. **Le domaine ne dépend pas du matériel.** CAN, LIN ou autre restent des adapters.
4. **L'état observé fait foi.** Les événements d'actionneurs décrivent l'état réellement obtenu, pas seulement l'intention de commande.
5. **Discovery avant duplication.** Un client doit découvrir le serveur plutôt que recopier son catalogue.
6. **Snapshot + événements** constitue le modèle de synchronisation client.
7. **Une milestone possède un critère de sortie.** Une liste de commits n'est pas une définition de fini.
8. **L'IHM normale n'est pas un outil de debug.** Le protocole structure l'application mais ne doit pas polluer l'expérience utilisateur.

## Règle pour le prochain `next`

Quand une tranche est mergée :

1. regarder la milestone active dans ce fichier ;
2. prendre la prochaine tranche non cochée qui réduit le plus le risque de la milestone ;
3. créer une branche dédiée ;
4. livrer le plus petit vertical slice testable ;
5. mettre cette roadmap à jour lorsque l'état d'une milestone change.
