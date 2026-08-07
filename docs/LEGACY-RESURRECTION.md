# Résurrection du legacy RADOME

## But

Faire reparler RADOME 2015 **si le coût reste raisonnable**, afin de capturer quelques échanges réels et vérifier la rétro-ingénierie statique.

Le but n'est pas de transformer le serveur historique en produit maintenable ni de porter toutes ses dépendances en 2026.

## Constat du dépôt

L'historique Git disponible est extrêmement court : quatre commits le 6 mars 2015, dont l'import principal `First commit`. Il n'existe donc pas dans Git une longue histoire permettant de retrouver progressivement les choix de build : l'import lui-même constitue l'archive de référence.

Le dépôt contient en revanche une grande quantité d'artefacts issus de l'environnement de développement historique : Visual Studio/CMake, bibliothèques tierces vendored et sorties de compilation. Cela confirme que la meilleure source de vérité est le contenu importé, pas l'historique Git.

## Définition minimale du succès

La résurrection est considérée utile dès que l'on obtient au moins un des niveaux suivants :

### R-L1 — compilation

Le serveur legacy compile dans un environnement documenté.

### R-L2 — démarrage

Le serveur démarre et écoute sur le canal MAIN.

### R-L3 — échange

Un client WebSocket peut se connecter avec le sous-protocole `RADOME`, envoyer :

```text
version
```

et recevoir un JSON `AppID = 1` cohérent avec `LEGACY-PROTOCOL.md`.

### R-L4 — flux

Au moins un flux CAN simulé peut être déclenché et plusieurs messages `DataValue` sont capturés.

R-L3 est suffisant pour arrêter la restauration et passer aux tests de compatibilité. R-L4 est un bonus.

## Critère d'arrêt

On arrête la résurrection du binaire historique si elle exige l'un des éléments suivants :

- reconstruction manuelle importante d'une toolchain Windows obsolète ;
- patch massif d'une ancienne libwebsockets/json-c/pthreads-win32 ;
- modification substantielle de la logique métier/protocolaire ;
- temps d'investigation disproportionné par rapport aux informations supplémentaires obtenues.

Dans ce cas, le code source + la spécification reconstruite + des fixtures synthétiques deviennent notre référence legacy.

## Expérience Windows prioritaire

Puisque le prototype semble avoir été développé/testé principalement sous Windows, le premier essai reproductible doit viser Windows plutôt que forcer immédiatement un port Linux.

Checklist :

- [ ] identifier précisément le projet/solution Visual Studio RADOME ;
- [ ] identifier architecture cible (Win32/x64) ;
- [ ] inventorier `.lib` / `.dll` attendues ;
- [ ] inventorier les include paths historiques ;
- [ ] identifier les versions vendored de libwebsockets/json-c/pthreads ;
- [ ] neutraliser uniquement les chemins machine codés en dur nécessaires au lancement ;
- [ ] compiler ;
- [ ] démarrer MAIN ;
- [ ] connecter un client minimal ;
- [ ] envoyer `version` ;
- [ ] capturer la réponse ;
- [ ] tenter `list` ;
- [ ] tenter un flux CAN.

## Ce qui ne doit pas entrer dans cette branche

- nouveau protocole RADOME ;
- runtime Rust ;
- SDK C++ moderne ;
- refonte du client Web ;
- nettoyage massif des dépendances vendored ;
- corrections esthétiques du C/JS legacy.

Cette branche est un laboratoire jetable de validation historique.

## Après la résurrection

Les traces utiles seront converties en fixtures indépendantes de l'implémentation, par exemple :

```text
tests/
  legacy-fixtures/
    version.response.json
    list.response.json
    can1.frames.jsonl
```

Ces fixtures pourront ensuite servir à tester un adaptateur legacy ou à vérifier qu'une implémentation moderne sait reproduire volontairement le sous-ensemble compatible.
