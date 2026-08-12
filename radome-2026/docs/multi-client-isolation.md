# Isolation multi-clients

Cette tranche clôt M4 en définissant ce qui est isolé par connexion/session et ce qui reste volontairement partagé au niveau du système RADOME.

## Invariants

Chaque connexion WebSocket possède sa propre `session_id`. Une requête envoyée sur une connexion avec la `session_id` d'une autre connexion est refusée avec `invalid_session`.

Les réponses synchrones d'une commande (`CommandResult` puis événement causal) sont émises uniquement sur la connexion qui a envoyé la commande. Elles conservent la `session_id` de cette connexion et leur `correlation_id` pointe vers l'identifiant de la commande.

Le cache d'idempotence est local à la session. Deux clients peuvent donc employer le même identifiant de commande sans collision : ce sont deux espaces d'idempotence distincts.

La télémétrie n'est pas diffusée indistinctement à toutes les sockets. Elle passe par le runtime puis le hub et n'est livrée qu'aux clients éligibles à l'expérience concernée selon leur rôle et leurs capabilities annoncées.

## État partagé versus contexte isolé

L'isolation de session ne signifie pas que chaque client possède une copie privée de l'état du véhicule.

Les actionneurs représentent l'état global du système. Si un client fait passer la piste média de 0 à 1 puis un autre de 1 à 2, un snapshot demandé ensuite par chacun observe `track_index = 2`.

Ce qui est isolé :

- identité de session ;
- validation de la session de chaque requête ;
- cache d'idempotence ;
- résultats et événements causaux d'une commande ;
- eligibility de routage des événements asynchrones.

Ce qui est partagé :

- état réel des actionneurs ;
- télémétrie véhicule source ;
- catalogue de commandes et capabilities du serveur.

## Scénario E2E verrouillé

Le test `multi_client_isolation.rs` lance le vrai binaire `radome-server` et connecte simultanément deux clients :

- un client média, avec `media.control` ;
- un client média + display, avec `media.control` et `display`.

Il vérifie :

1. des `session_id` distinctes ;
2. le refus d'une commande portant la session de l'autre client ;
3. la réutilisation du même identifiant de commande dans deux sessions sans conflit d'idempotence ;
4. des événements de commande portant chacun la session de leur origine ;
5. l'absence de fuite des réponses de commande vers l'autre socket ;
6. la livraison de télémétrie au client éligible `display` et son absence chez le client non éligible ;
7. des snapshots propres à chaque session mais décrivant le même état système réellement partagé.

Ce test donne la frontière attendue avant de passer au bus véhicule réel : plusieurs clients peuvent coexister sans mélanger leur contexte protocolaire, tout en observant et pilotant un même système physique.