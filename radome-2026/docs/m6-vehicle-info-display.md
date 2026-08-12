# M6.2 — Vehicle Info Display

Cette tranche donne au premier client RADOME une vraie zone de lecture véhicule, distincte du panneau d'infodivertissement et du diagnostic.

## Objectif

La vitesse et le régime moteur doivent être lisibles en un coup d'œil, tout en donnant une indication explicite sur la disponibilité de la télémétrie.

L'écran n'essaie pas encore d'imiter un combiné d'instrumentation constructeur. Il pose une hiérarchie visuelle sobre et exploitable qui pourra accueillir progressivement d'autres informations véhicule.

## Données affichées

Le Vehicle Info Display consomme les événements de domaine existants :

```text
vehicle.speed_changed      speed_kmh=<u16>
vehicle.engine_rpm_changed engine_rpm=<u16>
```

Le composant `VehicleState` reste responsable de la validation et de la réduction de ces événements en état local.

Le rendu présente :

- vitesse en valeur principale ;
- régime moteur en valeur secondaire ;
- progression visuelle de vitesse sur une échelle 0–240 km/h ;
- progression visuelle de régime sur une échelle 0–8000 tr/min ;
- transitions CSS sur les jauges pour éviter un affichage brutal entre deux trames.

Les bornes graphiques sont uniquement des bornes de présentation : les valeurs métier reçues ne sont pas tronquées dans `VehicleState`.

## État de télémétrie

`VehicleTelemetryHealth` distingue quatre états :

- `waiting` : connexion/bootstrap en cours ou aucune trame véhicule reçue ;
- `live` : une trame véhicule récente a été reçue ;
- `stale` : aucune nouvelle télémétrie depuis plus de 3 secondes ;
- `offline` : connexion RADOME perdue ou en reconnexion.

Le seuil de fraîcheur est configurable dans `createDashboardApp` via `vehicleTelemetryStaleAfterMs`.

Une reconnexion remet volontairement la fraîcheur à zéro. Après le nouveau bootstrap, le Vehicle Info Display repasse donc par `waiting` jusqu'à réception d'une nouvelle trame véhicule au lieu de présenter une ancienne mesure comme fraîche.

## Sources demo et replay

Le mode démo et le replay empruntent le même chemin d'application des événements que la télémétrie RADOME pour alimenter l'état de fraîcheur. Le Vehicle Info Display reste ainsi testable et démontrable sans serveur ni véhicule.

## Présentation

La zone véhicule devient la surface visuelle dominante du dashboard :

- vitesse fortement prioritaire ;
- RPM secondaire mais lisible ;
- jauges horizontales animées ;
- statut télémétrique compact ;
- état dégradé visible sans afficher de détails protocolaires ;
- layout responsive desktop / mobile.

Les outils d'enregistrement et de replay restent présents pour le moment. Leur séparation dans un mode diagnostic dédié appartient à M6.5.

## Tests

Les tests Node couvrent :

- les transitions `waiting → live → stale` ;
- le passage `offline` lors d'une reconnexion/déconnexion ;
- les phases de bootstrap ;
- le rendu des valeurs absentes ;
- la conversion vitesse/RPM en progression graphique ;
- le rendu des états de santé télémétrique.

## Limite de la tranche

Le snapshot serveur courant expose l'état média et climat, pas encore un dernier état de télémétrie véhicule persistant. Au démarrage, le Vehicle Info Display affiche donc explicitement des valeurs inconnues jusqu'à la première trame reçue.

Cette limite est volontairement visible plutôt que masquée par des valeurs fictives.
