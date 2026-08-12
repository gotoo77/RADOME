# M6.4 — Climate Control

## Objectif

Ajouter au premier client RADOME un contrôle de température cohérent avec le modèle `snapshot + événements`, sans introduire de second état métier côté navigateur.

## Source de vérité

Le serveur expose déjà l'état climat dans le snapshot global :

```json
{
  "climate": {
    "temperature_c": 20.0
  }
}
```

Le client initialise donc `ClimateState` depuis `StateSnapshot.climate`.

La commande publique reste :

```text
climate.set_temperature
```

avec :

```json
{
  "temperature_c": 22.5
}
```

Après exécution, l'événement `climate.temperature_changed` contient l'état réellement observé de l'actionneur. C'est cet événement, et non le clic utilisateur ni le `CommandResult`, qui modifie la température affichée.

## Invariant UX

Le flux est volontairement :

```text
consigne utilisateur
    ↓
Command
    ↓
feedback pending
    ↓
CommandResult succeeded / failed
    ↓
feedback accepté / refusé
    ↓
Event climate.temperature_changed
    ↓
température affichée réconciliée
```

Il n'y a donc **aucune mutation optimiste** de la température.

Une coupure pouvant rendre l'issue d'une commande inconnue est traitée comme n'importe quel refus côté composant : l'ancienne température observée reste affichée jusqu'à la prochaine vérité serveur, notamment le snapshot de reconnexion.

## Discovery et capabilities

Le dashboard déclare maintenant qu'il supporte aussi `climate.control`.

Les contrôles restent désactivés tant que :

- le client n'est pas `connected` ;
- `climate.set_temperature` n'a pas été découvert dans le catalogue serveur.

Le composant ne duplique donc pas la disponibilité du serveur.

## Bornes

Le contrat existant du serveur est conservé :

- minimum : `16 °C` ;
- maximum : `30 °C` ;
- UI : pas de `0,5 °C`.

La validation serveur reste autoritaire même si le navigateur borne déjà le contrôle.

## Présentation

Le composant est monté comme une surface indépendante entre le Media Player et les outils de diagnostic :

- température réellement observée mise en avant ;
- consigne séparée ;
- boutons tactiles `− / +` ;
- slider `16 → 30 °C` ;
- action explicite `Appliquer` ;
- feedback `idle / pending / succeeded / failed` local au composant.

Le montage dynamique évite de transformer M6.4 en chantier de composition générale de l'écran : cette responsabilité reste celle de M6.5.

## Tests

Les tests Node couvrent :

- parsing du snapshot et de l'événement ;
- bornes du contrat ;
- absence de mutation optimiste ;
- conservation de l'état observé en cas de refus ;
- activation des contrôles selon l'état opérationnel et la discovery ;
- feedback pendant une commande ;
- payload exact envoyé à `climate.set_temperature`.
