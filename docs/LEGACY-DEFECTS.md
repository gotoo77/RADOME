# Défauts et risques concrets du legacy RADOME

> Audit statique initial. Les entrées ci-dessous pointent des comportements visibles dans le code historique ; leur impact runtime doit être confirmé lors de la résurrection du build.

## Priorités

- **P0** : empêche ou compromet fortement la résurrection/portabilité.
- **P1** : défaut fonctionnel, sécurité ou robustesse important.
- **P2** : dette/bug réel mais contournable pendant l'archéologie.
- **P3** : qualité ou maintenance.

| Priorité | Zone | Défaut observé | Impact |
|---|---|---|---|
| P0 | `RADOME_export.h` | inclusion inconditionnelle de `windows.h` et usage de types/API Windows | le serveur n'est pas réellement portable Linux malgré des branches `_WIN32` ailleurs |
| P0 | serveur/client | chemins absolus `C:/EPR_Logiciels/...` codés en dur | build/exécution dépendants de l'environnement historique |
| P1 | `callback_http()` | construction de chemin à partir de l'URI HTTP sans normalisation/canonicalisation visible | risque de traversal et de lecture de fichiers hors racine selon comportement de la lib |
| P1 | `callback_http()` | `strcpy`/`strcat`/`strncat` sur buffer fixe de 256 octets | risque de dépassement/troncature et calcul de longueur fragile |
| P1 | protocole | absence d'authentification/autorisation observée | tout client réseau capable de se connecter peut potentiellement piloter les commandes |
| P1 | protocole | aucune corrélation requête/réponse ni enveloppe d'erreur | ambiguïté dès que plusieurs commandes/clients coexistent |
| P1 | serveur | états `gb_AppStatus[]` et `gb_StopReceived` globaux | interférence potentielle entre clients et courses entre threads |
| P1 | serveur | `Sleep()` dans les boucles de production CAN | thread bloqué ; modèle de scheduling/backpressure très limité |
| P1 | serveur | écriture WebSocket directe depuis les traitements CAN | à vérifier vis-à-vis des contraintes thread-safety de la version historique de libwebsockets |
| P1 | client | aucune reconnexion automatique | perte durable du canal après incident réseau |
| P2 | client `f_SendToSpecificWS()` | `bWsState_Can3 != true;` est une comparaison sans affectation | état CAN3 incohérent |
| P2 | client `f_SendToSpecificWS()` | plusieurs branches remettent le booléen à `false` immédiatement après l'avoir positionné à `true` | logique de bascule socket spécialisé/MAIN probablement erronée ou au minimum très difficile à raisonner |
| P2 | client `f_WS_Connect()` | chaque appel rebinde `keypress`, bouton Send et bouton STOP | ouverture progressive des sockets peut multiplier les handlers et donc les envois |
| P2 | client `f_CloseWebsocket()` | la fonction reçoit l'objet de configuration mais appelle `fWS.close()` au lieu de `fWS.Websocket.close()` | fermeture `beforeunload` probablement défaillante |
| P2 | client | variables WebSocket/état/UI globales nombreuses | couplage fort et comportements croisés difficiles à tester |
| P2 | JSON | `AppID` numérique mais `RADOME_Cmds[].id` chaîne et décalé de +1 | contrat incohérent, source potentielle d'erreurs de mapping |
| P2 | JSON TIME | sérialisation brute de `struct tm` | `tm_mon` et `tm_year` ont une sémantique C non intuitive pour un client |
| P2 | JSON | pas de schéma ni validation côté client au-delà de `JSON.parse()` | un JSON syntaxiquement valide mais incomplet peut casser le traitement UI |
| P2 | client `f_addMsgTo()` | concaténation directe de `msg` dans du HTML | si une donnée serveur/non fiable atteint le log, risque d'injection DOM/XSS |
| P3 | `get_mimetype()` | test `.js` dupliqué avec deux MIME types différents | code mort/incohérent |
| P3 | `print_json_value()` | plusieurs chaînes de format semblent erronées (`%sn`, `%dn`, etc.) | fonction de diagnostic incorrecte |
| P3 | `RADOME_JSON.c` | fonctions d'exemple JSON mélangées au code produit | surface de maintenance inutile et responsabilités confondues |

## Notes détaillées

### D001 — portabilité Windows implicite — P0

`RADOME_export.h` inclut directement `windows.h` et expose `TCHAR`, `MAX_PATH`, `DWORD`, `Sleep()` et `GetCurrentDirectory()` dans le code RADOME. Le projet contient quelques branches conditionnelles Windows/Linux, mais l'abstraction n'est pas complète.

**Restauration proposée :** ne pas corriger tout de suite. Construire d'abord une couche de compatibilité minimale (`legacy/platform_compat`) ou compiler dans un environnement Windows reproductible. La suppression des API Windows viendra après obtention d'un comportement de référence.

### D002 — chemins machine codés en dur — P0

Le serveur référence notamment :

```text
C:/EPR_Logiciels/RADOME/Client
```

et l'audio utilise également un chemin absolu de cette installation.

**Restauration proposée :** rendre les racines configurables par arguments/env/config tout en gardant ces valeurs comme fallback `legacy` si nécessaire.

### D003 — état global multi-thread — P1

Les flux CAN consultent `gb_AppStatus[fe_AppID]` et `gb_StopReceived` dans des boucles. Ces variables sont globales et aucune synchronisation n'est visible autour des lectures/écritures dans les extraits audités.

**Risque :** data races et sémantique globale : STOP demandé par un client peut affecter les autres.

### D004 — handlers client multipliés — P2

`f_WS_Connect()` termine en enregistrant les handlers de saisie, bouton Send et STOP. Or cette fonction est appelée une fois pour MAIN puis à nouveau pour chacun des sockets spécialisés lorsque les onglets sont ouverts.

**Conséquence probable :** une action utilisateur peut déclencher plusieurs callbacks identiques après ouverture de plusieurs canaux.

### D005 — fermeture WebSocket incorrecte — P2

`f_CloseWebsocket(fWS)` fait :

```text
fWS.close()
```

alors que `f_WS_Connect()` stocke l'instance native dans :

```text
fWS.Websocket
```

Le listener `beforeunload` passe précisément l'objet de configuration à `f_CloseWebsocket()`.

### D006 — machine d'état CAN3 cassée — P2

Dans `f_SendToSpecificWS()` :

```text
bWsState_Can3 != true;
```

n'affecte rien. Cela ressemble sans ambiguïté à une faute de frappe pour `=`.

## Ce qu'on ne corrige pas encore

Cette branche est une branche de restauration. Corriger immédiatement ces défauts rendrait plus difficile la comparaison avec le comportement historique.

Ordre recommandé :

1. capturer le comportement legacy ;
2. écrire des tests/fixtures qui le décrivent ;
3. classer ce qui est comportement voulu, bug historique ou accident d'implémentation ;
4. seulement ensuite corriger dans une implémentation restaurée ou moderne.
