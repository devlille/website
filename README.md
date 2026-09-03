# Site DevLille

Site de la conférence [DevLille](https://devlille.fr), en Astro.

```bash
npm install
npm run dev            # http://localhost:4321
npm run build          # -> dist/
npm test               # tests unitaires
```

## Sources de données

Le site ne fait aucun `fetch` en dehors de `src/data/` : tout passe par le port
`EventDataSource`. Deux implémentations, choisies par `DATA_SOURCE` :

| `DATA_SOURCE` | Source |
|---|---|
| `http` (défaut) | l’API DevLille |
| `static` | un dossier de fichiers JSON, sans réseau |

```bash
npm run build:static   # build depuis examples/static-event/
npm run dump:static    # rafraîchit examples/static-event/ depuis l’API
```

Le format des fichiers statiques est documenté dans
[`examples/static-event/README.md`](examples/static-event/README.md).

## Vérifications

```bash
npm test               # tests unitaires
npm run test:build     # dist/ complet et navigable (liens internes)
npm run test:seo       # titres, descriptions, sitemap
npm run knip           # code et dépendances orphelins
```

La progression de l’extraction vers un socle réutilisable est suivie dans
[`ROADMAP-MARQUE-BLANCHE.md`](ROADMAP-MARQUE-BLANCHE.md).
