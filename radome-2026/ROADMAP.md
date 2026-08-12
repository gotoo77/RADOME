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
| M4 | Robustesse et cohérence du protocole | ✅ Terminé |
| M5 | Bus véhicule réel | ✅ Terminé côté logiciel |
| M6 | Premier client RADOME réel et IHM véhicule | ✅ Terminé |
| M7 | Durcissement et exploitation | 🚧 En cours |

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

## M4 — Robustesse et cohérence du protocole ✅

### Objectif

Passer d'un protocole fonctionnel à un protocole dont les invariants sont suffisamment stricts pour supporter reconnexions, reprise d'état et clients multiples sans ambiguïté.

### Tranches réalisées

- [x] **Contexte de session des événements de commande** : un événement produit à la suite d'une commande WebSocket conserve la `session_id` de la commande d'origine ;
- [x] **Causalité explicite des événements issus de commande** : l'événement porte la corrélation vers la commande causale ;
- [x] **Erreurs protocolaires stables** : les erreurs utilisent un contrat explicite et testable ;
- [x] **Ordering** : l'ordre garanti pour `CommandResult`, `Event` et `StateSnapshot` sur une connexion est documenté et testé ;
- [x] **Idempotence des commandes** : une retransmission exacte d'une commande dans la même session rejoue les mêmes réponses sans seconde actuation ; une réutilisation conflictuelle d'un ID est refusée ;
- [x] **Reconnexion** : le `client_id` logique peut être réutilisé mais chaque nouvelle connexion obtient une nouvelle `session_id`, réannonce ses capabilities et conserve l'état serveur ;
- [x] **Resynchronisation** : le workflow canonique refait le bootstrap puis utilise le snapshot comme barrière de vérité avant de reprendre événements et commandes ;
- [x] **Tests multi-clients** : isolation des sessions, caches d'idempotence distincts, absence de fuite des réponses de commande et routage de télémétrie selon l'éligibilité sont couverts en E2E.

### Critère de sortie

Un client peut perdre puis rétablir sa connexion, récupérer un état cohérent et reprendre sans double exécution ni ambiguïté de causalité ou de session. Plusieurs clients peuvent coexister en conservant chacun leur contexte protocolaire tout en observant le même état système partagé.

**État : atteint.**

---

## M5 — Bus véhicule réel ✅

### Objectif

Brancher RADOME sur une vraie source véhicule Linux sans contaminer le domaine par les détails matériels.

### Tranches réalisées

- [x] implémentation réelle de `VehicleFrameSource` via SocketCAN ;
- [x] configuration de l'interface CAN ;
- [x] lecture bloquante isolée hors du runtime async et conversion vers `VehicleBusFrame` ;
- [x] gestion des erreurs et récupération après perte ou indisponibilité d'interface ;
- [x] mapping configurable des IDs/trames vers les événements de domaine ;
- [x] tests sans hardware via source simulée ;
- [x] validation automatisée sur interface noyau `vcan` en CI ;
- [ ] validation optionnelle sur matériel CAN physique réel.

### Critère de sortie

Le même pipeline de domaine fonctionne avec une source simulée, `vcan` et une interface SocketCAN Linux sans changement du runtime ou des consommateurs. Le mapping CAN peut être fourni par configuration externe et une disparition de l'interface ne tue pas le service.

**État : atteint côté logiciel.** La validation sur contrôleur CAN physique, câblage et bus réel reste une validation optionnelle de déploiement et ne bloque pas M6.

### Hors périmètre immédiat

Le support LIN réel reste différé : l'adapter de démonstration existe, mais le chantier matériel LIN n'est pas prioritaire tant que le premier client RADOME n'a pas validé l'expérience de bout en bout.

---

## M6 — Premier client RADOME réel et IHM véhicule ✅

### Objectif

Valider le protocole avec une vraie application indépendante **et produire une IHM qui ressemble à un système embarqué utilisable**, pas à un panneau de debug WebSocket.

Le premier client doit servir à la fois de démonstrateur du protocole et de première incarnation visuelle de RADOME.

### Tranches réalisées

- [x] **M6.1 — Shell client et bootstrap dynamique**
  - connexion/déconnexion et reconnexion automatique ;
  - `hello → discovery → capability_announce → state_snapshot` ;
  - état de connexion visible ;
  - aucun catalogue de commandes serveur dupliqué côté client ;
  - sélection dynamique des capabilities proposées par le serveur ;
  - snapshot comme barrière de vérité et tampon des événements reçus pendant la synchronisation ;
  - aucune retransmission automatique d'une commande au résultat ambigu ;
  - resynchronisation complète après reconnexion.

- [x] **M6.2 — Vehicle Info Display**
  - vue véhicule dédiée et visuellement prioritaire ;
  - vitesse clairement lisible ;
  - régime moteur / RPM ;
  - jauges animées à partir des événements reçus ;
  - état initial explicitement inconnu tant qu'aucune télémétrie n'existe ;
  - états `waiting`, `live`, `stale` et `offline` ;
  - perte de télémétrie détectée par fraîcheur temporelle ;
  - présentation responsive pensée pour une lecture rapide de type écran embarqué, sans JSON brut.

- [x] **M6.3 — Media Player**
  - composant visuel dédié et tactile ;
  - lecture / pause ;
  - précédent / suivant ;
  - volume + / - ;
  - réglage direct du volume de 0 à 100 ;
  - état de lecture, volume et index de piste synchronisés depuis snapshot + événements ;
  - contrôles activés uniquement pour les commandes réellement découvertes ;
  - retour visuel immédiat sur les commandes en attente, réussies ou refusées ;
  - aucune mutation optimiste de l'état réel : l'événement d'actionneur réconcilie l'UI ;
  - identité visuelle cohérente avec le Vehicle Info Display.

- [x] **M6.4 — Climate Control**
  - température courante issue du snapshot puis réconciliée par événement ;
  - consigne tactile de `16 à 30 °C`, par pas de `0,5 °C` ;
  - activation uniquement si `climate.set_temperature` est réellement découvert ;
  - validation autoritaire par le serveur ;
  - aucune mutation optimiste de la température observée ;
  - feedback local `pending / succeeded / failed` ;
  - cohérence graphique avec les autres modules de l'IHM.

- [x] **M6.5 — Composition de l'écran RADOME**
  - Vehicle Info Display conservé comme zone visuelle prioritaire ;
  - Media Player et Climate Control regroupés dans une zone opérationnelle secondaire ;
  - composition responsive desktop, écran embarqué étroit et mobile ;
  - projection explicite des phases réseau en états `connecting`, `online`, `degraded`, `offline` et `error` ;
  - aucune information protocolaire interne affichée dans le cockpit normal ;
  - panneau diagnostic fermé par défaut avec session, discovery, dernier événement, dernière erreur, enregistrement et replay ;
  - modes live, demo et replay partageant la même composition visuelle.

- [x] **M6.6 — Boucle UX complète et démonstration**
  - lancement serveur + client reproductible via `scripts/run-live-demo.sh` ;
  - bootstrap sans configuration manuelle du catalogue ;
  - télémétrie réelle du serveur animant le Vehicle Info Display ;
  - commandes média et climat réellement exécutées par le SDK JavaScript ;
  - reconnexion suivie d'un nouveau bootstrap et d'une resynchronisation par snapshot ;
  - scénario live documenté et smoke test automatisé `radome-server ↔ RadomeClient` en CI Linux.

### Contraintes d'architecture

- UI découplée du transport WebSocket ;
- état local dérivé d'un snapshot puis réduit par les événements ;
- composants UI sans connaissance des envelopes réseau ;
- commandes disponibles dérivées de la discovery ;
- erreurs visibles et compréhensibles ;
- le mode normal ne doit pas ressembler à un outil développeur ;
- un éventuel mode diagnostic peut, lui, exposer le protocole brut.

### Direction UX

L'IHM vise une esthétique de **cockpit numérique / infotainment sobre et lisible**, avec deux zones particulièrement soignées :

1. **Vehicle Info Display** : priorité à la lecture instantanée des informations de conduite ;
2. **Media Player** : commandes tactiles évidentes et état du lecteur immédiatement perceptible.

### Critère de sortie

Une application distincte du serveur peut se bootstrapper depuis le protocole public, afficher une IHM véhicule cohérente, recevoir la télémétrie, piloter média et climat, puis survivre à une reconnexion sans perdre la cohérence de son état local.

**État : atteint.** Le scénario complet est documenté et la frontière serveur ↔ SDK client est exercée automatiquement en CI.

---

## M7 — Durcissement et exploitation 🚧

### Objectif

Rendre RADOME exploitable comme service de longue durée et préparer les extensions futures.

### Tranches prévues

- [x] **configuration externe** : modèle `ServerConfig`, fichier JSON via `RADOME_CONFIG`, valeurs par défaut, surcharge par variables d'environnement, validation avant démarrage et profil CAN relatif au fichier ;
- [x] **`tracing` structuré** : logs JSON sur stderr, niveaux filtrables via `RUST_LOG`, événements nommés pour démarrage/configuration/sources véhicule et erreurs SocketCAN, contrat validé par le smoke test live ;
- [x] **métriques essentielles** : jauge des clients actifs, compteurs d'enregistrements, commandes réussies/échouées, événements télémétriques, erreurs et reconnexions SocketCAN, publiés périodiquement via `metrics_snapshot` ;
- [x] **backpressure** : file WebSocket sortante bornée par connexion, pression bloquante pour les réponses causales, perte isolée des événements asynchrones d'un client lent et compteur `outbound_backpressure_drops_total` ;
- [ ] limites de ressources par connexion ;
- [ ] timeouts explicites ;
- [ ] stratégie de shutdown propre ;
- [ ] tests de charge ciblés ;
- [ ] packaging Linux ;
- [ ] documentation d'exploitation ;
- [ ] compatibilité/versionnement du protocole au-delà de V1.

### Critère de sortie

Le serveur peut être lancé, observé, arrêté et diagnostiqué proprement dans un environnement Linux réel, avec un comportement défini sous charge et en cas de défaillance réseau.

**État : en cours.** La prochaine tranche recommandée est **limites de ressources par connexion**.

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
