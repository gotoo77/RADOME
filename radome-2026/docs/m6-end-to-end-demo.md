# M6.6 — Boucle UX complète et démonstration reproductible

M6 se termine sur une boucle complète qui traverse le vrai serveur RADOME et le vrai SDK JavaScript du cockpit.

## Lancement rapide

Depuis `radome-2026/` :

```bash
bash scripts/run-live-demo.sh
```

Le script lance :

- `radome-server` sur `ws://127.0.0.1:8787` ;
- un serveur HTTP statique pour `clients/` sur `http://127.0.0.1:8000`.

Ouvrir ensuite :

```text
http://127.0.0.1:8000/dashboard/
```

Le mode diagnostic est volontairement séparé :

```text
http://127.0.0.1:8000/dashboard/?diagnostic
```

`Ctrl-C` arrête les deux processus.

## Ce que la démonstration doit montrer

### 1. Bootstrap dynamique

Au chargement, le client exécute automatiquement :

```text
hello
  → discovery
  → capability_announce
  → state_snapshot
  → connected
```

Le cockpit ne contient pas une copie du catalogue de commandes serveur. Media Player et Climate Control ne deviennent actifs que si les commandes correspondantes sont réellement découvertes.

### 2. Télémétrie véhicule

Avec `RADOME_TELEMETRY_SOURCE=demo`, le serveur publie la télémétrie de démonstration dans le pipeline normal. Vitesse et RPM animent le Vehicle Info Display comme le ferait une source SocketCAN décodée en événements de domaine.

### 3. Commandes réelles

Dans le Media Player :

- lecture/pause ;
- piste précédente/suivante ;
- volume.

Dans Climate Control :

- choisir une consigne entre 16 et 30 °C ;
- cliquer sur `Appliquer`.

Le navigateur n'invente jamais le nouvel état. Un `CommandResult` donne le feedback de commande ; l'état affiché est réconcilié par l'événement produit depuis l'actionneur serveur.

### 4. Reconnexion / resynchronisation

Une perte de WebSocket fait passer le shell en état dégradé/reconnexion. Le SDK ouvre ensuite une nouvelle session et refait le bootstrap complet avant de repasser `connected`.

Le snapshot de reprise est la barrière de vérité : les états média et climat déjà modifiés côté serveur sont restaurés avant la reprise normale des événements et commandes.

Pour observer les détails de session et de discovery, utiliser `?diagnostic` ; ils ne sont pas exposés dans le cockpit normal.

## Validation automatisée

La CI Linux construit le vrai `radome-server`, puis exécute `clients/sdk/radome-live.e2e.mjs` avec le SDK JavaScript réel.

Le scénario vérifie automatiquement :

1. démarrage du serveur sur un port libre ;
2. bootstrap complet du SDK sans catalogue codé en dur ;
3. réception d'une télémétrie véhicule ;
4. exécution réelle de `media.next_track` ;
5. exécution réelle de `climate.set_temperature` ;
6. snapshot confirmant les états obtenus ;
7. fermeture volontaire du WebSocket ;
8. reconnexion avec une nouvelle `session_id` ;
9. nouveau bootstrap et snapshot conservant l'état partagé du serveur.

Cette validation complète les E2E Rust : elle couvre spécifiquement la frontière `radome-server ↔ SDK JavaScript` utilisée par le cockpit.

## Variantes

Les variables suivantes peuvent être utilisées avec le script :

```bash
RADOME_ADDR=127.0.0.1:8787 \
RADOME_HTTP_PORT=8000 \
RADOME_TELEMETRY_SOURCE=demo \
bash scripts/run-live-demo.sh
```

Pour SocketCAN, conserver le même cockpit et remplacer uniquement la source serveur (`RADOME_TELEMETRY_SOURCE=socketcan` avec `RADOME_CAN_INTERFACE` et éventuellement `RADOME_CAN_PROFILE`). Le client et ses modèles d'état ne changent pas.
