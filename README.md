# Site DevLille

Site de la conférence [DevLille](https://devlille.fr), en Astro.

Le dépôt est en **pnpm** (version épinglée par `packageManager`).

```bash
pnpm install
pnpm dev               # http://localhost:4321
pnpm build             # -> dist/
pnpm test              # tests unitaires
```

## Sources de données

Le site ne fait aucun `fetch` en dehors de `src/data/` : tout passe par le port
`EventDataSource`. Deux implémentations, choisies par `DATA_SOURCE` :

| `DATA_SOURCE` | Source |
|---|---|
| `http` (défaut) | l’API DevLille |
| `static` | un dossier de fichiers JSON, sans réseau |

```bash
pnpm build:static      # build depuis examples/static-event/
pnpm dump:static       # rafraîchit examples/static-event/ depuis l’API
```

Le format des fichiers statiques est documenté dans
[`examples/static-event/README.md`](examples/static-event/README.md).

## Vérifications

```bash
pnpm test              # tests unitaires
pnpm check             # types (`astro check`)
pnpm test:build        # dist/ complet et navigable (références internes)
pnpm test:seo          # titres, descriptions, sitemap
pnpm knip              # code et dépendances orphelins
```

La progression de l’extraction vers un socle réutilisable est suivie dans
[`ROADMAP-MARQUE-BLANCHE.md`](ROADMAP-MARQUE-BLANCHE.md).
