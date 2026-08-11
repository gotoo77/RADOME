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
| M6 | Premier client RADOME réel | ⏳ À venir |
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

- [ ] **Contexte de session des événements de commande** : un événement produit à la suite d'une commande WebSocket conserve la `session_id` de la commande d'origine ;
- [ ] **Causalité explicite des événements issus de commande** : décider et documenter si l'événement doit également porter la corrélation vers la commande causale ;
- [ ] **Erreurs protocolaires stables** : remplacer les chaînes ad hoc par un contrat d'erreur explicite et testable ;
- [ ] **Ordering** : définir ce que le serveur garantit pour `CommandResult`, `Event` et `StateSnapshot` sur une connexion ;
- [ ] **Idempotence des commandes** : empêcher qu'une retransmission involontaire d'une même commande produise deux actuations ;
- [ ] **Reconnexion** : définir l'identité client/session lors d'une reconnexion ;
- [ ] **Resynchronisation** : garantir un chemin simple `reconnect → snapshot → reprise` ;
- [ ] **Tests multi-clients** : vérifier isolation de session, routage et absence de fuite de contexte entre clients.

### Critère de sortie

Un client peut perdre puis rétablir sa connexion, récupérer un état cohérent et reprendre sans double exécution ni ambiguïté de causalité ou de session.

### Prochaine tranche

`feature/event-session-context`

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

## M6 — Premier client RADOME réel ⏳

### Objectif

Valider que le protocole est réellement consommable par une application indépendante.

### Cible minimale

Un dashboard simple capable de :

- se connecter au serveur ;
- effectuer le bootstrap dynamique ;
- afficher la discovery ;
- afficher le snapshot courant ;
- recevoir la télémétrie ;
- piloter le climat ;
- piloter le lecteur média ;
- se resynchroniser après reconnexion.

### Contraintes

- aucun catalogue de commandes serveur dupliqué côté client ;
- UI découplée du transport ;
- état local dérivé du snapshot puis des événements ;
- erreurs visibles et compréhensibles.

### Critère de sortie

Une application distincte du serveur peut fonctionner à partir du seul protocole public et survivre à une reconnexion.

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

## Règle pour le prochain `next`

Quand une tranche est mergée :

1. regarder la milestone active dans ce fichier ;
2. prendre la prochaine tranche non cochée qui réduit le plus le risque de la milestone ;
3. créer une branche dédiée ;
4. livrer le plus petit vertical slice testable ;
5. mettre cette roadmap à jour lorsque l'état d'une milestone change.
