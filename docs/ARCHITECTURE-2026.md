# Architecture RADOME 2026 — modèle minimal

> Proposition de travail. Ce document fixe des frontières et des invariants avant tout choix de langage ou de framework.

## 1. Proposition

RADOME 2026 est un **runtime local-first d'expériences distribuées pour terminaux embarqués et multi-écrans**.

Il met en relation :

1. des services/capabilities disponibles dans un système ;
2. des terminaux possédant leurs propres capabilities ;
3. des expériences qui déclarent leurs besoins ;
4. des rôles et permissions ;
5. un état et des événements distribués.

RADOME n'est donc pas :

- un serveur Web particulier ;
- une bibliothèque WebSocket ;
- un framework HTML ;
- un bus CAN ;
- un produit automobile uniquement.

Ces technologies peuvent être des adapters ou clients de RADOME.

## 2. Architecture logique

```text
                   ┌─────────────────────┐
                   │     Experience      │
                   │ besoins + UI/logique│
                   └──────────┬──────────┘
                              │
                    capability matching
                              │
                ┌─────────────▼─────────────┐
                │        RADOME Core        │
                │                           │
                │ Node / Client / Role      │
                │ Session / State           │
                │ Command / Event           │
                │ Capability / Permission   │
                └──────┬─────────────┬──────┘
                       │             │
               ┌───────▼──────┐ ┌────▼───────────┐
               │   Runtime    │ │ Capability     │
               │ transport    │ │ adapters       │
               │ discovery    │ │ CAN/GPS/media  │
               │ persistence  │ │ simulators     │
               └───────┬──────┘ └────────────────┘
                       │
              ┌────────┼─────────┐
              ▼        ▼         ▼
             Web      native    test
            client    client    client
```

## 3. Concepts minimaux

### Node

Une instance RADOME participant au système.

Un node peut héberger le runtime, fournir des capabilities ou représenter un terminal. La topologie exacte ne doit pas être figée trop tôt en « un serveur central obligatoire ».

### Client

Participant connecté à un node/runtime et susceptible de consommer une expérience ou des services.

Un client possède :

- une identité de connexion ;
- des capabilities déclarées ;
- éventuellement un rôle ;
- des permissions ;
- un état de présence.

### Capability

Fonction disponible ou requise. Voir `CAPABILITIES.md`.

Une capability est fonctionnelle (`vehicle.telemetry`) et non liée au détail matériel (`CAN1`).

### Adapter

Implémentation concrète d'une capability ou d'une frontière système.

Exemples : simulateur, SocketCAN, GPS système, bibliothèque média locale.

### Experience

Unité fonctionnelle présentée aux utilisateurs/terminaux.

Exemples : tableau de bord de télémétrie, navigation, lecteur média, information passager.

Une expérience déclare les capabilities qu'elle :

- exige ;
- préfère ;
- peut exploiter optionnellement.

### Role

Fonction logique attribuée à un client dans une installation.

Exemples :

```text
driver-display
center-console
rear-passenger
seat-display
crew-terminal
```

Le rôle n'est pas déduit uniquement de la résolution d'écran.

### Permission

Autorisation explicite d'effectuer une opération.

Une capability disponible n'implique jamais automatiquement une permission.

### Session

Contexte durable d'une interaction utilisateur/expérience, indépendant autant que possible d'une connexion réseau particulière.

Cela permettra à terme de reprendre une activité après reconnexion ou migration vers un autre écran.

### State

Information courante nécessaire aux expériences.

Le state ne doit pas être confondu avec le flux d'événements qui l'a produit.

### Command

Intention adressée au système.

Exemple :

```text
media.play
navigation.set_destination
```

Une commande peut réussir ou échouer et doit pouvoir être corrélée à sa réponse.

### Event

Fait déjà produit.

Exemple :

```text
media.playback_started
vehicle.speed_changed
client.disconnected
```

Cette distinction Command/Event manque dans le protocole legacy et doit devenir explicite.

## 4. Matching d'expérience

Le cœur doit pouvoir répondre à une question simple :

> Cette expérience peut-elle fonctionner sur ce client, dans ce rôle, avec les capabilities système actuellement disponibles et les permissions accordées ?

Exemple :

```text
Experience: rear-media
requires:
  system: media.library
  client: display
prefers:
  client: touch
  client: audio.output
role:
  rear-passenger
```

Le résultat doit être explicable :

```text
AVAILABLE
- media.library: available
- display: available
- touch: available
- audio.output: unavailable -> optional
- role rear-passenger: accepted
```

Le matching ne doit pas être une boîte noire.

## 5. Local-first

Le fonctionnement essentiel d'une installation RADOME ne doit pas dépendre d'Internet.

```text
Internet / cloud
      │
      │ optional capability
      ▼
┌─────────────┐
│ RADOME node │
└──────┬──────┘
       │ réseau local
 ┌─────┼───────────┐
 ▼     ▼           ▼
screen tablet   embedded client
```

Une coupure Internet ne doit pas casser les fonctions locales qui ne nécessitent pas Internet.

## 6. Transport

WebSocket reste un excellent premier transport pour un client Web, mais il n'est pas l'identité du système.

Le core manipule des messages typés. Un adapter de transport s'occupe de leur encodage et acheminement.

Première cible raisonnable :

```text
RADOME messages
      ↓
JSON encoding
      ↓
WebSocket transport
```

Les autres transports ne seront ajoutés que si un cas d'usage réel les justifie.

## 7. Protocole moderne minimal

Sans figer encore le schéma, une enveloppe moderne devra au minimum permettre :

```text
protocol version
message id
type
correlation id (si réponse)
sender/session context
payload
```

Catégories candidates :

```text
hello
capability.announce
command
command.result
event
state.snapshot
error
```

Contrairement au legacy, un entier `AppID` ne doit pas porter à lui seul toute la sémantique du message.

## 8. Résilience

Le modèle doit anticiper :

- déconnexion/reconnexion ;
- client lent ;
- messages invalides ;
- capability qui apparaît/disparaît ;
- adapter matériel indisponible ;
- redémarrage d'un node ;
- reprise de session ;
- version de protocole incompatible.

Tout ne doit pas être implémenté en V1, mais aucune décision V1 ne doit rendre ces cas impossibles à traiter proprement.

## 9. Sécurité par frontière

Les environnements visés peuvent exposer des données ou commandes sensibles.

RADOME doit donc distinguer explicitement :

```text
identity
capability discovery
permission
command validation
transport security
```

Exposer `vehicle.telemetry.read` et autoriser `vehicle.control.write` sont deux décisions différentes.

La V1 moderne commencera probablement en réseau local de confiance, mais le protocole ne doit pas confondre « pas encore authentifié » avec « toute opération est autorisée par conception ».

## 10. Observabilité

Chaque implémentation moderne devrait pouvoir produire une trace structurée permettant de comprendre :

- connexion/déconnexion ;
- capabilities annoncées ;
- résultat du matching ;
- commandes reçues ;
- résultats/erreurs ;
- événements émis ;
- changements de state.

L'objectif est de pouvoir expliquer un comportement distribué sans ouvrir un debugger dans quatre processus.

## 11. Invariants proposés

1. Le core ne dépend d'aucun OS.
2. Le core ne dépend d'aucun framework UI.
3. Une capability décrit une fonction, pas un périphérique précis.
4. Une capability peut être fournie par un adapter réel ou simulé.
5. Une capability disponible n'accorde aucune permission implicitement.
6. Une commande possède un résultat corrélable.
7. Un événement décrit un fait, pas une intention.
8. Une session n'est pas identique à une connexion réseau.
9. Le fonctionnement local essentiel ne dépend pas du cloud.
10. Le protocole est versionné explicitement.
11. Le matching d'expérience est déterministe et explicable.
12. Une plateforme n'est déclarée supportée que si elle est testée.

## 12. V1 volontairement petite

Pour éviter de recréer un énorme framework théorique, la première V1 moderne doit démontrer uniquement :

1. un runtime local ;
2. deux clients simultanés ;
3. annonce de capabilities clientes ;
4. une capability système simulée `vehicle.telemetry` ;
5. une expérience qui fait du matching ;
6. commande + résultat ;
7. événements de télémétrie ;
8. déconnexion/reconnexion simple ;
9. trace structurée ;
10. même scénario exécutable sur au moins Linux et Windows.

Exemple de démonstrateur :

```text
TelemetrySimulator
        │
        ▼
   RADOME runtime
      │       │
      ▼       ▼
 dashboard   tablet
 display     display+touch
```

Ce démonstrateur remplace avantageusement les cinq faux canaux CAN du legacy : il conserve l'intuition utile tout en validant les nouvelles frontières.

## 13. Ce que nous refusons de décider maintenant

- Rust ou C++ comme runtime principal ;
- framework Web ;
- format binaire ;
- découverte réseau complexe ;
- cloud ;
- orchestration distribuée multi-node avancée ;
- plugin ABI stable ;
- intégration automobile réelle.

Ces choix doivent être provoqués par les besoins du démonstrateur ou d'un usage réel, pas ajoutés par anticipation.
