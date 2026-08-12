# M7 — Configuration externe du serveur

Cette tranche fait entrer RADOME dans M7 en retirant la configuration de démarrage du `main.rs` et en la regroupant dans un modèle explicite, validé avant l'ouverture du serveur.

## Chargement

Le serveur peut maintenant charger un fichier JSON avec :

```bash
RADOME_CONFIG=config/server.example.json cargo run -p radome-server
```

Sans `RADOME_CONFIG`, le comportement historique est conservé : valeurs par défaut puis variables d'environnement éventuelles.

L'ordre de priorité est volontairement simple :

```text
valeurs par défaut < fichier RADOME_CONFIG < variables d'environnement
```

Les variables disponibles pour surcharger ponctuellement un déploiement sont :

- `RADOME_ADDR` ;
- `RADOME_TELEMETRY_SOURCE` ;
- `RADOME_CAN_INTERFACE` ;
- `RADOME_CAN_RETRY_MS` ;
- `RADOME_CAN_PROFILE` ;
- `RADOME_METRICS_INTERVAL_MS`.

## Format

Exemple :

```json
{
  "listen_addr": "127.0.0.1:8787",
  "metrics_interval_ms": 30000,
  "telemetry": {
    "source": "demo",
    "socketcan": {
      "interface": "can0",
      "retry_ms": 1000,
      "profile": "can-profile.example.json"
    }
  }
}
```

Pour utiliser SocketCAN, il suffit notamment de passer `telemetry.source` à `socketcan`.

Le chemin `telemetry.socketcan.profile` est résolu relativement au fichier de configuration lorsqu'il est relatif. Ainsi un dossier de déploiement peut contenir ensemble `server.json` et son profil CAN sans dépendre du répertoire courant du processus.

`metrics_interval_ms` définit la période de publication des snapshots de métriques structurées. Sa valeur par défaut est 30 000 ms.

## Validation

La configuration est validée avant l'écoute réseau :

- adresse d'écoute non vide ;
- source de télémétrie limitée à `demo` ou `socketcan` ;
- interface SocketCAN non vide et sans octet NUL ;
- délai de reconnexion strictement positif ;
- intervalle de métriques strictement positif ;
- chemins de profil non vides ;
- champs JSON inconnus refusés.

Une erreur de configuration fait donc échouer le démarrage au lieu de laisser le serveur entrer dans un état partiellement configuré.

## Test de la frontière réelle

Le smoke test live `clients/sdk/radome-live.e2e.mjs` crée un vrai fichier temporaire `server.json`, définit `RADOME_CONFIG`, lance le binaire Rust, puis exerce la boucle complète serveur ↔ SDK.

Cela couvre réellement :

```text
fichier externe
  → ServerConfig
  → démarrage radome-server
  → WebSocket
  → bootstrap SDK
  → télémétrie / commandes / reconnexion
```

Le même test utilise maintenant un intervalle de métriques court pour vérifier aussi le contrat `metrics_snapshot` du vrai processus.

## Limite de la tranche

Cette configuration est chargée une fois au démarrage. Le hot-reload n'est pas introduit : il ajouterait une sémantique de reconfiguration dynamique qui n'est pas nécessaire pour atteindre le critère actuel de M7.
