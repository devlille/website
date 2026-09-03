# Thème de l'instance

Tout ce qui distingue visuellement cette instance tient ici et dans
`public/theme/`. Une autre conférence remplace ces fichiers par les siens et n'a
rien d'autre à toucher.

| Fichier | Rôle |
|---|---|
| `tokens.css` | couleurs, voiles, ombres, police, visuels de fond — **le seul fichier de style à surcharger** |
| `fonts.css` + `fonts/` | les `@font-face` et leurs fichiers, résolus et hashés par Vite |
| `theme.config.ts` | manifeste des assets de marque, validé par Zod |

Les feuilles du socle (`src/styles/main.css`, `src/styles/queries.css`) ne
contiennent **aucune couleur littérale ni aucun chemin de fichier de marque** :
elles ne lisent que les jetons de `tokens.css`.

## Assets de marque — `public/theme/`

Servis tels quels, sous les noms que déclare `theme.config.ts`.

| Fichier | Rôle | Appelé par |
|---|---|---|
| `logo.svg` | logo de l'en-tête | `theme.logo` |
| `hero.svg` | visuel de la une | `theme.hero` et `--hero-image` |
| `og.png` | image des cartes de partage | `theme.ogImage` |
| `favicon.svg`, `favicon.png` | icônes d'onglet | `theme.favicons` et `--favicon-image` |
| `sprite.svg` | icônes des réseaux sociaux | `theme.sprite` |
| `hero-bg.svg`, `hero-bg2.svg` | fonds décoratifs | `--hero-bg-image`, `--hero-bg-image-2` |
| `icon48/128/192/512.png` | icônes de l'application installable | `manifest.json` |

Les noms sont déclarés à deux endroits, et nulle part ailleurs :

- `src/theme/theme.config.ts` pour ce que lisent les composants ;
- `src/theme/tokens.css` pour ce qu'appellent les feuilles de style.

Le sprite doit exposer un symbole par identifiant utilisé : `ic-youtube`,
`ic-bluesky`, `ic-mastodon`, `ic-linkedin`, `ic-apple`, `ic-android`,
`ic-twitter`, `ic-instagram`, `ic-github`, `ic-website`. Les six premiers sont
choisis par `site.config.ts` (liens du pied de page), les autres par le type de
réseau social que renvoie la source de données.
