# Protocole RADOME legacy

> Rétro-ingénierie statique du prototype historique. Les éléments marqués **observé** sont présents à la fois dans les structures/émissions serveur ou dans leur consommation côté client. Une capture d'exécution reste nécessaire avant d'en faire une spécification normative.

## 1. Identité du protocole

RADOME 0.4.0 expose une interface HTTP et plusieurs connexions WebSocket. Le sous-protocole applicatif utilisé par le client est :

```text
RADOME
```

Le client historique ouvre jusqu'à neuf connexions WebSocket distinctes sur la même machine :

| Canal | URL historique | Rôle |
|---|---|---|
| MAIN | `ws://127.0.0.1:9000` | commandes générales et réponses |
| CAN1 | `ws://127.0.0.1:9001` | flux CAN 1 |
| CAN2 | `ws://127.0.0.1:9002` | flux CAN 2 |
| CAN3 | `ws://127.0.0.1:9003` | flux CAN 3 |
| CAN4 | `ws://127.0.0.1:9004` | flux CAN 4 |
| CAN5 | `ws://127.0.0.1:9005` | flux CAN 5 |
| VIDEO | `ws://127.0.0.1:9006` | vidéo |
| AUDIO | `ws://127.0.0.1:9007` | audio |
| NAV | `ws://127.0.0.1:9008` | navigation |

Cette topologie est un fait important : RADOME legacy ne multiplexe pas tous ses flux sur une seule connexion. Le serveur possède parallèlement un tableau de contextes `gapt_context[THREAD_MAX]`, cohérent avec un contexte/port par tâche.

Aucun mécanisme de reconnexion automatique n'est présent dans le client lu : une fermeture passe l'UI en erreur mais ne recrée pas le WebSocket.

## 2. Identifiants applicatifs

L'enum C et sa copie JavaScript concordent exactement :

| AppID | Nom | Commande texte |
|---:|---|---|
| 0 | LIST | `list` |
| 1 | VERSION | `version` |
| 2 | TEST | `test` |
| 3 | TIME | `time` |
| 4 | VIDEO | `VIDEO` |
| 5 | AUDIO | `AUDIO` |
| 6 | NAVIG | `NAV` |
| 7 | CAN1 | `CAN1` |
| 8 | CAN2 | `CAN2` |
| 9 | CAN3 | `CAN3` |
| 10 | CAN4 | `CAN4` |
| 11 | CAN5 | `CAN5` |
| 12 | STOPCAN1 | `STOP_CAN1` |
| 13 | STOPCAN2 | `STOP_CAN2` |
| 14 | STOPCAN3 | `STOP_CAN3` |
| 15 | STOPCAN4 | `STOP_CAN4` |
| 16 | STOPCAN5 | `STOP_CAN5` |
| 17 | DEMO | `demo` |

Le client envoie les commandes sous forme de **texte brut**, et non sous forme d'une requête JSON. `STOP` existe également comme commande globale côté UI, bien qu'il ne fasse pas partie de l'enum `AppID`.

Le JSON est donc principalement le format des **réponses et flux serveur → client**.

## 3. Routage des commandes côté client

Les commandes générales sont envoyées sur `MAIN`.

Pour `CAN1`…`CAN5`, `VIDEO`, `AUDIO` et `NAV`, le client tente d'utiliser le WebSocket spécialisé correspondant. L'intention visible dans `f_SendToSpecificWS()` est de piloter le flux spécialisé et d'utiliser `MAIN` pour certaines commandes suivantes/arrêts.

Le bouton STOP envoie explicitement :

```text
STOP
```

sur le WebSocket `MAIN`.

## 4. Enveloppe JSON serveur

La convention générale observée est :

```json
{
  "AppID": 7,
  "...": "payload dépendant de AppID"
}
```

Le client parse `msg.data` avec `JSON.parse()`, convertit `frame.AppID` en entier et route le message selon cet identifiant.

Il n'existe donc pas, dans le protocole observé, d'enveloppe générique du type `type`, `requestId`, `version`, `timestamp`, `error` ou `payload`.

## 5. Messages serveur → client reconstruits

### LIST — AppID 0

Construit par `RADOME_GetJSON_Data()` :

```json
{
  "AppID": 0,
  "RADOME_Cmds": [
    {"id": "1", "name": "list"},
    {"id": "2", "name": "version"}
  ]
}
```

La liste réelle contient les 18 commandes connues. Attention : `id` est une **chaîne** et vaut `index + 1`, alors que `AppID` commence à 0. L'UI utilise surtout `name` pour renvoyer la commande sélectionnée.

### VERSION — AppID 1

```json
{
  "AppID": 1,
  "RADOME_VersionInfo": [{
    "versionRelease": "0.4.0",
    "versionBuildDate": "...",
    "versionBuildTime": "...",
    "versionLWS": "..."
  }]
}
```

Le client mappe ces champs vers `versionInfo.release`, `buildDate`, `buildTime` et `LWS_version`.

### TEST — AppID 2

```json
{
  "AppID": 2,
  "RADOME_TestData": [{
    "info1": "info1 sample",
    "info2": "info2 sample"
  }]
}
```

Le client principal ne contient pas de branche dédiée à `TEST` dans le routeur observé.

### TIME — AppID 3

```json
{
  "AppID": 3,
  "RADOME_TimeInfo": [{
    "asctime": "...",
    "tm_sec": 0,
    "tm_min": 0,
    "tm_hour": 0,
    "tm_mday": 0,
    "tm_mon": 0,
    "tm_year": 0,
    "tm_wday": 0,
    "tm_yday": 0,
    "tm_isdst": 0
  }]
}
```

Les valeurs suivent directement la structure C `struct tm`. En particulier `tm_mon` et `tm_year` ne sont pas des mois/années civils directement affichables sans conversion.

### CAN1…CAN5 — AppID 7 à 11

Les fonctions `RADOME_ProcessCAN()` émettent directement :

```json
{
  "AppID": 7,
  "DataValue": 10.500000,
  "NbData": 12,
  "CurrentData": 0
}
```

Le client exploite `DataValue` pour la jauge et le graphe. Les séquences sont simulées depuis des tableaux `double` statiques côté serveur et répétées tant que l'application reste active.

### DEMO — AppID 17

Le serveur construit `RADOME_DemoInfo`; le client attend une collection d'objets contenant au minimum :

```json
{
  "AppID": 17,
  "RADOME_DemoInfo": [
    {"value": 42, "label": "..."}
  ]
}
```

Le client transforme `value` en barre de progression.

### NAV — AppID 6

Le client attend :

```json
{
  "AppID": 6,
  "RADOME_NAV_Data": [{
    "lat": 0.0,
    "lng": 0.0,
    "title": "...",
    "infoWindow": {
      "content": "..."
    }
  }]
}
```

Le contenu exact doit encore être croisé avec la branche `APP_ID_NAVIG` de `RADOME_GetJSON_Data()` et `RADOME_ProcessNAV()`.

### AUDIO — AppID 5

Le client attend :

```json
{
  "AppID": 5,
  "RADOME_AudioFiles": [
    {"id": "...", "name": "..."}
  ]
}
```

La sélection d'un élément ne déclenche pas nécessairement un streaming audio par WebSocket : l'UI construit un chemin média et modifie la source du lecteur HTML.

### VIDEO — AppID 4

L'identifiant est routé côté client mais aucune mise à jour fonctionnelle n'est implémentée dans la branche observée. La forme exacte du message reste à documenter.

## 6. Cycle de connexion observé

1. au chargement, le client ouvre `MAIN` avec le sous-protocole `RADOME` ;
2. les sockets CAN sont créés lors de la première ouverture de l'onglet voiture ;
3. VIDEO, AUDIO et NAV sont créés à la première ouverture de leurs onglets respectifs ;
4. `onmessage` tente systématiquement de parser la réponse comme JSON ;
5. un message JSON est dispatché uniquement par `AppID` ;
6. un message non JSON est seulement journalisé comme tel ;
7. à la fermeture de la page, le client tente de fermer les sockets ;
8. aucune reconnexion automatique n'a été observée.

Aucun `hello`, identifiant client, session, authentification ou négociation de version applicative n'a été trouvé dans le code client analysé.

## 7. Sémantique de flux

Le protocole mélange deux modèles :

- **commande/réponse** : `list`, `version`, `time`, etc. ;
- **commande/flux** : CAN, NAV, VIDEO, AUDIO, où une commande active un traitement susceptible d'émettre plusieurs messages.

Les états d'activation sont globaux côté serveur (`gb_AppStatus[]`, `gb_StopReceived`). Il faudra vérifier dynamiquement si cela signifie qu'un client peut modifier un flux partagé par les autres clients.

## 8. Absences protocolaires significatives

Aucune preuve n'a encore été trouvée pour :

- identifiant de message ;
- corrélation requête/réponse ;
- accusé de réception générique ;
- enveloppe d'erreur JSON ;
- version du protocole dans chaque message ;
- négociation de capacités ;
- authentification/autorisation ;
- session utilisateur ;
- reprise après reconnexion ;
- numéro de séquence ;
- timestamp applicatif ;
- mécanisme explicite de backpressure.

Ces absences sont importantes pour RADOME 2026 : elles indiquent les endroits où une nouvelle version doit être conçue plutôt que reproduire mécaniquement le legacy.

## 9. Points à valider par exécution

La rétro-ingénierie statique permet déjà de reconstruire une grande partie du contrat, mais les points suivants exigent une résurrection du serveur :

- ports effectivement ouverts par les neuf contextes ;
- comportement exact d'une commande sur MAIN versus socket spécialisé ;
- réponses automatiques éventuelles à la connexion ;
- comportement de plusieurs navigateurs simultanés ;
- effets exacts de `STOP` et `STOP_CANx` ;
- fragmentation des messages ;
- comportement lorsqu'un client ne lit plus ;
- séquences AUDIO/VIDEO/NAV complètes ;
- erreurs réellement envoyées au client.

## 10. Règle pour la suite

Ce protocole doit rester nommé **legacy**. RADOME 2026 pourra en reprendre les concepts utiles, mais sa compatibilité devra passer par une version explicite ou un adaptateur. Le comportement historique ne doit pas devenir accidentellement la nouvelle architecture simplement parce qu'il est le premier comportement documenté.
