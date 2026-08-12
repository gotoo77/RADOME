# M5 — Récupération après perte d'interface SocketCAN

## Problème

Avant cette tranche, le worker SocketCAN ouvrait l'interface une seule fois. Une erreur de lecture arrêtait définitivement la boucle de télémétrie. Une interface absente au démarrage empêchait également le démarrage de la source SocketCAN.

Ce comportement n'est pas acceptable pour un service embarqué : une interface CAN peut apparaître après le processus, être réinitialisée par le noyau ou le driver, puis redevenir disponible.

## Contrat retenu

La source physique est désormais encapsulée par `ReconnectingVehicleSource`.

Son comportement est volontairement simple :

1. aucune ouverture physique n'est faite à la construction ;
2. le premier `recv()` tente d'ouvrir la source ;
3. une trame valide garde la même source ouverte ;
4. une erreur de transport rend la source courante invalide ;
5. le `recv()` suivant retente une ouverture ;
6. le worker attend un délai configuré avant ce nouvel essai.

Une erreur `InvalidData`, `Interrupted` ou `WouldBlock` ne provoque pas de réouverture du socket : ce ne sont pas des preuves suffisantes d'une perte d'interface.

## Configuration

La source reste sélectionnée avec :

```text
RADOME_TELEMETRY_SOURCE=socketcan
RADOME_CAN_INTERFACE=can0
```

Le délai entre deux tentatives après une perte de source est configurable :

```text
RADOME_CAN_RETRY_MS=1000
```

La valeur par défaut est `1000 ms`. `0` et les valeurs non numériques sont rejetées comme erreurs de configuration.

## Conséquences

Le serveur peut maintenant démarrer alors que l'interface CAN n'existe pas encore. La télémétrie reste indisponible, mais le serveur WebSocket et les autres fonctions continuent de vivre. Dès que l'interface devient ouvrable, le prochain cycle de retry reprend automatiquement le pipeline.

De même, une erreur de transport en cours d'exécution ne tue plus définitivement la télémétrie : le socket courant est abandonné et sera recréé.

## Tests sans matériel

Les tests unitaires couvrent trois invariants :

- une erreur `NotConnected` force une seconde ouverture avant la trame suivante ;
- une interface absente au premier essai peut apparaître au second ;
- une trame `InvalidData` ne jette pas inutilement un socket encore utilisable.

La validation `vcan` introduite dans la tranche précédente continue de vérifier le vrai chemin Linux SocketCAN.

## Limite actuelle

Cette tranche définit la récupération du transport, pas encore un état métier explicite « télémétrie disponible / indisponible » envoyé aux clients. Ce sujet pourra être ajouté lorsque l'IHM véhicule aura besoin d'afficher un état dégradé précis.
