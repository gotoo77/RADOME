# Code historique RADOME

Ce dépôt contient un projet RADOME historique antérieur à la réécriture actuelle située dans `radome-2026/`.

## Statut

Le code historique est conservé comme **matériel de référence et d'archéologie logicielle**. Il ne constitue pas le produit RADOME actuel et ne doit pas imposer ses choix techniques à l'architecture 2026.

Le projet actif est :

```text
radome-2026/
```

## Hygiène du dépôt

Les métadonnées Subversion (`.svn`) et les artefacts générés (objets, bibliothèques, exécutables, répertoires de build, caches, logs, etc.) ne font pas partie des sources et sont exclus par `.gitignore`.

Les artefacts historiques déjà présents dans l'historique Git restent récupérables via les anciens commits. Il n'est pas nécessaire de réécrire l'historique simplement pour nettoyer l'arbre courant.

## Principe

Lorsqu'un élément historique est utile pour comprendre une intention, un protocole ou une décision ancienne, on peut le consulter. Toute nouvelle implémentation doit cependant être conçue dans `radome-2026/` selon les contrats et invariants du RADOME actuel.
