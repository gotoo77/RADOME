# M5 — État initial SocketCAN

Cette note compare la roadmap M5 avec le code déjà présent au moment où M4 est clôturée.

Le but est d'éviter de réimplémenter une intégration CAN qui existe déjà partiellement.

## Déjà présent

### Source Linux réelle

`SocketCanSource` implémente `VehicleFrameSource` sur Linux à partir d'un socket `PF_CAN / SOCK_RAW / CAN_RAW`.

La source :

- résout l'interface avec `if_nametoindex` ;
- bind le socket sur l'interface demandée ;
- lit une `can_frame` Linux ;
- refuse les trames RTR et error ;
- distingue identifiants standards et étendus ;
- convertit la trame en `VehicleBusFrame` sans exposer SocketCAN au domaine.

### Configuration de l'interface

Le serveur sélectionne la source avec :

- `RADOME_TELEMETRY_SOURCE=socketcan` ;
- `RADOME_CAN_INTERFACE=<interface>`, avec `can0` par défaut.

### Intégration au runtime Tokio

La lecture SocketCAN est bloquante mais isolée dans `tokio::task::spawn_blocking`, donc elle ne bloque pas les workers async du serveur.

### Mapping métier existant

`DemoCanAdapter` transforme déjà :

- `0x100` + `u16` big-endian → `vehicle.speed_changed` ;
- `0x101` + `u16` big-endian → `vehicle.engine_rpm_changed`.

Ce mapping est volontairement fictif et n'est pas encore configurable.

## Tranche ajoutée ici : pipeline source testable

Le chemin réel est désormais factorisé en une opération unique :

`VehicleFrameSource::recv → VehicleBusAdapter::decode → Runtime → Hub`

La même fonction est appelée par SocketCAN et par une source simulée de test.

Le test sans matériel prouve qu'une trame fournie par une `FakeSource` devient bien un événement WebSocket éligible via exactement le même pipeline que la source Linux.

Les erreurs de lecture de source sont également distinguées des erreurs de décodage :

- erreur `Read` : perte/erreur de source physique ;
- erreur `Decode` : trame reçue mais non décodable par le profil courant.

Le comportement actuel reste volontairement simple : une erreur de décodage ignore la trame et continue, tandis qu'une erreur de lecture arrête la boucle SocketCAN.

## Ce qui reste réellement à faire dans M5

1. valider la source Linux sur une interface `vcan` ;
2. définir la politique de perte puis récupération de l'interface CAN ;
3. rendre le mapping CAN configurable sans contaminer le domaine ;
4. valider optionnellement le même chemin sur matériel CAN réel.

## Prochaine tranche recommandée

`feature/m5-vcan-validation`

Elle doit vérifier le chemin réel Linux sans matériel automobile :

`vcan → SocketCanSource → VehicleBusFrame → DemoCanAdapter → Runtime → WebSocket`

Ce test est plus utile avant de rendre le mapping configurable : il valide d'abord que la frontière avec le noyau Linux fonctionne effectivement telle qu'elle est écrite.
