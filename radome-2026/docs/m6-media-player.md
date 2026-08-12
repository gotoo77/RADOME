# M6.3 — Media Player

Cette tranche transforme le bloc média du dashboard en composant d'infotainment réellement piloté par RADOME.

## Source de vérité

Le lecteur ne déduit jamais son état à partir de l'intention de commande.

Au bootstrap, `StateSnapshot.media` initialise :

```json
{
  "playback": "paused",
  "volume": 50,
  "track_index": 0
}
```

Ensuite, chaque événement produit par une commande média contient de nouveau l'état observé de l'actionneur. Le client réduit cet état dans `InfotainmentState`.

Les événements concernés sont :

- `media.playback_started` ;
- `media.playback_paused` ;
- `media.playback_toggled` ;
- `media.next_track_requested` ;
- `media.previous_track_requested` ;
- `media.volume_up_requested` ;
- `media.volume_down_requested` ;
- `media.volume_changed`.

Les anciens événements de démonstration (`media.title_changed`, `media.artist_changed`, etc.) restent acceptés uniquement pour enrichir visuellement les scénarios demo/replay.

## Commandes

Le dashboard utilise exclusivement le catalogue retourné par `DiscoveryResult`. Un contrôle reste désactivé si la commande correspondante n'a pas été découverte.

La surface UI couvre :

- lecture / pause via `media.toggle_playback` ;
- piste précédente via `media.previous_track` ;
- piste suivante via `media.next_track` ;
- volume - via `media.volume_down` ;
- volume + via `media.volume_up` ;
- réglage direct 0..100 via `media.set_volume`.

Les méthodes `play()` et `pause()` restent également exposées par l'application pour les futurs composants qui voudront des boutons distincts.

## Feedback de commande

Une commande suit quatre états visuels :

```text
idle → pending → succeeded
              ↘ failed
```

`pending` et `succeeded` ne modifient pas optimistement le playback, le volume ou l'index de piste. Le `CommandResult` confirme uniquement l'acceptation de l'opération ; l'état média n'est réconcilié qu'à réception de l'événement contenant l'état réellement observé.

En cas de refus, ou si la connexion tombe avant que l'issue de la commande soit connue, le feedback passe en `failed` et conserve le détail fourni par le SDK.

## Ergonomie

Le composant est conçu comme une surface tactile d'infotainment :

- contrôles de transport de grande taille ;
- volume direct par slider et boutons +/- ;
- état lecture/pause visible sans ouvrir un panneau diagnostic ;
- volume et piste visibles en permanence ;
- commandes temporairement désactivées pendant une opération en cours ;
- identité graphique cohérente avec le Vehicle Info Display.

Le mode normal n'expose ni `Envelope`, ni `session_id`, ni JSON brut.

## Tests

Les tests Node couvrent :

- parsing et validation du `MediaState` serveur ;
- initialisation depuis snapshot ;
- réduction de tous les événements média issus des commandes ;
- absence de mutation optimiste pendant une commande ;
- feedback pending / succeeded / failed ;
- rendu du playback, du volume, de la piste et des libellés UI ;
- maintien de l'état observé en cas de refus.

## Suite

La tranche suivante est **M6.4 — Climate Control** : affichage de la température, réglage de consigne, feedback de commande et réconciliation depuis l'état réellement renvoyé par le serveur.
