# Démo RADOME 2026

Cette démo valide la chaîne complète :

`TelemetrySimulator → Runtime → ConnectionHub → WebSocket → dashboard HTML`

## 1. Lancer le serveur

Depuis `radome-2026/` :

```bash
cargo run -p radome-server
```

Le serveur écoute par défaut sur `ws://127.0.0.1:8787` et publie périodiquement la télémétrie du trajet simulé.

Pour écouter sur une autre interface ou un autre port :

```bash
RADOME_ADDR=0.0.0.0:8787 cargo run -p radome-server
```

Sous PowerShell :

```powershell
$env:RADOME_ADDR="0.0.0.0:8787"
cargo run -p radome-server
```

## 2. Servir le dashboard

Le client est volontairement du HTML/CSS/JavaScript sans framework ni étape de build.

Depuis `radome-2026/clients/dashboard/` :

```bash
python -m http.server 8080
```

Puis ouvrir `http://127.0.0.1:8080` dans un navigateur.

Le dashboard se connecte par défaut à `ws://127.0.0.1:8787`.

Pour viser un serveur RADOME sur une autre machine :

```text
http://ADRESSE_DU_DASHBOARD:8080/?ws=ws://ADRESSE_RADOME:8787
```

Exemple sur un réseau local :

```text
http://192.168.1.20:8080/?ws=ws://192.168.1.10:8787
```

## 3. Handshake attendu

Le dashboard envoie d'abord :

```json
{"version":1,"id":"dashboard-hello","type":"hello","payload":{"client_id":"dashboard-web"}}
```

Le serveur répond avec un `hello` contenant un `session_id`. Le dashboard annonce ensuite :

```json
{
  "version": 1,
  "id": "dashboard-capabilities",
  "type": "capability_announce",
  "session_id": "session-…",
  "payload": {
    "role": "driver-display",
    "capabilities": ["display", "touch"]
  }
}
```

Une fois accepté, le runtime peut router vers ce client les événements de l'expérience `telemetry`.

## 4. Résultat attendu

Le dashboard affiche en direct :

- `vehicle.speed_changed` → vitesse en km/h ;
- `vehicle.engine_rpm_changed` → régime moteur en tr/min.

La fermeture du navigateur entraîne la suppression du client dans le runtime et dans le hub de connexions.

## État du prototype

Cette démo est une preuve de bout en bout, pas encore une interface infotainment finale. Le simulateur, le runtime, le transport et le client web sont volontairement séparés afin de pouvoir remplacer la source simulée par un adaptateur CAN, un replay ou une autre source sans modifier le dashboard ni le transport WebSocket.
