# Ordering du protocole RADOME

Ce document fixe les garanties d'ordre observables par un client sur **une même connexion WebSocket**.

## Garanties

RADOME traite les messages entrants d'une connexion dans leur ordre de réception.

Pour une commande acceptée, les messages produits directement par cette commande sont émis dans cet ordre :

1. `CommandResult` ;
2. `Event` causé par la commande.

Les deux messages portent la même `session_id` et leur `correlation_id` référence l'identifiant de la commande d'origine.

Si le client envoie ensuite un `StateSnapshotRequest` sur la même connexion, le `StateSnapshot` correspondant est émis après les messages produits par les requêtes précédentes. Le snapshot observe donc l'état obtenu après les commandes déjà traitées.

Exemple :

```text
client -> Command(cmd-1: media.play)
client -> StateSnapshotRequest(snapshot-1)

server -> CommandResult(correlation_id=cmd-1)
server -> Event(correlation_id=cmd-1, playback=playing)
server -> StateSnapshot(correlation_id=snapshot-1, playback=playing)
```

Le client n'est pas obligé d'attendre le `CommandResult` avant d'envoyer la requête suivante pour bénéficier de cette garantie.

## Événements asynchrones

Les événements provenant d'autres producteurs, par exemple la télémétrie véhicule, utilisent le même flux de sortie. Ils peuvent donc apparaître entre deux messages liés à des requêtes client.

RADOME ne garantit **pas** que `CommandResult` et son `Event` soient physiquement adjacents à tous les autres événements du système. La causalité doit être reconstruite avec `correlation_id`, et le contexte avec `session_id`.

En revanche, un événement asynchrone ne change pas l'ordre causal des réponses générées par la connexion elle-même : un `StateSnapshot` demandé après une commande ne devance pas le `CommandResult` ou l'`Event` issus de cette commande.

## Hors garantie

Cette tranche ne définit pas :

- un ordre global entre plusieurs connexions WebSocket ;
- un numéro de séquence global des événements ;
- une reprise d'ordre après reconnexion ;
- une livraison exactly-once.

Ces propriétés relèvent des tranches suivantes de M4 : idempotence, reconnexion et resynchronisation.

## Test de contrat

Le test `command_result_event_and_later_snapshot_keep_request_order` envoie volontairement une commande puis une requête de snapshot **sans attendre les réponses intermédiaires**. Il verrouille la séquence :

```text
CommandResult -> Event -> StateSnapshot
```

ainsi que la cohérence de l'état observé par le snapshot.
