# Audit RADOME — restauration 2026

> Statut : audit initial. Ce document distingue volontairement les faits observés dans le dépôt des orientations proposées pour RADOME 2026.

## 1. Intention

RADOME est un prototype historique d'interface distribuée pour systèmes embarqués et multi-écrans. Le dépôt contient un client Web et un serveur C communiquant par WebSocket et JSON.

L'objectif de la restauration n'est pas de réécrire immédiatement le projet avec une pile moderne. Il est d'abord de :

1. comprendre le comportement de RADOME 2015 ;
2. isoler son protocole et ses concepts métier de ses choix techniques historiques ;
3. identifier les risques, bugs et dettes ;
4. définir une cible moderne permettant plusieurs implémentations (C++, Rust, Python, etc.) ;
5. préserver autant que possible un chemin de compatibilité et une implémentation legacy vérifiable.

## 2. Photographie du dépôt historique

### Client

Le client historique est une application Web statique relativement riche. Il contient notamment :

- HTML/CSS ;
- JavaScript ;
- AngularJS ;
- jQuery ;
- Bootstrap et plusieurs plugins ;
- une connexion WebSocket ;
- des fonctions de présentation de données et de médias ;
- une interface bilingue français/anglais.

Le fichier `RADOME_Main.js` concentre une quantité importante de responsabilités et devra faire l'objet d'une cartographie fonctionnelle détaillée.

### Serveur

Le serveur historique est écrit en C. Le code propre à RADOME est principalement regroupé dans `RADOME_Server_v2/RADOME_WebSocket/` :

- `RADOME_WebSocket.c` ;
- `RADOME_JSON.c` ;
- `RADOME_Functions.c` ;
- `RADOME_Utils.c` ;
- `RADOME_pthread.c` ;
- `RADOME_export.h`.

Le dépôt contient également les sources de dépendances tierces, notamment `json-c` et une version historique de `libwebsockets`, ainsi que du support pthread pour Windows.

### Build et artefacts

Le dépôt mélange actuellement :

- code RADOME ;
- dépendances vendored ;
- scripts et fichiers CMake ;
- projets Visual Studio ;
- sorties de build CMake/Visual Studio ;
- binaires et bibliothèques Windows ;
- code de test provenant des dépendances tierces.

Cette organisation rend difficile l'identification de la surface réellement maintenue par RADOME.

## 3. Dette immédiatement visible

### P0 — établir une base reproductible

Avant toute évolution fonctionnelle :

- déterminer si le serveur historique compile encore sur un environnement Linux moderne ;
- documenter précisément les dépendances et versions attendues ;
- identifier le point d'entrée et le cycle de vie du serveur ;
- reconstruire un scénario minimal serveur + client ;
- capturer les messages WebSocket réellement échangés.

### P1 — séparer code produit, dépendances et artefacts

Le dépôt embarque des arbres complets de dépendances et des sorties de compilation. À terme, il faudra :

- conserver l'état historique tant que la restauration n'est pas validée ;
- sortir les artefacts générés du suivi Git ;
- remplacer progressivement les copies de dépendances par une gestion explicite des dépendances ;
- distinguer clairement `legacy`, code maintenu, tests et documentation.

Cette opération ne doit pas précéder la reconstruction du build historique : supprimer les dépendances vendored trop tôt ferait perdre une partie de la reproductibilité du prototype.

### P1 — protocole implicite

Le protocole RADOME semble actuellement défini par l'implémentation C et JavaScript elle-même. Il manque une spécification indépendante décrivant :

- connexion et déconnexion ;
- structure des messages JSON ;
- commandes ;
- événements serveur ;
- erreurs ;
- identification éventuelle des clients ;
- règles de diffusion à plusieurs clients ;
- comportement en reconnexion ;
- compatibilité de versions.

L'extraction de cette spécification est un chantier prioritaire.

### P1 — responsabilités fortement couplées

Les premières observations indiquent que transport WebSocket, sérialisation JSON, logique RADOME et présentation Web sont étroitement liés. La restauration devra identifier les frontières permettant de séparer :

- modèle/protocole RADOME ;
- transport ;
- runtime serveur ;
- adaptateurs de plateformes ;
- clients et UI.

## 4. Hypothèse de cible RADOME 2026

Cette section est une proposition, pas une description du système historique.

RADOME pourrait devenir un runtime local-first pour expériences utilisateur distribuées sur plusieurs terminaux embarqués : véhicule, avion, tablette, écran intégré, navigateur ou application native.

Le noyau ne devrait pas dépendre d'un langage particulier.

Concepts candidats :

- `Node` : instance RADOME ;
- `Client` : terminal connecté ;
- `Capability` : capacités du terminal (affichage, tactile, audio, vidéo, etc.) ;
- `Role` : fonction du terminal dans une installation ;
- `Session` : contexte utilisateur ou applicatif ;
- `State` : état partagé ;
- `Command` : intention adressée au système ;
- `Event` : fait produit par le système ;
- `Resource` : média ou ressource disponible ;
- `Permission` : droits associés au client/rôle ;
- `Transport` : WebSocket en premier lieu, sans en faire nécessairement l'identité de RADOME.

## 5. Principe d'interopérabilité

À terme, RADOME devrait pouvoir disposer de plusieurs implémentations du même protocole :

- implémentation C historique ;
- implémentation C++ ;
- implémentation Rust ;
- implémentation Python de référence/prototypage ;
- client Web moderne.

La compatibilité doit être mesurée par une suite de conformité indépendante des implémentations.

Exemples de scénarios futurs :

- serveur Rust ↔ client Web ;
- serveur C++ ↔ client Python ;
- serveur Python ↔ client Rust ;
- serveur C legacy ↔ client de conformité.

## 6. Axes d'audit détaillé

### Serveur C

À examiner en priorité :

- ownership et durée de vie des buffers ;
- allocations/libérations ;
- tailles de buffers et copies de chaînes ;
- validation des entrées JSON ;
- gestion des erreurs ;
- concurrence et synchronisation pthread ;
- partage d'état entre clients ;
- callbacks libwebsockets ;
- fragmentation WebSocket ;
- déconnexion/reconnexion ;
- limites de taille des messages ;
- comportement sous clients lents ;
- sécurité réseau et TLS ;
- portabilité Linux/Windows/embarqué.

### Client Web

À examiner en priorité :

- cycle de vie WebSocket ;
- reconnexion ;
- parsing/validation des messages ;
- manipulation du DOM ;
- injections HTML éventuelles ;
- couplage AngularJS/jQuery ;
- gestion des erreurs ;
- état global ;
- fonctions média ;
- responsive/adaptation réelle aux terminaux.

### Protocole

À reconstruire à partir du code et des exemples JSON :

- catalogue exhaustif des messages ;
- direction client → serveur / serveur → client ;
- champs obligatoires/facultatifs ;
- sémantique de chaque message ;
- réponses et erreurs ;
- diffusion unicast/broadcast ;
- ordre des messages ;
- état initial ;
- comportement multi-client.

## 7. Roadmap de restauration

### R0 — Archéologie

- documenter l'arborescence ;
- lire le code RADOME propriétaire ;
- reconstruire le protocole legacy ;
- établir l'inventaire des dépendances ;
- identifier un scénario de démonstration minimal.

### R1 — Résurrection

- obtenir un build Linux reproductible ;
- exécuter le serveur legacy ;
- connecter un client minimal ;
- enregistrer des traces de protocole ;
- ajouter des smoke tests.

### R2 — Spécification

- formaliser `protocol/legacy` ;
- définir les invariants observés ;
- ajouter des fixtures JSON ;
- créer une première suite de conformité.

### R3 — Nettoyage

- isoler l'implémentation historique ;
- supprimer les artefacts générés de la branche moderne ;
- externaliser les dépendances ;
- réduire le build à ce qui appartient réellement à RADOME.

### R4 — RADOME 2026

- décider des concepts du nouveau protocole ;
- versionner explicitement le protocole ;
- négocier capacités et versions ;
- définir erreurs, sessions, rôles et sécurité ;
- choisir une première implémentation moderne de référence.

### R5 — Polyglotte

- C++ / Rust / Python selon les cas d'usage ;
- tests d'interopérabilité croisés ;
- client Web moderne ;
- exemples infotainment reproductibles.

## 8. Décisions volontairement reportées

L'audit ne décide pas encore :

- si WebSocket reste l'unique transport ;
- si JSON reste le format principal ;
- si le serveur moderne de référence sera écrit en Rust, C++ ou Python ;
- quel framework Web remplacera éventuellement AngularJS ;
- si l'implémentation C historique doit être maintenue à long terme.

Ces décisions doivent découler de l'analyse du comportement réel et des contraintes d'embarqué, pas d'une préférence technologique.

## 9. Prochaine tranche

La prochaine tranche doit produire `docs/LEGACY-PROTOCOL.md` à partir de `RADOME_JSON.c`, `RADOME_Functions.c`, `RADOME_WebSocket.c`, des fichiers `Read_test.json` / `Write_test.json` et du code JavaScript client.

En parallèle, elle doit dresser une liste de défauts concrets avec fichier, fonction, impact et priorité, plutôt qu'une liste générique de risques.
