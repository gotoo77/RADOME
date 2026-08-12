# M7 — Backpressure des sorties WebSocket

Cette tranche supprime la dernière file de messages non bornée du chemin serveur → client.

## Risque traité

Avant cette tranche, chaque connexion possédait un `mpsc::unbounded_channel`. Un client qui cessait de lire son WebSocket pouvait donc laisser le serveur accumuler indéfiniment des enveloppes en mémoire, notamment sous un flux de télémétrie continu.

La vitesse de production n'était alors plus reliée à la vitesse réelle du consommateur.

## Politique retenue

Chaque connexion possède maintenant une file sortante Tokio **bornée à 128 enveloppes**.

Deux classes de messages ont volontairement des politiques différentes.

### Réponses protocolaires directes

Les réponses causales à une requête du client — `Hello`, discovery, snapshot, `CommandResult` et événement produit par une commande — utilisent `send().await`.

Si la file est pleine, la lecture de nouvelles requêtes de cette connexion attend qu'une place se libère. La pression remonte donc vers le client au lieu de créer de la mémoire sans limite.

L'ordre protocolaire reste inchangé.

### Événements asynchrones

Les événements poussés par le hub, principalement la télémétrie véhicule, utilisent `try_send`.

Si la file d'un client est pleine :

- l'événement destiné à **ce client uniquement** est abandonné ;
- les autres clients ne sont pas ralentis ;
- la connexion lente reste enregistrée ;
- le compteur `outbound_backpressure_drops_total` est incrémenté.

Ce choix est cohérent avec le modèle RADOME : le snapshot reste la barrière de vérité. Un client ayant perdu des événements transitoires peut se resynchroniser sans considérer sa copie locale comme autoritaire.

Une file fermée est différente d'une file pleine : dans ce cas, le hub retire le client fermé comme auparavant.

## Pourquoi ne pas bloquer tout le hub ?

Le pipeline de télémétrie peut alimenter plusieurs écrans. Faire attendre le producteur sur un seul consommateur lent transformerait un problème local en blocage global et pourrait même ralentir la lecture SocketCAN.

RADOME préfère donc l'isolation : **backpressure bloquante pour le dialogue causal d'une connexion, perte contrôlée pour son flux asynchrone**.

## Observabilité

Le snapshot périodique de métriques contient maintenant :

```text
outbound_backpressure_drops_total
```

Une valeur qui augmente indique qu'au moins un consommateur ne vide pas sa file assez vite.

## Validation

Les tests du hub couvrent explicitement le cas suivant avec une capacité de 1 :

1. le premier événement remplit la file ;
2. le deuxième est refusé sans supprimer le client ;
3. après consommation du premier, un nouvel événement peut de nouveau être livré.

Les tests WebSocket existants continuent de verrouiller l'ordre `CommandResult → Event → StateSnapshot` et la boucle E2E réelle continue de valider bootstrap, commandes et reconnexion.

## Limite volontaire

La capacité 128 est une politique serveur fixe dans cette tranche. Sa configuration externe ainsi que les autres plafonds par connexion (taille des messages, cache d'idempotence, nombre de connexions, etc.) appartiennent à la tranche suivante : **limites de ressources par connexion**.
