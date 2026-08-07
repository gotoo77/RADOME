# Protocole RADOME legacy

> Document de rétro-ingénierie en cours. Ne pas considérer ce texte comme une spécification normative tant que les échanges n'ont pas été vérifiés par lecture croisée serveur/client puis par exécution du système historique.

## Objectif

Le protocole RADOME historique est actuellement implicite : sa définition est répartie entre le serveur C, le client JavaScript et quelques fichiers JSON d'exemple.

Ce document doit devenir la description indépendante du comportement observable de RADOME 2015.

## Sources autoritatives à analyser

Serveur :

- `RADOME_Server_v2/RADOME_WebSocket/RADOME_WebSocket.c`
- `RADOME_Server_v2/RADOME_WebSocket/RADOME_JSON.c`
- `RADOME_Server_v2/RADOME_WebSocket/RADOME_Functions.c`
- `RADOME_Server_v2/RADOME_WebSocket/RADOME_Utils.c`
- `RADOME_Server_v2/RADOME_WebSocket/Read_test.json`
- `RADOME_Server_v2/RADOME_WebSocket/Write_test.json`

Client :

- `RADOME_Client_v2/js/RADOME_Main.js`
- `RADOME_Client_v2/js/RADOME_Angular.js`
- `RADOME_Client_v2/js/RADOME_GUI_elements.js`

## Transport observé

Le transport historique est WebSocket. La bibliothèque utilisée côté serveur est une version vendored de libwebsockets.

À déterminer précisément :

- endpoint et port ;
- sous-protocole WebSocket éventuel ;
- encodage ;
- limites de taille ;
- comportement sur fragmentation ;
- politique de reconnexion ;
- TLS ou absence de TLS.

## Encodage applicatif

Les messages applicatifs sont JSON et le serveur embarque `json-c`.

La structure exacte des enveloppes reste à reconstruire.

## Catalogue des messages

À compléter après lecture exhaustive des fonctions de parsing et d'émission.

| Message | Direction | Déclencheur | Effet | Statut |
|---|---|---|---|---|
| informations de version serveur | serveur → client | connexion / demande | alimente l'UI avec release, date/heure de build et version libwebsockets | observé côté UI, forme JSON à confirmer |
| commandes RADOME | client → serveur | sélection/action utilisateur | déclenche une commande côté serveur | à reconstruire |
| données de démonstration | serveur → client | activité serveur | met à jour le modèle Angular/UI | à reconstruire |
| messages média | serveur → client / client → serveur | commande média | contrôle ou présente audio/vidéo | à reconstruire |

## Cycle de connexion

Hypothèse de travail à confirmer :

1. le client ouvre un WebSocket vers le serveur RADOME ;
2. le serveur accepte le client ;
3. des informations de serveur deviennent disponibles dans l'interface ;
4. le client peut émettre des commandes ;
5. le serveur diffuse des données/événements à un ou plusieurs clients ;
6. le client transforme ces messages en mises à jour de l'interface.

Questions ouvertes :

- existe-t-il un message `hello` explicite ?
- le client possède-t-il un identifiant ?
- le serveur distingue-t-il les clients autrement que par leur socket ?
- existe-t-il un état initial ou seulement un flux d'événements ?
- les commandes ont-elles des accusés de réception ?
- comment les erreurs sont-elles représentées ?

## Multi-client

Le nom et l'intention du projet indiquent explicitement un usage multi-client, mais les garanties exactes doivent être établies depuis le code.

À documenter :

- liste/registre des connexions ;
- broadcast ou ciblage ;
- partage d'état ;
- synchronisation ;
- comportement lorsqu'un client est lent ;
- nettoyage après déconnexion.

## Compatibilité

Le protocole historique ne semble pas encore disposer d'une négociation de version formelle. À confirmer.

Pour RADOME 2026, aucune évolution incompatible ne devra être appelée « protocole legacy ». Une nouvelle enveloppe/version sera définie séparément et un éventuel adaptateur assurera la compatibilité.

## Méthode de validation

Chaque message ajouté à ce document devra idéalement être accompagné de :

1. son origine dans le code serveur ;
2. son traitement dans le client ;
3. un exemple JSON réel ;
4. une fixture de test ;
5. à terme, une trace capturée sur le serveur historique.

Cette méthode doit empêcher de transformer des suppositions de restauration en comportement normatif par accident.
