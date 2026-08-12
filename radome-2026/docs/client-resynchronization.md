# Resynchronisation client après reconnexion

La reconnexion ne tente pas de reprendre l'ancienne session. Une nouvelle connexion recommence avec une nouvelle `session_id`, puis reconstruit explicitement un état client fiable à partir du protocole public.

## Séquence canonique

Après une perte de transport, le client suit la séquence suivante :

```text
connexion WebSocket
  → hello
  → discovery
  → capability_announce
  → state_snapshot
  → état local remplacé par le snapshot
  → reprise des événements et des commandes
```

Le `client_id` peut rester identique : il représente l'application logique. La `session_id`, elle, change à chaque nouvelle connexion.

## Le snapshot est la barrière de resynchronisation

Le client ne tente pas de reconstruire ce qui s'est passé pendant la coupure à partir d'hypothèses locales. Le `StateSnapshot` reçu dans la nouvelle session devient la vérité de référence pour l'état courant exposé par le serveur.

Une fois le snapshot appliqué :

- les événements reçus dans la nouvelle session sont réduits au-dessus de cet état ;
- les commandes peuvent reprendre normalement ;
- un snapshot ultérieur doit rester cohérent avec les événements d'état produits après la reprise.

## Commandes en vol au moment de la coupure

Une commande dont le résultat n'a pas été reçu avant la perte de connexion est considérée comme **ambiguë** côté client.

Le cache d'idempotence actuel est volontairement scopé à la session. Le client ne doit donc pas retransmettre automatiquement, dans la nouvelle session, une commande simplement parce que son résultat a été perdu.

La stratégie sûre est :

1. établir la nouvelle session ;
2. récupérer le snapshot ;
3. déduire l'état réellement atteint ;
4. décider ensuite, au niveau métier, si une nouvelle commande est encore nécessaire.

Cela évite les doubles actuations et garde le protocole indépendant d'une politique métier de retry.

## Capabilities

Les capabilities ne sont pas héritées d'une ancienne session. Elles sont annoncées à nouveau après discovery, avant la reprise des commandes.

Le snapshot reste techniquement accessible après `hello`, mais le flux canonique refait le bootstrap complet afin de garder un client déterministe et compatible avec une évolution future du catalogue serveur.

## Garantie testée

Le test E2E de resynchronisation :

- modifie l'état média avant la coupure ;
- reconnecte le même `client_id` avec une nouvelle session ;
- refait discovery et capability announce ;
- récupère un snapshot contenant l'état conservé par le serveur ;
- exécute ensuite une nouvelle commande ;
- vérifie que l'événement et le snapshot suivant restent cohérents.

La resynchronisation est donc un **workflow client explicite**, construit avec les primitives existantes du protocole ; aucun message monolithique supplémentaire n'est nécessaire.
