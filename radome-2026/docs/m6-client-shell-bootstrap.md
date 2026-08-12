# M6.1 — Shell client et bootstrap dynamique

Cette tranche transforme le SDK navigateur RADOME en vrai shell client du protocole public.

## Objectif

Le client ne doit plus considérer l'ouverture du WebSocket comme synonyme de « prêt ». Il devient opérationnel uniquement après la séquence complète :

```text
WebSocket open
  → hello
  → discovery
  → sélection des capabilities supportées
  → capability_announce
  → state_snapshot
  → operational
```

Le dashboard existant sert de premier consommateur de ce shell. Les tranches suivantes M6 feront évoluer son contenu vers le Vehicle Info Display, le Media Player et le Climate Control aboutis.

## Capabilities

Deux catégories sont distinguées côté client :

- `capabilities` : propriétés intrinsèques du client, par exemple `display` et `touch` ;
- `supportedCapabilities` : capabilities serveur que cette application sait réellement exploiter.

Les `supportedCapabilities` ne sont annoncées que si elles apparaissent dans `DiscoveryResult`.

Exemple pour le dashboard actuel :

```js
new RadomeClient({
  url: 'ws://127.0.0.1:8787',
  clientId: 'dashboard-web',
  role: 'driver-display',
  capabilities: ['display', 'touch'],
  supportedCapabilities: ['media.control'],
});
```

Le client ne duplique donc pas la liste des commandes du serveur. Il connaît uniquement les fonctions qu'il sait présenter ; les commandes réellement disponibles proviennent de la discovery.

## Snapshot comme barrière de vérité

Après `capability_announce`, des événements asynchrones peuvent arriver avant la réponse au `state_snapshot_request`.

Le SDK les tamponne jusqu'à réception du snapshot. L'ordre local devient alors :

```text
snapshot initial
→ événements éventuellement reçus pendant la synchronisation
→ événements temps réel
```

Cela respecte la sémantique de resynchronisation définie en M4 : le snapshot remplace l'état local avant la reprise du flux incrémental.

## Reconnexion

Une fermeture non demandée déclenche automatiquement une reconnexion après `1000 ms` par défaut.

Chaque reconnexion recommence entièrement le bootstrap :

```text
nouveau WebSocket
→ nouveau hello
→ nouvelle session_id
→ nouvelle discovery
→ nouvelle capability_announce
→ nouveau snapshot
```

Le délai est configurable dans le constructeur du SDK avec `reconnectDelayMs`.

Un `disconnect()` explicite désactive cette reconnexion automatique.

## Commandes ambiguës

Une commande envoyée dont le résultat n'a pas été reçu avant la coupure n'est jamais rejouée automatiquement.

Sa promesse est rejetée avec `RadomeCommandOutcomeUnknownError`. Le client se resynchronise d'abord par snapshot ; l'application décide ensuite, selon le contexte métier, si une nouvelle intention utilisateur doit être émise.

Le SDK refuse également une commande qui n'existe pas dans le catalogue issu de la discovery ou dont la capability n'a pas été sélectionnée.

## États de connexion exposés à l'IHM

Le SDK publie les phases suivantes via l'événement `status` :

```text
connecting
handshake
discovering
announcing_capabilities
synchronizing
connected
reconnecting
disconnected
```

`connected` signifie ici « bootstrap terminé et état initial synchronisé », pas simplement « socket ouverte ».

## Tests

Les tests Node du SDK couvrent :

- la séquence complète de bootstrap ;
- la sélection dynamique des capabilities ;
- le tampon des événements avant snapshot ;
- le refus d'une commande absente de la discovery ;
- la corrélation du `CommandResult` ;
- la reconnexion avec nouvelle session ;
- l'absence de replay automatique d'une commande au résultat ambigu.

Le SDK est exécuté dans la matrice CI Linux / Windows / macOS en plus des tests du dashboard.
