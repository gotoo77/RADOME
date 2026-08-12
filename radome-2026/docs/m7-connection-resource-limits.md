# M7 — Limites de ressources par connexion

Cette tranche complète la backpressure en bornant aussi les ressources qui restent attachées à une session WebSocket.

## Budgets

Chaque connexion utilise trois limites explicites :

- `outbound_queue_capacity` : nombre maximal d'enveloppes en attente dans la file WebSocket sortante ;
- `command_cache_capacity` : nombre maximal d'identifiants de commande conservés pour garantir l'idempotence dans la session ;
- `max_capabilities` : nombre maximal de capabilities persistées pour un client annoncé.

Valeurs par défaut :

```json
{
  "limits": {
    "outbound_queue_capacity": 128,
    "command_cache_capacity": 256,
    "max_capabilities": 32
  }
}
```

Toutes les valeurs doivent être strictement positives.

## Surcharges d'environnement

Comme pour le reste de `ServerConfig`, les variables d'environnement gagnent sur le fichier :

```text
RADOME_OUTBOUND_QUEUE_CAPACITY
RADOME_COMMAND_CACHE_CAPACITY
RADOME_MAX_CAPABILITIES
```

## Sémantique

### File sortante

La capacité n'est plus une constante compilée. Les réponses protocolaires causales attendent une place dans la file ; les événements asynchrones utilisent toujours la politique de backpressure de la tranche précédente.

### Cache d'idempotence

Le cache de commandes ne peut plus croître pendant toute la durée d'une session.

Quand il est plein :

1. les commandes déjà présentes dans le cache restent rejouables exactement ;
2. un nouvel identifiant de commande reçoit un `CommandResult` avec `outcome = failed`, `code = resource_limit` et `detail = command_cache_capacity` ;
3. la connexion est ensuite terminée proprement, forçant un nouveau bootstrap et donc une nouvelle session.

Cette politique évite d'introduire une éviction LRU qui casserait l'invariant M4 : une ancienne commande évincée pourrait sinon être exécutée une seconde fois.

### Capabilities

Une annonce dépassant `max_capabilities` est refusée avec l'erreur protocolaire existante `invalid_capabilities` et le détail `too_many_capabilities`. La session reste ouverte afin que le client puisse renvoyer une annonce conforme.

## Observabilité

Chaque refus déclenché par ces budgets incrémente :

```text
connection_limit_rejections_total
```

Le compteur est publié dans `metrics_snapshot` avec les autres métriques M7.

Le chargement de configuration journalise également les trois limites retenues afin qu'un diagnostic puisse reconstruire la politique effective d'un processus.

## Validation

Les tests couvrent notamment :

- les valeurs par défaut et les surcharges fichier/environnement ;
- le refus des capacités nulles ;
- le refus d'une annonce de capabilities trop grande, suivi d'une annonce valide dans la même session ;
- la conservation du replay exact d'une commande déjà cachée lorsque le cache est plein ;
- le refus puis la fermeture de session lors d'un nouvel identifiant au-delà de la capacité du cache.

## Suite

Les ressources mémoire par connexion sont maintenant bornées sur les principaux états persistants contrôlés par RADOME. La prochaine tranche M7 est **timeouts explicites** : handshake/bootstrap, lecture et arrêt doivent avoir des échéances définies au lieu de pouvoir attendre indéfiniment.
