# M7 — Métriques essentielles

Cette tranche ajoute des métriques de processus minimales pour exploiter RADOME sur la durée, sans introduire immédiatement une dépendance Prometheus ou un second serveur HTTP.

## Contrat

Le serveur maintient des compteurs atomiques en mémoire et publie périodiquement un événement `tracing` JSON nommé `metrics_snapshot`.

Les champs exposés sont :

- `active_clients` : jauge des clients actuellement enregistrés dans le hub ;
- `client_registrations_total` : nombre cumulé d'enregistrements client ;
- `commands_total` : commandes passées à l'exécuteur ;
- `commands_succeeded_total` : commandes exécutées avec succès ;
- `commands_failed_total` : commandes refusées ou échouées ;
- `telemetry_events_total` : événements métier de télémétrie produits, indépendamment du nombre de destinataires ;
- `telemetry_errors_total` : erreurs de lecture ou décodage de la source SocketCAN ;
- `socketcan_reconnects_total` : pertes de source nécessitant une réouverture SocketCAN ;
- `outbound_backpressure_drops_total` : événements asynchrones abandonnés parce que la file sortante d'un client était pleine ;
- `connection_limit_rejections_total` : opérations refusées parce qu'une connexion a atteint un budget configuré.

Les compteurs `_total` sont monotones pendant la durée de vie du processus. `active_clients` est une jauge.

## Publication

Par défaut, un snapshot est écrit toutes les 30 secondes sur stderr via le même `tracing` JSON que les autres événements d'exploitation :

```json
{
  "fields": {
    "message": "metrics_snapshot",
    "active_clients": 1,
    "client_registrations_total": 2,
    "commands_total": 8,
    "commands_succeeded_total": 7,
    "commands_failed_total": 1,
    "telemetry_events_total": 42,
    "telemetry_errors_total": 0,
    "socketcan_reconnects_total": 0,
    "outbound_backpressure_drops_total": 0,
    "connection_limit_rejections_total": 0
  }
}
```

L'intervalle est configurable dans `server.json` :

```json
{
  "metrics_interval_ms": 30000
}
```

ou par variable d'environnement :

```bash
RADOME_METRICS_INTERVAL_MS=5000 cargo run -p radome-server
```

La priorité reste celle de la configuration M7 : valeurs par défaut, puis fichier, puis variables d'environnement.

## Sémantique

`telemetry_events_total` compte les faits métier produits par la source, pas les livraisons WebSocket. Un événement envoyé à trois écrans vaut donc un événement, pas trois.

`commands_total` est incrémenté au point d'entrée de `CommandExecutor`. Une commande inconnue, non autorisée, invalide ou rejetée par un actionneur augmente donc `commands_failed_total`.

`active_clients` suit le hub après annonce de capabilities. Une socket TCP ouverte mais non bootstrapée n'est pas considérée comme un client opérationnel.

`outbound_backpressure_drops_total` compte les pertes de diffusion asynchrone dues à un consommateur lent. Les réponses protocolaires directes ne sont pas abandonnées : elles attendent de la capacité dans la file bornée de leur connexion.

`connection_limit_rejections_total` compte les refus dus aux budgets de session, par exemple une annonce de capabilities trop grande ou un nouveau command ID alors que le cache d'idempotence est plein.

## Validation

Le smoke test live utilise un intervalle court de 50 ms et vérifie sur le vrai binaire que :

1. un client bootstrapé apparaît dans `active_clients` ;
2. les deux commandes média/climat augmentent les compteurs de commandes réussies ;
3. la télémétrie de démonstration augmente `telemetry_events_total` ;
4. la reconnexion du SDK provoque un nouvel enregistrement client.

La tranche backpressure ajoute en complément un test déterministe du hub qui remplit volontairement une file bornée et vérifie que seul l'événement excédentaire est abandonné. La tranche de limites par connexion teste les refus de budgets sans casser le replay idempotent des commandes déjà mémorisées.

## Hors périmètre

Cette couche de métriques ne fournit volontairement pas encore :

- endpoint HTTP `/metrics` ;
- exposition Prometheus/OpenMetrics ;
- histogrammes de latence ;
- métriques système CPU/mémoire ;
- persistance des compteurs entre redémarrages.

La prochaine tranche M7 est **timeouts explicites**.
