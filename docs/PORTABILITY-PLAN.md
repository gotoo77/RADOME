# Stratégie de portabilité RADOME

## Objectif

RADOME 2026 doit être portable par conception. Les plateformes de développement de premier rang sont :

- Linux ;
- Windows ;
- macOS.

L'embarqué Linux/ARM est une cible naturelle à valider ensuite (Raspberry Pi ou équivalent, puis plateformes infotainment selon disponibilité).

Le serveur historique reste un témoin de comportement. Il ne doit pas imposer ses dépendances Windows au nouveau noyau.

## Constat legacy

Le code historique montre une intention partielle de portabilité, mais l'implémentation effectivement conservée est fortement liée à Windows :

- `windows.h` et types Win32 exposés dans les headers RADOME ;
- `Sleep()` ;
- `GetCurrentDirectory()` ;
- chemins absolus `C:/EPR_Logiciels/...` ;
- artefacts Visual Studio ;
- pthreads-win32 vendored ;
- dépendances libwebsockets/json-c vendored avec leurs propres sorties de build.

Le dépôt ne doit donc pas être présenté comme cross-platform tant qu'une matrice CI ne le prouve pas.

## Principe

Séparer quatre niveaux :

```text
radome-protocol
      │
radome-core
      │
radome-runtime
      │
platform / transport adapters
```

`radome-protocol` et `radome-core` ne doivent contenir aucune API Win32, POSIX ou framework UI.

Les accès au système (horloge, fichiers, réseau, médias, CAN, navigation) doivent passer par des interfaces/capabilities explicites.

## Legacy : stratégie de résurrection

Le but n'est pas de transformer immédiatement le C 2015 en C portable.

### Étape L0 — conserver

- ne pas supprimer les dépendances vendored avant d'avoir compris le build historique ;
- ne pas corriger les bugs comportementaux avant d'avoir des fixtures ;
- documenter les hypothèses Windows.

### Étape L1 — isoler les dépendances plateforme

Introduire à terme une petite façade legacy pour :

- sommeil/temporisation ;
- répertoire courant ;
- types de chemins ;
- primitives de threads si nécessaire.

L'objectif est uniquement de rendre le legacy testable, pas d'en faire le runtime RADOME 2026.

### Étape L2 — build reproductible

Deux voies sont acceptables :

1. reproduire d'abord le build Windows historique ;
2. créer un build CMake minimal du seul code RADOME contre des dépendances modernes compatibles.

La voie retenue dépendra du coût réel observé lors du premier build.

## RADOME 2026 : politique de plateforme

### Niveau 1 — protocole

Le protocole doit être indépendant :

- du langage ;
- de l'OS ;
- de l'endianness si un format binaire apparaît ;
- du transport autant que raisonnablement possible ;
- de l'UI.

### Niveau 2 — core

Le core manipule des concepts RADOME : clients, capabilities, rôles, sessions, commandes, événements, état et ressources.

Il ne sait pas ce qu'est `HWND`, `pthread_t`, `epoll`, `kqueue` ou un navigateur.

### Niveau 3 — runtime

Le runtime fournit :

- scheduling ;
- transports ;
- stockage local ;
- découverte ;
- observabilité ;
- adaptation aux plateformes.

### Niveau 4 — capabilities

Les fonctionnalités dépendantes du matériel sont des plugins/adaptateurs :

- CAN ;
- GPS/navigation ;
- audio ;
- vidéo ;
- écran/tactile ;
- capteurs véhicule ;
- stockage ;
- connectivité externe.

Un appareil annonce ce qu'il sait faire ; le protocole ne suppose pas que tous les appareils possèdent les mêmes capacités.

## Implémentations envisagées

### Rust — runtime moderne candidat

Usage envisagé : serveur/runtime robuste, particulièrement adapté à Linux embarqué et aux services réseau concurrents.

Critères à vérifier par prototype :

- support Windows/Linux/macOS ;
- cross-compilation ARM ;
- WebSocket async ;
- empreinte mémoire ;
- intégration C/C++ lorsque nécessaire ;
- packaging sans runtime externe.

### Python — référence et prototypage

Usage envisagé :

- serveur de référence lisible ;
- simulateurs de terminaux ;
- tests de conformité ;
- génération de fixtures ;
- prototypes de capabilities.

Python ne doit pas être imposé aux cibles embarquées contraintes.

### C++ — SDK/intégration

Usage envisagé : intégration dans des piles existantes où C++ est déjà le langage dominant, notamment systèmes industriels/infotainment.

Le SDK doit consommer la même spécification et les mêmes tests de conformité que Rust/Python.

## Matrice de validation cible

| Composant | Linux x86_64 | Linux ARM64 | Windows x64 | macOS ARM64 |
|---|---:|---:|---:|---:|
| spécification/fixtures | ✓ | ✓ | ✓ | ✓ |
| tests de conformité | ✓ | ✓ | ✓ | ✓ |
| runtime Rust | cible | cible | cible | cible |
| référence Python | cible | cible | cible | cible |
| SDK C++ | cible | cible | cible | cible |
| legacy C | souhaitable | non prioritaire | référence historique | non prioritaire |

`cible` signifie que la CI devra réellement compiler/tester cette combinaison avant qu'elle soit annoncée comme supportée.

## CI souhaitée

À terme, chaque PR moderne doit au minimum exécuter :

1. validation des schémas/fixtures du protocole ;
2. tests unitaires ;
3. tests de conformité ;
4. build Linux ;
5. build Windows ;
6. build macOS ;
7. tests d'interopérabilité lorsque plusieurs implémentations existent.

Une compilation croisée ARM ne remplace pas un test périodique sur matériel ARM réel.

## Définition de « portable »

RADOME ne sera pas déclaré portable parce que le code contient des `#ifdef`.

Une plateforme est supportée si :

- elle compile en CI ;
- les tests de conformité passent ;
- un scénario client/serveur minimal fonctionne ;
- les limitations connues sont documentées.

Cette règle évite de reproduire le piège du legacy : une portabilité théorique différente des plateformes réellement testées.
