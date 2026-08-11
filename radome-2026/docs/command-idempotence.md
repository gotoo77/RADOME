# Idempotence des commandes

## Objectif

Une retransmission réseau ne doit jamais provoquer une seconde actuation simplement parce qu'un client n'a pas reçu la première réponse.

Dans une session WebSocket RADOME, l'identifiant d'un message `Command` est donc aussi sa clé d'idempotence.

## Contrat

Pour une session donnée :

1. la première commande portant un `id` donné est traitée normalement ;
2. le serveur mémorise son payload et la séquence de réponses produite ;
3. si exactement le même `id` et le même payload sont reçus de nouveau, le serveur **ne réexécute pas l'actionneur** et rejoue les réponses déjà produites ;
4. si le même `id` est réutilisé avec un payload différent, le serveur refuse le message avec `MessageType::Error` et le code stable `message_id_conflict`.

Le rejeu conserve les mêmes envelopes de réponse, donc les mêmes `id`, `correlation_id`, `session_id` et payloads.

## Portée

Le cache d'idempotence est **scopé à la session courante** et disparaît avec la connexion.

Cette tranche protège donc les retransmissions dans une session active. La conservation d'une garantie équivalente au travers d'une reconnexion dépend du contrat d'identité/reprise de session et appartient à la tranche M4 suivante.

## Pourquoi ne pas seulement ignorer le doublon ?

Un client peut retransmettre précisément parce qu'il ignore si la première commande a été exécutée. Rejouer la réponse originale lui permet de retrouver le même résultat observable sans provoquer une seconde mutation.

## Invariant testable

Pour une commande `media.next_track` envoyée deux fois avec le même `id` :

- l'index de piste n'augmente qu'une fois ;
- le second échange rejoue le même `CommandResult` et le même `Event` ;
- un snapshot ultérieur observe toujours `track_index = 1` ;
- réutiliser cet `id` pour une autre commande produit `message_id_conflict` et ne modifie pas l'état.
