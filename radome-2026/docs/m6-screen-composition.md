# M6.5 — Composition de l’écran RADOME

## Objectif

Transformer les composants fonctionnels de M6 en un cockpit cohérent, sans exposer les détails du protocole dans l’usage normal.

## Hiérarchie opérationnelle

L’écran normal est organisé en deux niveaux :

1. **Vehicle Info Display** en zone principale : vitesse, régime moteur et fraîcheur de télémétrie restent prioritaires ;
2. **zone secondaire** : Media Player et Climate Control sont regroupés sous la zone véhicule et se recomposent selon la largeur disponible.

Sur un navigateur desktop large, média et climat peuvent coexister côte à côte. Sur un écran embarqué plus étroit ou sur mobile, les blocs se replient verticalement sans changer leurs contrats d’état ou de commande.

## État global du cockpit

`DashboardShell` projette les phases du client sur un état visuel de haut niveau :

- bootstrap (`connecting`, `handshake`, `discovering`, `announcing_capabilities`, `synchronizing`) → `connecting` ;
- `connected` → `online` ;
- `reconnecting` → `degraded` ;
- `disconnected` → `offline` ;
- erreur UI/protocole → `error`.

Cette projection ne remplace pas les états métier locaux : télémétrie véhicule, média et climat gardent chacun leur propre modèle.

## Diagnostic séparé

Les informations techniques ne sont plus affichées dans le flux normal du cockpit.

Un panneau **Diagnostic** explicitement ouvrable contient :

- la `session_id` courante ;
- un résumé de la discovery (nombre de capabilities et de commandes) ;
- le nom du dernier événement reçu ;
- la dernière erreur observée ;
- les outils d’enregistrement et de replay de télémétrie.

Le panneau est fermé par défaut. `?diagnostic` permet de l’ouvrir directement pour une session de mise au point.

Le but n’est pas de cacher le protocole au développeur mais de ne pas l’imposer au conducteur ou à l’utilisateur normal.

## Modes demo et replay

Les modes `demo` et `replay` utilisent la même composition visuelle que le mode live. Ils ne créent pas une seconde IHM : seule la source des événements change.

## Invariants

- le Vehicle Info Display reste visuellement prioritaire ;
- média et climat restent des composants métier indépendants du transport ;
- le Climate Control est monté dans `#operational-secondary`, jamais dans le panneau diagnostic ;
- le diagnostic est masqué par défaut et possède son propre espace ;
- aucune donnée de session, discovery ou événement brut n’est nécessaire à la lecture normale du cockpit ;
- la composition reste exploitable à largeur desktop, tablette/écran embarqué et mobile.

## Couverture

Les tests Node vérifient :

- la projection des états de connexion dans `DashboardShell` ;
- l’ouverture/fermeture explicite du diagnostic ;
- le résumé session/discovery/événement/erreur ;
- la séparation structurelle entre zone opérationnelle et outils de diagnostic dans `index.html` ;
- la présence des breakpoints de composition responsive.

Après cette tranche, M6.6 peut se concentrer sur la boucle complète de démonstration plutôt que sur la structure de l’écran.
