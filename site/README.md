# Site RADOME

Ce répertoire contient uniquement la façade publique de RADOME.

Le cockpit de démonstration n'est volontairement **pas dupliqué** ici. Le workflow GitHub Pages construit l'artefact publié en assemblant :

```text
site/                              → /
radome-2026/clients/dashboard/     → /demo/
```

Ainsi, `demo/?demo` exécute le même client web que celui développé et testé dans `radome-2026/clients/dashboard/`.

## Prévisualisation locale

Pour reproduire le packaging Pages :

```bash
rm -rf _site
mkdir -p _site/demo
cp -R site/. _site/
cp -R radome-2026/clients/dashboard/. _site/demo/
touch _site/.nojekyll
python3 -m http.server 8000 --directory _site
```

Puis ouvrir :

- `http://127.0.0.1:8000/` pour la façade ;
- `http://127.0.0.1:8000/demo/?demo` pour le cockpit en simulation.

Sur les pull requests, le workflow construit et vérifie l'artefact sans le déployer. Le déploiement n'a lieu qu'après intégration sur `master` (ou lancement manuel du workflow).
