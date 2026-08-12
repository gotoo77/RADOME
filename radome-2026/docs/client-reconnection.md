# Reconnexion d'un client RADOME

## Objectif

Définir sans ambiguïté ce qui survit à une perte de connexion et ce qui appartient à une session WebSocket donnée.

## Identités

RADOME distingue deux identités :

- `client_id` identifie logiquement l'application cliente ; il peut être réutilisé après une coupure ;
- `session_id` identifie une connexion établie par `Hello` ; il est éphémère et n'est jamais réutilisé après reconnexion.

Une reconnexion du même `client_id` crée donc toujours une nouvelle `session_id`.

## Conséquences

La nouvelle connexion est une nouvelle session protocolaire :

1. le client renvoie `Hello` avec le même `client_id` ;
2. le serveur attribue une nouvelle `session_id` ;
3. toute enveloppe portant l'ancienne `session_id` est refusée avec `invalid_session` ;
4. les capabilities annoncées dans l'ancienne session ne sont pas héritées ; le client doit refaire `CapabilityAnnounce` avant d'envoyer des commandes ;
5. l'état des actionneurs appartient au serveur et n'est pas remis à zéro par la perte d'une connexion.

## Idempotence et reconnexion

Le cache d'idempotence des commandes reste volontairement limité à une session.

Cela signifie qu'après une coupure le client **ne doit pas retransmettre aveuglément une commande dont le résultat est devenu ambigu** : la nouvelle session ne peut pas savoir si cette commande a déjà été exécutée avant la rupture.

La stratégie RADOME est donc :

`reconnect → nouvelle session → resynchronisation de l'état → reprise`

et non :

`reconnect → replay aveugle des commandes en vol`.

La tranche suivante formalise précisément la resynchronisation par snapshot.

## Invariants testés

Le test E2E de reconnexion vérifie qu'un même `client_id` :

- reçoit une nouvelle `session_id` après reconnexion ;
- ne peut plus utiliser l'ancienne session ;
- doit annoncer de nouveau ses capabilities avant toute commande ;
- retrouve néanmoins l'état serveur produit avant la coupure.
