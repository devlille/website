# Roadmap — Extraction vers un socle marque blanche

> Objectif : extraire le cœur réutilisable du site DevLille vers un paquet
> « conference-kit », capable de fonctionner avec **ou sans** le backend actuel.
>
> Document de travail. Chaque phase est livrable indépendamment et laisse le site
> DevLille en état de marche.

---

## Sommaire

- [Constat de départ](#constat-de-départ)
- [Architecture cible](#architecture-cible)
- [Phase 0 — Filet de sécurité (tests)](#phase-0--filet-de-sécurité-tests-) ✅
- [Phase 1 — Couche données : domaine + port + adapter HTTP](#phase-1--couche-données--domaine--port--adapter-http) ✅
- [Phase 2 — Nettoyage et corrections](#phase-2--nettoyage-et-corrections) ✅
- [Phase 3 — Adapter statique (le « sans backend »)](#phase-3--adapter-statique-le--sans-backend-) ✅
- [Phase 4 — Config et contenu](#phase-4--config-et-contenu)
- [Phase 5 — Thème et assets](#phase-5--thème-et-assets)
- [Phase 6 — Extraction du paquet](#phase-6--extraction-du-paquet)
- [Décisions à arbitrer](#décisions-à-arbitrer)
- [Annexe — Inventaire des points durs](#annexe--inventaire-des-points-durs)

---

## Constat de départ

Trois choses empêchent aujourd'hui l'extraction :

1. **Aucune couche données.** `fetch()` est appelé depuis 7 endroits, dont 3 avec
   l'URL et l'UUID de l'événement en dur. L'endpoint agenda est appelé 3 fois par
   build, `partners/activities` 4 fois. Impossible de brancher une autre source
   sans toucher aux pages Astro.
2. **Le métier DevLille est dans le code générique.** Libellés de packs sponsors,
   heuristiques sur les noms de salles, textes français, adresse du Grand Palais,
   tarifs — tout est inline dans les composants et le layout.
3. **Pas de tests, typage faible.** `getTalksByDate.ts` est intégralement en `any`,
   `Timeline` reçoit `data: any[]`. Or c'est précisément le contrat qu'on va publier.

**Règle de discipline à tenir sur toute la roadmap :**

> Aucun composant ni page ne fait de `fetch`.
> Aucun composant ne contient de texte en dur.
> Aucun composant ne contient de couleur en dur.

---

## Architecture cible

```
packages/conference-kit/          # le produit marque blanche
  src/
    domain/                       # types : Event, Talk, Speaker, Partner,
                                  #         Activity, Faq, Job, Slot, Day
    ports/
      data-source.ts              # interface EventDataSource
    adapters/
      http/                       # l'API actuelle : fetch + mapping API→domaine
      static/                     # JSON / YAML / Markdown local
      memory/                     # fixtures pour les tests
    core/                         # logique pure, testée :
                                  #   groupBySlot, expandDays, sortTiers,
                                  #   normalizeSocials, formatDate
    components/                   # composants Astro : ni texte, ni couleur en dur
    styles/                       # tokens + styles de composants
    i18n/

apps/devlille/                    # le site actuel
  content/                        # textes, équipe, verbatims, presse, éditions
  theme/                          # tokens.css, logo, favicon, sprite, polices
  site.config.ts
  event.config.ts
  integrations.config.ts
```

Le contrat central :

```ts
// packages/conference-kit/src/ports/data-source.ts
export interface EventDataSource {
  getEvent(): Promise<Event>;
  getAgenda(): Promise<Agenda>;        // sessions + speakers + schedules
  getSpeakers(): Promise<Speaker[]>;
  getPartners(): Promise<Partner[]>;
  getActivities(): Promise<Activity[]>;
  getJobs(): Promise<Job[]>;
  getFaq(): Promise<FaqEntry[]>;
  getVideos(): Promise<Video[]>;
}
```

Sélection de l'implémentation par variable d'environnement :
`DATA_SOURCE=http` (défaut) | `static`.

---

## Phase 0 — Filet de sécurité (tests) ✅

> **Pourquoi d'abord :** tout le reste est du déplacement de code. Sans tests sur la
> logique pure, on ne saura pas ce qu'on casse. Rien ne bouge dans cette phase.

### Tâches

- [x] Ajouter Vitest (`vitest`, `@vitest/coverage-v8`) + script `npm test`
      (+ `test:watch`, `test:coverage`, et l'étape dans la CI CleverCloud).
- [x] Extraire les fonctions pures actuellement enfouies dans les `.astro` / loaders
      vers des modules testables (sans changer leur comportement) :
  - [x] `getTalksByDate.ts` → `src/core/agenda.ts` : groupement jour/créneau,
        calcul de durée, tri des slots, `guessEventTitle`
  - [x] `getActivitiesByDate.ts` → `src/core/date.ts` (`eachDayBetween`,
        `toDateOnly`, `formatLocalDate`) et `src/core/activities.ts` (groupement)
  - [x] `content.config.ts` → `src/core/socials.ts` (`normalizeSocials`,
        `getSocialUrl`) et `src/core/partners.ts` (`formatPartner`,
        `normalizeSponsorUrl`, `applySponsoringOverride`, `buildPartnerActivities`)
  - [x] `sponsors.astro` → `src/core/sponsor-tiers.ts` : les 7 filtres
        copiés-collés deviennent une table `SPONSOR_TIERS` + une seule boucle
- [x] Écrire les tests **en TDD** sur ces fonctions, à partir d'un dump réel de l'API
      figé en fixture (`test/fixtures/agenda.json`, `test/fixtures/partners.json`).
- [x] Cas limites à couvrir explicitement :
  - [x] activité à cheval sur deux jours (`eachDayBetween`)
  - [x] session sans speaker, `session_id === "null"`
  - [x] social d'un type inconnu → filtré
  - [x] `siteUrl` sans schéma → préfixé en `https://`
  - [x] partenaire sans logo / sans description

### Critère de sortie

`npm test` vert, les fixtures capturent le comportement actuel (bugs compris — on les
corrige en phase 2, test à l'appui).

**Atteint.** 91 tests répartis sur 6 fichiers, 100 % des lignes de `src/core`
couvertes (95 % des branches).

Non-régression vérifiée par comparaison des `dist/` avant et après extraction :
`/agenda`, `/animations`, `/faq`, `/offres-emploi`, `/a-propos` et les 61 pages
partenaires sont **identiques au octet près**. Les seuls écarts (index, pages
speakers et talks, sitemap) proviennent du non-déterminisme déjà inventorié en
phase 2 : verbatim aléatoire, 3 vidéos YouTube tirées au sort,
`?v=${Math.random()}` sur les photos et `sitemap.lastmod`.

### Ce que la phase 0 a mis au jour

- `ApiPartnerType` décrivait les packs comme `{ id, name, order }` ; l'API renvoie
  en réalité un simple `string[]`. Typage corrigé (`ApiPartnerResponse.types`).
- Deux comportements douteux sont désormais **figés par un test** plutôt que
  corrigés, pour rester dans le périmètre de la phase (voir phase 2) :
  `buildPartnerActivities` qui ne reconnaît aucune activité, et
  `normalizeSponsorUrl` qui teste `includes("https://")` au lieu de `startsWith`.

## Phase 1 — Couche données : domaine + port + adapter HTTP ✅

> **Le cœur de l'extraction.** À la fin de cette phase, plus aucune page ne fetch.

### Tâches

- [x] Définir les types du domaine dans `src/data/domain.ts`.
      Ils décrivent **ce dont l'UI a besoin**, pas la forme de la réponse API
      (donc : `camelCase`, pas de `partner_id`, pas de champ optionnel « au cas où »).
- [x] Définir `EventDataSource` dans `src/data/ports/data-source.ts`.
- [x] Implémenter `src/data/adapters/http/` :
  - [x] un seul point de configuration pour la base URL et l'`eventId` (fin des UUID en dur)
  - [x] **mémoïsation par endpoint** : l'agenda n'est récupéré qu'une fois par build
  - [x] le mapping API→domaine y descend intégralement
        (`toPartners`, `toAgenda`, `toActivities`, `toJobOffers`, `toEventInfo`,
        `parseYoutubeFeed`) — `src/data/adapters/http/mappers.ts`
  - [ ] sanitisation du Markdown/HTML issu du backend — **reportée en phase 2**
        (voir « Sécurité ») : le domaine transporte le Markdown brut, le rendu
        `marked` reste dans les templates. La sanitiser ici imposait de choisir
        entre Markdown brut (nécessaire à `stripMarkdown` des meta-descriptions)
        et HTML rendu ; l'arbitrage est fait en même temps que le renderer commun.
- [x] Réécrire `src/content.config.ts` : les loaders appellent la source de données,
      les schémas Zod valident le **domaine**.
- [x] Migrer les appels directs, un par un :
  - [x] `src/utils/getTalksByDate.ts` (constante `AGENDA_URL` en dur → supprimée)
  - [x] `src/pages/faq.astro`
  - [x] `src/pages/offres-emploi.astro`
  - [x] `src/pages/partner-[id].astro` (2 fetch dans `getStaticPaths` → 0 :
        `partners/activities` porte déjà `jobs` et `speakers`, l'endpoint
        `partners` était redondant et n'est plus appelé du tout)
- [x] Typer `Timeline`, `TalkItem`, `AnimationItem` avec le domaine (fin des `any`).

### Critère de sortie

- [x] `grep -rn "fetch(" src/pages src/components src/utils` → un seul résultat,
      le `fetch` **client** du bouton favori (vote OpenFeedback), pas un appel de build.
- [x] `grep -rn "cleverapps.io\|7193c477" src/` → uniquement dans `src/config/config.ts`.
- [x] HTML de sortie vérifié par diff (326 fichiers de part et d'autre, aucun
      manquant ni ajouté). Voir « Écarts assumés » ci-dessous.
- [x] Nombre d'appels HTTP au build : **de 10 à 4** (mesuré), soit **1 par endpoint** :
      `agenda`, `partners/activities`, `events/{id}`, flux RSS YouTube.

**Atteint.** 118 tests sur 7 fichiers, 99,5 % des lignes de `src/core` + `src/data`
couvertes. Aucune occurrence de `any` dans `src/`.

### Architecture livrée

```
src/data/
  domain.ts                    # Event, Agenda, Session, Speaker, Partner,
                               # Activity, Job, FaqEntry, Video — camelCase
  ports/data-source.ts         # interface EventDataSource
  adapters/http/
    api-types.ts               # formes brutes de l'API, ne sortent pas d'ici
    mappers.ts                 # API -> domaine, fonctions pures et testées
    index.ts                   # fetch + mémoïsation par endpoint
  index.ts                     # sélection par DATA_SOURCE (http par défaut)
```

### Écarts assumés sur le HTML produit

Après neutralisation des non-déterminismes déjà inventoriés (`?v=${Math.random()}`,
3 vidéos YouTube tirées au sort, `sitemap.lastmod`), il ne reste que deux écarts,
tous deux volontaires :

1. **Bouton favori** — l'URL de vote (qui contenait l'UUID de l'événement en dur)
   est désormais injectée via `data-vote-api`, dérivée de la config. Ajoute un
   attribut sur `/agenda` et les fiches de talk. Effet de bord : l'import de la
   config dans `FavoriteButton.astro` change l'**ordre** de deux règles CSS
   scopées indépendantes sur `/agenda` (même contenu, aucun effet visuel).
2. **Fiches partenaires** — `const video = undefined` devient `const video = null`
   dans le `<script>` de debug, le domaine exprimant l'absence par `null`. Ce
   script disparaît en phase 2.

À surveiller : les mappers normalisent désormais les espaces insécables des titres
et résumés de session pour l'agenda comme pour les fiches de talk (avant, seules
les fiches le faisaient). Aucun impact sur le dump courant de l'API, mais l'agenda
affichera un espace normal là où il affichait un insécable si l'API en réintroduit.

---

## Phase 2 — Nettoyage et corrections ✅

> Indépendante des autres phases. Corrige des bugs réels sur le site en
> production, rend le build reproductible et supprime les `set:html` non filtrés.

### Bugs

- [x] `src/layouts/Layout.astro:23` et `:45` — template Eleventy jamais remplacé,
      publié tel quel dans le JSON-LD :
      `url: "https://www.billetweb.fr/devlille-{{ collections.config.edition }}"`
      (2 offres sur 3 concernées). Les trois offres dérivent désormais de
      `config.billetwebUrl` + `config.edition`.
- [x] `src/content.config.ts:222` — `buildPartnerActivities` lit `activity.partnerId`
      alors que l'API renvoie `partner_id`. La colonne « Activités » de l'audit est
      donc toujours `✗`. **Résolu en phase 1** : le domaine expose `partnerId`,
      l'audit lit des `Activity` et non plus la réponse brute.
- [x] `src/pages/agenda.astro:8` et `src/pages/animations.astro:8` — `const og = {…}`
      déclaré mais jamais passé à `<Layout>` : ces deux pages n'avaient **aucune
      balise Open Graph**. `og` est passé, et un `ogUrl` ajouté aux deux pages qui
      n'en portaient pas — elles ont maintenant `og:title`, `og:url`,
      `og:description`, `og:image` et `<meta name="description">`.
- [x] `src/layouts/Layout.astro` — `og.ogTitle` n'était jamais lu, alors que 3 pages
      le renseignent. `og:title` vaut désormais `ogTitle ?? title`.
- [x] `src/pages/index.astro` — `<picture>` imbriqué en double (bloc « scratch »).
- [x] `src/data/adapters/http/mappers.ts` — `normalizeSiteUrl` testait
      `siteUrl.includes("https://")` au lieu de `startsWith` : une URL sans schéma
      contenant `https://` dans un paramètre n'était pas préfixée. Le test qui
      figeait ce comportement en phase 0 a été retourné avant la correction.

### Déterminisme du build

- [x] `?v=${Math.random()}` sur les photos de speakers, supprimé aux **trois**
      endroits — `speakers.astro`, `talk-page-[id].astro` et
      `speaker-page-[id].astro`, ce dernier ne figurant pas à l'inventaire.
      Cassait le cache navigateur *et* le déterminisme du build.
- [x] `Layout.astro` (verbatim aléatoire) et `youtube-videos.astro` (3 vidéos
      aléatoires) — désormais tirés par `src/core/pick.ts` (FNV-1a + mulberry32 +
      Fisher-Yates), graine `verbatim-${edition}` / `videos-${edition}` : la
      sélection change d'une édition à l'autre, plus d'un build à l'autre.
- [x] `astro.config.mjs` — `sitemap.lastmod: new Date()` faisait churner tout le
      sitemap à chaque build nocturne. Remplacé par `config.contentUpdatedAt`,
      date de contenu bumpée à la main.

### Code mort et bruit

- [x] `src/layouts/Layout.astro:3` — `import editions` inutilisé.
- [x] `src/content.config.ts` — `fetchImage`, `getExtensionFromLogoUrl`,
      `tempFolder`, `ApiPartnerType` : **supprimés en phase 1** avec le chemin de
      téléchargement des logos.
- [x] `src/content.config.ts` — champ `jobs` du schéma sponsors. **Rempli depuis la
      phase 1** (`toPartner` mappe `partner.jobs`) : 14 fiches partenaires
      publient des offres, la colonne d'audit n'est plus systématiquement `✗`.
- [x] **18 `console.log`** ramenés à **0 en production** : les traces de debug de
      `partner-[id].astro` (build et client) sont supprimées, celle de
      `getTalksByDate.ts` devient un `console.error` explicite, et l'audit
      `console.table` des sponsors passe derrière `AUDIT_SPONSORS=1`.
- [x] Deux blocs de markup mort, expédiés sur **toutes** les pages, supprimés :
      la boucle Eleventy commentée de `Footer.astro` et le `<div>` de dates
      commenté de `Layout.astro`.
- [x] Dédupliquer `eachDayBetween` / `toDateOnly` / `formatLocalDate` :
      **fait en phase 0**, ils vivent dans `src/core/date.ts`.

### Sécurité

- [x] `marked` + `set:html` sans sanitisation sur des données backend (abstracts,
      bios, FAQ). Les **quatre** appels `marked` divergents des templates et le
      cinquième de `src/core/agenda.ts` sont remplacés par un
      `renderMarkdown()` unique — `src/core/markdown.ts` — qui rend *puis* assainit
      (`sanitize-html`, liste blanche calquée sur la sortie de `marked`, schémas
      `http`/`https`/`mailto`).
- [x] Remplacer les manipulations de HTML par chaînes par un renderer configuré :
  - `shiftHeadings` (`talk-page-[id].astro`) → `renderMarkdown(…, { headingOffset: 1 })`
  - `.replaceAll("h2", "p")` (`core/agenda.ts`) → `renderMarkdown(…, { flattenHeadings: true })`,
    qui n'aplatit plus le mot « h2 » présent dans le texte
  - la décoration de la FAQ (acronymes `<abbr>`, libellés d'actions en liens) sort
    du template vers `src/core/faq.ts`, avec échappement des attributs et
    échappement des métacaractères du libellé avant `new RegExp`

### Critère de sortie

- [x] `npm test` vert : **156 tests sur 10 fichiers** (+38, +3 fichiers).
- [x] `npx knip` sans signalement (aucun export ni dépendance orphelin).
- [ ] **Pas de vérification de types possible** : ni `typescript` ni
      `@astrojs/check` n'est installé, et `astro build` ne fait que retirer les
      annotations. Un `npm run check` (`astro check`) manque au filet de sécurité
      — à câbler avec la CI en phase 6, ou plus tôt si l'occasion se présente.
- [x] `npm run test:seo` vert (204 URLs, 77 titres et descriptions uniques).
- [x] **Build reproductible** : deux `npm run build` consécutifs produisent des
      `dist/` identiques au octet près. C'était l'objectif principal — il rend
      enfin la comparaison de `dist/` fiable pour les phases suivantes.

### Écarts assumés sur le HTML produit

Comparaison avec le `dist/` d'avant la phase (326 fichiers de part et d'autre,
aucun manquant ni ajouté). Tous les écarts sont voulus :

1. **JSON-LD** — les 3 offres portent la vraie URL de billetterie (2 portaient le
   template Eleventy non substitué). Change toutes les pages.
2. **Open Graph** — `/agenda` et `/animations` gagnent leurs balises ; les 3 pages
   qui renseignaient `ogTitle` voient enfin cette valeur dans `og:title` plutôt que
   le titre de page.
3. **Photos de speakers** — plus de `?v=NNN` aléatoire.
4. **Listes Markdown** — la normalisation des puces collées ne s'applique plus
   qu'aux puces **en milieu de ligne**. Conséquence : une liste déjà correctement
   formatée reste « serrée » (`<li>texte</li>`) au lieu d'être rendue « loose »
   (`<li><p>texte</p></li>`) — moins de marges parasites dans la FAQ et les
   résumés de talks. La contrainte « précédé d'un blanc » protège au passage
   `**gras** suivi` et `*italique* suivi`, que la normalisation unifiée coupait.
5. **Entités HTML** — `sanitize-html` normalise `&#39;` en `'`. Texte affiché
   identique.
6. **Markup mort** — les deux blocs commentés disparaissent de toutes les pages.

### Dépendance ajoutée

`sanitize-html` (+ `@types/sanitize-html`). Elle ne tourne qu'au build, jamais
dans le navigateur.

## Phase 3 — Adapter statique (le « sans backend ») ✅

> **C'est le livrable qui prouve que l'extraction fonctionne.** Un jeu de fixtures =
> un site complet, sans aucun appel réseau.

### Tâches

- [x] Choisir le format d'entrée : **JSON calqué sur le domaine**, cinq fichiers.
      Arbitré au profit du JSON plutôt que de collections Markdown parce que le
      cœur des données est relationnel (`schedules` ↔ `sessions` ↔ `speakers`) :
      le Markdown aurait exigé un fichier de planning à part de toute façon,
      plus un parseur YAML. Surtout, le JSON permet que **les fichiers soient le
      domaine sérialisé**, donc zéro mapping dans l'adapter et un aller-retour
      vérifiable par test.
- [x] Implémenter `src/data/adapters/static/` conforme à `EventDataSource`.
- [x] Valider les fichiers d'entrée avec les **mêmes schémas Zod** que les
      collections de contenu : les schémas sont remontés de `content.config.ts`
      vers `src/data/schemas.ts`, désormais l'unique définition. Un fichier mal
      formé fait échouer le build en nommant le fichier **et** le chemin du
      champ fautif (`[3].jobs[1].publishDate`).
- [x] Fournir un jeu d'exemple complet et documenté (`examples/static-event/`) :
      instantané de l'API de production — 71 créneaux, 352 sessions,
      77 speakers, 61 partenaires, 32 offres, 36 animations, 15 vidéos, 9 FAQ —
      régénérable par `npm run dump:static`.
- [x] CI : `.github/workflows/static-build.yml` build le site avec
      `DATA_SOURCE=static` sur les fixtures, **tout trafic HTTP sortant coupé**
      (proxy mort + `NODE_USE_ENV_PROXY`), puis vérifie le résultat.
- [x] Documenter la marche à suivre pour un organisateur non-développeur :
      `examples/static-event/README.md` — les cinq fichiers champ par champ, les
      conventions (Markdown, dates, `null` vs liste omise), et les trois
      messages d'erreur possibles avec leur traduction en geste correctif.

### Critère de sortie

`DATA_SOURCE=static npm run build` produit un site complet et navigable, sans réseau.

**Atteint, et plus que cela : le `dist/` produit est identique au octet près à
celui du build HTTP** (326 fichiers de part et d'autre, `diff -r` muet).

Vérification faite dans les conditions les plus défavorables : cache de contenu
d'Astro supprimé (`.astro/data-store.json`, `.astro/collections`) et
`HTTP_PROXY`/`HTTPS_PROXY` pointés sur un port fermé. Le contrôle est concluant
dans les deux sens — le même environnement fait **échouer** le build HTTP
(`fetch failed / ECONNREFUSED`, 0 page produite) et laisse le build statique
intact (206 pages).

- [x] `npm test` vert : **173 tests sur 12 fichiers** (+17, +2 fichiers).
      `src/data/adapters/static` couvert à 100 % des lignes.
- [x] `npx knip` sans signalement.
- [x] `npm run test:seo` vert sur le build statique (77 titres et descriptions
      uniques).
- [x] `npm run test:build` — nouveau : 206 pages, **4 985 liens internes tous
      résolus**, et chaque famille de pages alimentée par une source présente.

### Architecture livrée

```
src/data/
  schemas.ts                   # schémas Zod du domaine — définition unique,
                               # partagée par l'adapter statique et les
                               # collections de contenu
  adapters/
    once.ts                    # mémoïsation, partagée par les deux adapters
    static/index.ts            # lecture + validation des 5 fichiers JSON

examples/static-event/         # le jeu de démonstration, et sa documentation
  event.json  agenda.json  partners.json  activities.json  videos.json
  README.md

scripts/
  dump-static.mjs              # HTTP -> fichiers statiques (npm run dump:static)
  check-static-build.mjs       # dist/ complet et navigable (npm run test:build)
```

Sélection par variable d'environnement :

| `DATA_SOURCE` | Source | Dossier |
|---|---|---|
| `http` (défaut) | l'API DevLille | — |
| `static` | fichiers JSON locaux | `STATIC_DATA_DIR`, défaut `examples/static-event` |

### Ce qui garantit que le format ne dérivera pas

Le format statique n'est pas un format de plus : c'est `domain.ts` sérialisé.
Trois garde-fous le maintiennent :

1. `test/data/adapters-agree.test.ts` — ce que produit l'adapter HTTP à partir
   des fixtures d'API est réinjecté dans l'adapter statique et doit ressortir
   **identique**. Tout écart entre `domain.ts` et `schemas.ts` casse ce test.
2. `schemas.ts` est l'unique définition des schémas : `content.config.ts` ne
   décrit plus les mêmes champs une seconde fois.
3. Un test vérifie que le jeu livré reste valide **et** référentiellement
   cohérent (aucun créneau vers une session inconnue, aucun `speakerId` ni
   `partnerId` orphelin).

### Ce que la phase 3 a mis au jour

- `src/pages/sponsors.astro` n'existe plus : la liste des partenaires est un
  composant de la page d'accueil (`src/components/sponsors.astro`). L'inventaire
  de la phase 0 le désignait encore comme une page.
- Le `recurrence` d'un salaire est exigé par le format mais n'est affiché nulle
  part (`JobCard.astro` ne rend que `min`, `max` et `requirements`). Aucune
  offre du dump n'a d'ailleurs de salaire renseigné. Candidat à la suppression
  du domaine.
- Toujours **pas de vérification de types** : ni `typescript` ni
  `@astrojs/check` n'est installé. L'adapter statique s'en passe en faisant
  inférer ses types de retour par les schémas (`z.infer`) plutôt qu'en les
  affirmant par un cast : une dérive schéma/domaine deviendra une erreur de
  compilation le jour où `astro check` sera câblé, au lieu d'être silencieuse.

### Dépendance ajoutée

`vite` en `devDependencies`. Elle était déjà installée (dépendance directe
d'Astro) : la déclarer ne change rien à l'arbre, elle rend seulement honnête
l'usage qu'en fait `scripts/dump-static.mjs` pour charger le TypeScript du site
avec le resolveur d'Astro. Aucun code de production ne l'importe.

---

## Phase 4 — Config et contenu

### Découper la config

`src/config/config.ts` mélange aujourd'hui identité, dates, intégrations, statistiques
et feature flags. À éclater :

- [ ] `site.config.ts` — nom, domaine, locale, réseaux sociaux, e-mail de contact
- [ ] `event.config.ts` — édition, dates, lieu (adresse + JSON-LD), tarifs, statistiques
- [ ] `integrations.config.ts` — API, billetterie, CFP, newsletter, playlist YouTube
- [ ] `features.ts` — les flags existants (`welovedevs`, `sponsoring`, `tickets`)
- [ ] **Valider ces configs avec Zod au démarrage.** Une instance marque blanche mal
      configurée doit échouer au build, pas produire une page cassée.

### Sortir le métier DevLille du code générique

- [ ] `src/core/sponsor-tiers.ts` — la table `SPONSOR_TIERS` remplace déjà les
      7 filtres copiés-collés de `sponsors.astro` (phase 0), mais ses libellés
      restent du DevLille en dur (`"Pack Gold"`,
      `"Partenaires DevLille Graine de Dev"`, `"Partenaire Hébergement"`…)
      → la table descend en configuration d'instance.
- [ ] `data/adapters/http/mappers.ts` `TIER_OVERRIDES` — un UUID Decathlon en dur dans ce
      qui deviendra du code partagé → config d'instance.
- [ ] `src/core/agenda.ts` `guessEventTitle()` — heuristiques 100 % DevLille : salle
      `"Grand Théâtre"`, plages horaires, libellés `"Keynote d'ouverture"` / `"Lunch"` /
      `"Pause"` → stratégie injectable, ou suppression en fiabilisant les données source.
- [ ] `FavoriteButton.astro` — `STORAGE_KEY = "devlille_favorites"` → dérivé du
      `site.config`. (L'URL de vote, elle, vient déjà de la config depuis la phase 1.)

### Sortir le contenu des templates

- [ ] `a-propos.astro` — l'équipe est en dur dans le HTML (~90 lignes) → collection
      `team` (Markdown + photo).
- [ ] `index.astro` — les 4 sections (lieu, accessibilité, écoresponsable, Graine de Dev)
      → collection `sections` ou config, avec image + titre + corps.
- [ ] `Layout.astro` — JSON-LD (adresse Grand Palais, tarifs), `<meta keywords>`,
      `theme-color`, titre → générés depuis `event.config` / `site.config`.
- [ ] `Footer.astro` — formulaire Mailchimp avec IDs de liste, liens sociaux, e-mail →
      config + composant newsletter paramétrable.
- [ ] `MainNav.astro` — items de nav en dur → `nav` en config.
- [ ] `press.ts` et `editions.ts` — ce sont des contenus, pas de la config → collections.

### i18n

- [ ] `locale` en config, `lang` du `<html>` dérivé.
- [ ] Helper `formatDate` centralisé : `formatLongDate` vit déjà dans
      `src/core/date.ts` (phase 0) mais la locale `"fr"` y est en dur, tout comme
      le `toLocaleString("fr-FR")` de `JobCard.astro`.
- [ ] Dictionnaire `t()` + extraction de toutes les chaînes des composants.
      Même sans jamais faire d'anglais, c'est ce qui permet de rebrander.

---

## Phase 5 — Thème et assets

État des lieux encourageant : **5 couleurs en dur** dans `main.css` contre
**122 `var(--…)`**. Le socle de tokens existe déjà.

### Tâches

- [ ] Déplacer `public/css/` vers `src/styles/` → Astro minifie et hashe,
      ce qui rend caduc le hack `postcss dist/css/*.css --replace` du script `build`.
- [ ] Corriger les 5 couleurs en dur restantes (`#000` ×3, `#ff0054`, `#003646`).
- [ ] Isoler `vars.css` comme **le seul fichier qu'une instance surcharge**.
- [ ] Sortir la police Outfit (`.ttf` aujourd'hui dans `public/css/`) vers les assets
      de thème.
- [ ] Conventionner les assets de marque : `/img/logodl.svg`, `/img/home-2026.svg`,
      `/img/sprite.svg`, favicons → un dossier `theme/` par instance, avec un manifeste.
- [ ] Vérifier que le sprite SVG (`SocialList.astro`) reste surchargeable.

---

## Phase 6 — Extraction du paquet

> À ne faire qu'une fois les phases 0 à 5 terminées : à ce stade c'est un simple
> déplacement de fichiers, protégé par les tests.

### Tâches

- [ ] Mettre en place le monorepo (`packages/conference-kit` + `apps/devlille`).
- [ ] Déplacer `domain/`, `ports/`, `adapters/`, `core/`, `components/`, `styles/`, `i18n/`.
- [ ] Définir les exports publics du paquet (le contrat versionné).
- [ ] `apps/devlille` ne contient plus que : config, contenu, thème, pages spécifiques.
- [ ] Adapter la CI (`deploy-clevercloud.yml`, `knip.yml`, `nightly-build.yml`).
- [ ] Rédiger le README du paquet : démarrer une instance en marque blanche.
- [ ] Créer une seconde instance de démonstration pour valider l'absence de fuite
      DevLille dans le paquet.

---

## Décisions à arbitrer

| Sujet | Options | Impact |
|---|---|---|
| ~~**Format de l'adapter statique**~~ | **Arbitré en phase 3 : JSON calqué sur le domaine.** Le relationnel de l'agenda imposait un fichier de planning à part quoi qu'il arrive ; le JSON permet en prime que les fichiers *soient* le domaine, donc aucun mapping et un aller-retour testable. | — |
| **Structure des URLs** | Garder `/talk-page-{id}` *vs* passer à `/talks/{id}` | Le second est conventionnel pour un produit réutilisable, mais impose des redirections pour préserver le référencement existant. |
| **Périmètre du paquet** | Composants inclus *vs* données seules | Extraire aussi les composants donne un vrai produit, mais impose la discipline « ni texte ni couleur en dur ». Extraire seulement la couche données est plus rapide mais moins réutilisable. |
| **Monorepo** | npm workspaces *vs* pnpm *vs* garder un seul dépôt | Choix à faire avant la phase 6 seulement. |

---

## Annexe — Inventaire des points durs

### Les appels `fetch` supprimés en phase 1 ✅

| Fichier | Endpoint | Remarque |
|---|---|---|
| `src/content.config.ts:152` | `partners/activities` | loader sponsors |
| `src/content.config.ts:316` | `agenda` | **URL + UUID en dur** |
| `src/content.config.ts:381` | `agenda` | **URL + UUID en dur** |
| `src/content.config.ts:511` | `partners/activities` | loader partnerActivities |
| `src/utils/getTalksByDate.ts:8` | `agenda` | **URL + UUID en dur** |
| `src/pages/faq.astro:13` | `events/{id}` | appel direct depuis une page |
| `src/pages/offres-emploi.astro:16` | `partners/activities` | appel direct depuis une page |
| `src/pages/partner-[id].astro:23-26` | `partners/activities` + `partners` | 2 appels dans `getStaticPaths` |

Soit **3 appels à `agenda`** et **4 à `partners/activities`** par build, sans cache.

Tous passent désormais par `EventDataSource`. L'endpoint `partners` a disparu
(`partners/activities` porte déjà `jobs` et `speakers`), et chaque endpoint restant
n'est appelé qu'une fois : la source est ancrée sur `globalThis`, Astro évaluant
`src/data` dans deux graphes de modules distincts (loaders de contenu et bundle
des pages).

### Fichiers les plus couplés à DevLille

| Fichier | Nature du couplage |
|---|---|
| `src/layouts/Layout.astro` | JSON-LD (adresse, tarifs), meta, titre, logo, verbatim |
| `src/pages/index.astro` | 4 sections de contenu entièrement en dur |
| `src/pages/a-propos.astro` | équipe en dur dans le HTML |
| `src/components/Footer.astro` | Mailchimp, liens sociaux, e-mail, stores |
| `src/core/agenda.ts` | heuristiques de salles et d'horaires (`guessEventTitle`) |
| `src/core/sponsor-tiers.ts` | libellés des packs de sponsoring |
| `src/data/adapters/http/mappers.ts` | `TIER_OVERRIDES` (un UUID en dur) |
| `src/config/config.ts` | 4 responsabilités mélangées |

### Métriques de suivi

| Indicateur | Avant phase 0 | Aujourd'hui | Cible |
|---|---|---|---|
| Appels HTTP par build | 10 | **4** | 3 |
| `fetch` hors couche données | 8 | **0** | 0 |
| Fichiers de test | 0 | **12** | ≥ 8 |
| Tests | 0 | **173** | — |
| `console.log` en production | 18 | **0** | 0 |
| Appels `marked` divergents | 5 | **0** | 0 |
| Build reproductible | non | **oui** | oui |
| Sources de données | 1 | **2** (`http`, `static`) | ≥ 2 |
| Build possible sans réseau | non | **oui** | oui |
| Couleurs en dur (CSS) | 5 | 5 | 0 |
| Occurrences de `any` dans `src/` | 23 | **0** | 0 |
| Pages déclarant un `og` non publié | 2 | **0** | 0 |
