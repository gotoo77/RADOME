# M7 — Tracing structuré

Cette tranche remplace les messages de démarrage et de supervision de la source véhicule par des événements `tracing` structurés, sérialisés en JSON sur stderr.

## Format

Le serveur initialise `tracing-subscriber` au démarrage. Chaque ligne est un objet JSON indépendant, adapté à `journalctl`, Loki, Vector, Fluent Bit ou à un simple traitement `jq`.

Exemple conceptuel :

```json
{"level":"INFO","fields":{"message":"server_listening","listen_addr":"127.0.0.1:8787"},"target":"radome_server"}
```

Les noms d'événements sont stables et séparés des champs :

- `configuration_loaded` ;
- `server_listening` ;
- `server_bind_failed` ;
- `telemetry_source_started` ;
- `can_frame_ignored` ;
- `socketcan_unavailable` ;
- `socketcan_frame_read_ignored` ;
- `configuration_invalid`.

Les payloads métier et le contenu brut des trames CAN ne sont pas journalisés par défaut. Les logs portent seulement les éléments utiles au diagnostic d'exploitation : adresse, source, interface, profil, délai de retry et erreur.

## Filtrage

Le niveau est piloté avec le mécanisme standard `RUST_LOG` :

```bash
RUST_LOG=info cargo run -p radome-server
```

Pour augmenter uniquement le niveau du serveur :

```bash
RUST_LOG=radome_server=debug cargo run -p radome-server
```

Sans `RUST_LOG`, le filtre par défaut est `info`. Une directive `RUST_LOG` invalide est rejetée au démarrage au lieu d'être silencieusement ignorée.

## Validation

Le smoke test live M6/M7 lance le vrai binaire avec `RUST_LOG=info`, lit stderr et vérifie que les lignes JSON contiennent au minimum :

- la configuration effectivement chargée ;
- l'adresse d'écoute réelle ;
- la source de télémétrie active.

Les tests unitaires valident aussi le filtre par défaut, un filtre ciblé et le refus d'une directive invalide.

## Frontière de cette tranche

Cette tranche établit le contrat de logs structurés et couvre le cycle de vie du processus ainsi que la supervision SocketCAN. Les métriques quantitatives, compteurs de connexions et statistiques de commandes restent la tranche M7 suivante : **métriques essentielles**.
