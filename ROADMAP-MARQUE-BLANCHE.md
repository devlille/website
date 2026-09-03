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
- [Phase 4 — Config et contenu](#phase-4--config-et-contenu) ✅
- [Phase 5 — Thème et assets](#phase-5--thème-et-assets) ✅
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

## Phase 4 — Config et contenu ✅

> Sépare ce qui appartient au DevLille de ce qui appartiendra au paquet.
> À la fin de cette phase, aucun composant ne porte de texte, d'URL ni de
> valeur métier en dur.

### Découper la config

`src/config/config.ts` mélangeait identité, dates, intégrations, statistiques
et feature flags. Éclaté en quatre fichiers, tous validés par Zod :

- [x] `site.config.ts` — nom, domaine, locale, réseaux sociaux, e-mail de
      contact, mots-clés, couleur de thème, organisateur, **navigation** et
      **liens de pied de page**
- [x] `event.config.ts` — édition, dates, fuseau, lieu (adresse JSON-LD),
      tarifs, statistiques, **packs de sponsoring**, **overrides de pack**,
      **règles de libellé des créneaux**
- [x] `integrations.config.ts` — API, billetterie (gabarit d'URL), newsletter,
      playlist YouTube, dossiers de partenariat
- [x] `features.ts` — les trois drapeaux existants
- [x] **Configs validées par Zod au chargement du module.** Une instance mal
      configurée échoue au build en nommant le fichier et le chemin du champ :

      event.config.ts ne respecte pas le format attendu :
        - startDate : date `YYYY-MM-DD`
        - ticketing.offers[1].name : Too small: expected string to have >=1 characters

      Le formatage des erreurs (`src/core/zod-errors.ts`) est celui de
      l'adapter statique, remonté et partagé.

Les composants importent `src/config/index.ts`, jamais un fichier de config
directement : c'est lui qui expose les valeurs dérivées (`lang`, `ticketsUrl`,
`favoritesStorageKey`).

### Sortir le métier DevLille du code générique

- [x] `src/core/sponsor-tiers.ts` — la table descend en configuration
      (`event.sponsorTiers`). `match: (s) => boolean` devient
      `labels: string[]` : sérialisable, donc validable, et `groupSponsorsByTier`
      reçoit la table en paramètre au lieu de la connaître.
- [x] `data/adapters/http/mappers.ts` `TIER_OVERRIDES` — l'UUID Decathlon en dur
      devient `event.sponsorTierOverrides`, injecté dans
      `createHttpDataSource({ tierOverrides })`.
- [x] `src/core/agenda.ts` `guessEventTitle()` — les heuristiques deviennent
      `resolveSlotTitle()`, un moteur de règles déclaratives lu dans
      `event.slotTitles` (`room`, `fromHour`, `beforeHour`, puis
      `titleContains` / `titleEquals`). Plus une seule salle ni un seul horaire
      DevLille dans `src/core`.
- [x] `FavoriteButton.astro` — `STORAGE_KEY` et les deux libellés passent par
      des `data-*`, dérivés de `site.id` et du dictionnaire. Idem pour
      `FavoritesSwitch.astro`, qui portait la même clé en double.
- [x] `Timeline.astro` — `Europe/Paris` en dur dans le script de défilement
      devient `event.timezone`, transmis par `data-timezone`. (Point non
      inventorié : trouvé en cours de phase.)

### Sortir le contenu des templates

Cinq collections de contenu nouvelles, toutes typées :

| Collection | Source | Remplace |
|---|---|---|
| `team` | `src/content/team/*.md` | ~90 lignes de HTML dans `a-propos.astro` |
| `sections` | `src/content/sections/*.md` | les 4 sections de `index.astro` |
| `blocks` | `src/content/blocks/*.md` | l'encart bénévoles de `a-propos.astro` |
| `editions` | `src/content/editions/editions.json` | `src/config/editions.ts` |
| `pressKit` + `pressArticles` | `src/content/press/*.json` | `src/config/press.ts` |

- [x] `a-propos.astro` — l'équipe et son encart sont du contenu ; la page ne
      porte plus que la mise en page.
- [x] `index.astro` — les 4 sections deviennent des fichiers Markdown avec
      titre, illustrations et lien optionnel. `variant` (`venue` / `decor`)
      choisit la mise en page, `Illustration.astro` factorise le `<picture>`.
- [x] `Layout.astro` — JSON-LD, `<meta keywords>`, `theme-color`, `lang`, titre :
      tout se déduit de la config. Le JSON-LD sort dans
      `src/core/event-jsonld.ts`, fonction pure et testée.
- [x] `Footer.astro` — le formulaire Mailchimp devient `Newsletter.astro`,
      paramétré par `integrations.newsletter` (action, champs cachés,
      pot-de-miel, feuille de style, script, badge). Liens sociaux, liens de
      pied de page et e-mail viennent de `site.config.ts` ; un lien peut être
      conditionné à un drapeau (`feature: "sponsoring"`).
- [x] `MainNav.astro` — les items viennent de `site.nav`.
- [x] `press.ts` et `editions.ts` — supprimés, devenus des collections.

### i18n

- [x] `locale` en config (`fr-FR`), `lang` du `<html>` dérivé.
- [x] `formatLongDate(date, locale)` — la locale n'est plus en dur, et un
      formateur `Intl` est mémoïsé par locale. Elle traverse `buildTalkDays`
      (via un objet d'options `{ slotTitles, locale }`) et
      `groupActivitiesByDate` / `groupActivitiesByDay`. `JobCard.astro` formate
      les salaires avec la même locale.
- [x] Dictionnaire `src/i18n/` : `translate.ts` (moteur, marqueurs `{nom}`),
      `fr.ts` (62 messages), `index.ts` (le `t` lié à la locale de l'instance).
      Une clé inconnue **ou un paramètre manquant lève** — mieux vaut un build
      rouge qu'un `{name}` publié.
- [x] Toutes les chaînes des composants et des pages de listing / fiches sont
      extraites. Restent en dur, volontairement, les **pages purement
      éditoriales** (`code-conduite`, `privacy-mobile`, `promo`, `404`) : c'est
      du contenu d'instance, qu'une autre conférence réécrit entièrement.

### Critère de sortie

- [x] `npm test` vert : **202 tests sur 18 fichiers** (+29, +6 fichiers).
      99,7 % des lignes de `src/config`, `src/core`, `src/data` et `src/i18n`.
- [x] `npx knip` sans signalement.
- [x] `npm run test:seo` vert (204 URLs, 77 titres et descriptions uniques).
- [x] `npm run test:build` vert (206 pages, 4 985 liens internes résolus).
- [x] **Build HTTP et build statique toujours identiques au octet près.**
- [x] **Build toujours reproductible** et toujours possible sans réseau
      (proxy mort + `NODE_USE_ENV_PROXY`, 206 pages).
- [x] Une config invalide **fait échouer le build** en nommant le champ fautif
      (vérifié en cassant volontairement `event.config.ts`).

### Écarts assumés sur le HTML produit

326 fichiers de part et d'autre, aucun manquant ni ajouté. L'audit automatisé
ne relève aucun écart hors de cette liste :

1. **Échappement d'entités** — les textes passent désormais par des expressions
      (`{t(…)}`, `{event.tagline}`) : Astro y échappe `'` en `&#39;` et `&` en
      `&amp;`. Rendu strictement identique.
2. **Espaces manquants corrigés** — le découpage JSX collait certains mots :
      `l'édition2026!`, `présentés parAnaïs Moulin`, `avec<strong>Zenika`,
      `<strong> Exotec`. Les messages du dictionnaire rétablissent l'espace.
3. **Markup mort supprimé** — le lien CFP commenté et le bloc `<section class="news">`
      commenté, tous deux expédiés sur la page d'accueil.
4. **Pot-de-miel Mailchimp** — le commentaire `/* real people should not fill
      this in… */`, jusqu'ici publié comme **texte visible** dans un `<div>`
      masqué, devient un commentaire HTML.
5. **Apostrophes typographiques** — `smartypants` est désactivé : le Markdown
      local sort tel qu'il est écrit. Seul le verbatim affiché change
      (`s’appuyer` -> `s'appuyer`), et il est désormais fidèle à son fichier
      source.
6. **`/agenda`** — la description Open Graph reprend `event.tagline`, la
      formulation canonique (« à tous et à toutes »), au lieu de sa variante
      locale. Le script de défilement lit son fuseau dans un `data-timezone`.
7. **`/press`** — un `;` parasite entre `</dl>` et `</article>` disparaît.
8. **Ordre de deux règles CSS scopées** sur `/agenda`, comme en phase 1 : même
      contenu, aucun effet visuel.

### Ce que la phase 4 a mis au jour

- **`z.string().url()` *normalise* la valeur** dans le zod livré par Astro :
  il a encodé `{edition}` en `%7Bedition%7D`, ce qui a fait échouer la
  validation du gabarit d'URL de billetterie — et aurait silencieusement
  réécrit les URLs publiées. Toutes les validations d'URL passent désormais par
  une expression régulière non transformante. À garder en tête pour
  `src/data/schemas.ts`, qui n'utilise pas `.url()`.
- **Le HTML brut dans le Markdown local ne survit pas en ligne** : les liens
  automatiques de GFM ré-attaquent l'URL d'un attribut `href` et produisent un
  `<a>` imbriqué cassé. Un `<a>` doit donc être écrit dans un bloc HTML
  (paragraphe `<p>…</p>` à part entière), pas au fil d'un paragraphe Markdown.
  `markdown.rehypePlugins` n'est pas une porte de sortie : Astro 7 les a
  déplacés derrière un `@astrojs/markdown-remark` qui n'est plus installé.
- **Offsets JSON-LD non normalisés** : les trois offres publient `+2:00` là où
  l'événement publie `+02:00`. **Arbitré : conservé tel quel.** Le comportement
  est celui du site depuis l'origine ; il est désormais documenté et centralisé
  dans `src/core/event-jsonld.ts` plutôt que dispersé dans le template.
- **Clés de config sans consommateur**, supprimées au passage : `editionNumber`,
  `cfpUrl`, `cmsUrl`, `cfpStartedDate`, `cfpEndedDate`. Le drapeau `welovedevs`
  est dans le même cas mais reste, faute d'arbitrage.
- **`FavoritesSwitch.astro` portait une seconde copie** de la clé de stockage
  des favoris, absente de l'inventaire de départ.
- Toujours **pas de vérification de types** : ni `typescript` ni
  `@astrojs/check` n'est installé. Le typage de `t()` (clés littérales) et des
  configs (`z.input`) ne sera vraiment exploité qu'une fois `astro check` câblé.

### Architecture livrée

```
src/config/
  schema.ts                    # schémas Zod des quatre configs
  define.ts                    # validation au chargement du module
  site.config.ts               # identité, nav, liens, réseaux sociaux
  event.config.ts              # édition, lieu, tarifs, packs, règles d'agenda
  integrations.config.ts       # API, billetterie, newsletter, YouTube
  features.ts                  # drapeaux d'activation
  index.ts                     # point d'entrée + valeurs dérivées

src/i18n/
  translate.ts                 # moteur générique, marqueurs `{nom}`
  fr.ts                        # dictionnaire français
  index.ts                     # le `t` lié à la locale de l'instance

src/core/
  event-jsonld.ts              # données structurées schema.org, testées
  zod-errors.ts                # formatage des erreurs, partagé

src/content/
  team/  sections/  blocks/  editions/  press/
```

## Phase 5 — Thème et assets ✅

> Dernière phase avant l'extraction : elle sépare les feuilles du socle de
> l'identité visuelle de l'instance, et fait entrer le CSS dans le pipeline
> Astro.

### Tâches

- [x] Déplacer `public/css/` — mais en deux dossiers, pas un :
      `src/styles/` pour les feuilles du **socle**, `src/theme/` pour ce qui
      appartient à l'**instance**. `Layout.astro` les importe dans l'ordre
      thème puis socle ; Astro minifie (lightningcss), hashe et sert **un seul
      fichier** au lieu de trois. Le hack `postcss dist/css/*.css --replace`
      disparaît, avec les dépendances `postcss`, `postcss-cli` et `cssnano`.
- [x] Corriger les couleurs en dur : **34 occurrences, 20 valeurs distinctes**
      — et non 5. L'inventaire de départ ne comptait que les couleurs opaques
      (`#000` ×3, `#ff0054`, `#003646`) et oubliait les 29 `rgba()` de voile et
      d'ombre, qui sont pourtant ce qui casse un rebranding sur fond clair.
      Les feuilles du socle n'en contiennent plus **aucune**.
- [x] Isoler les jetons comme **le seul fichier qu'une instance surcharge** :
      `src/theme/tokens.css`. Il gagne les voiles (`--veil-05` … `--veil-80`),
      les assombrissements (`--shade-15` … `--shade-80`), les jetons du pied de
      page — qui étaient déclarés au milieu de `main.css` — et les visuels de
      fond (`--hero-image`, `--hero-bg-image`, `--favicon-image`).
- [x] Sortir la police Outfit vers `src/theme/fonts/`, son `@font-face` dans
      `src/theme/fonts.css`. Vite la résout et la hashe.
- [x] Conventionner les assets de marque : `public/theme/` et son manifeste
      `src/theme/theme.config.ts`, validé par le même `defineConfig` que les
      autres configs. Plus un seul chemin de fichier de marque dans un
      composant. `logodl.svg` devient `logo.svg`, `home-2026.svg` devient
      `hero.svg` : plus d'édition dans un nom de fichier.
- [x] Vérifier que le sprite SVG reste surchargeable : `SocialList.astro` et
      `Footer.astro` lisent `theme.sprite`. `src/theme/README.md` liste les dix
      symboles qu'un sprite d'instance doit exposer.

### Critère de sortie

- [x] `npm test` vert : **201 tests sur 18 fichiers** (un test de moins :
      celui qui couvrait `logoName`, supprimé du domaine — voir plus bas).
- [x] `npx knip` sans signalement.
- [x] `npm run test:seo` vert.
- [x] `npm run test:build` vert, et **élargi** : il ne suivait que les `href`,
      il suit maintenant aussi les `src` et les `og:image` absolus.
      **5 116 références internes** contrôlées au lieu de 4 985 liens.
- [x] **Build HTTP et build statique toujours identiques au octet près.**
- [x] **Build toujours reproductible** et toujours possible sans réseau.
- [x] Contrôle visuel dans le navigateur : accueil, agenda, fiche partenaire et
      page 404 rendent correctement.

### Ce que la phase 5 a mis au jour

- **Les 58 fiches partenaires avaient une `og:image` morte.** Elle pointait sur
  `/img/{logoName}.svg`, vestige du téléchargement des logos supprimé en
  phase 1 : le fichier n'a jamais existé dans `public/`. Elle vaut désormais le
  `logoUrl` du partenaire, avec l'image de l'instance en repli. Du coup
  `logoName` n'a plus aucun consommateur : **retiré du domaine**, des schémas,
  du jeu d'exemple et de sa documentation.
- **`/img/logo-full.svg`, l'`og:image` de tout le site, n'existait pas non
  plus.** Le fichier réel est `/img/promo/logo-full.png`, désormais copié en
  `public/theme/og.png` — un PNG, que les réseaux sociaux savent rendre,
  contrairement au SVG qui était déclaré.
- **La page `/404` chargeait `css/main.css` en relatif**, donc `/404/css/…` :
  elle serait restée sans style après le déplacement. Elle importe maintenant
  le thème et le socle comme `Layout.astro`, et lit ses favicons dans le
  manifeste.
- **Entrer dans le pipeline inverse l'ordre des feuilles** : les styles scopés
  des composants sont inlinés *avant* le lien vers le bundle, alors qu'ils
  venaient après. À spécificité égale, le socle l'emporte donc désormais. Une
  seule règle était concernée (`p.sponsor` de la fiche partenaire, en conflit
  avec `.h-group.sponsor p`) ; elle nomme maintenant son ancêtre. À surveiller
  à chaque nouveau `<style>` de composant.
- **Les `logoUrl` du jeu d'exemple ont expiré** : 42 des 61 renvoient 404, le
  CMS ayant fait tourner ses chemins de stockage depuis l'instantané de la
  phase 3. Sans effet sur la production (qui lit l'API), mais le jeu statique
  affiche des logos cassés — `npm run dump:static` le rafraîchit.
- `markdown.smartypants` est **déprécié en Astro 7** : l'option descend sur le
  processeur (`satteri({ features: { smartPunctuation: false } })`).

### Ce que cela coûte, ce que cela rapporte

| | Avant | Après |
|---|---|---|
| Requêtes CSS | 3 fichiers non hashés | **1 bundle hashé** |
| Police | servie non hashée depuis `public/` | **hashée**, résolue par Vite |
| CSS total | 40,5 ko | 41,9 ko |
| HTML total | 2 892 ko | 2 914 ko |

Les 22 ko de HTML en plus (≈ 107 octets par page) et les 1,4 ko de CSS sont le
prix des `var(--…)` non résolus : le socle ne cite plus de couleur, il cite un
jeton. En échange, le CSS et la police deviennent cachables indéfiniment.

### Architecture livrée

```
src/styles/                    # le socle : ni couleur, ni chemin de marque
  main.css  queries.css

src/theme/                     # l'instance
  tokens.css                   # LE fichier à surcharger pour rebrander
  fonts.css  fonts/            # @font-face et fichiers de police
  theme.config.ts              # manifeste des assets, validé par Zod
  README.md

public/theme/                  # les fichiers de marque, servis tels quels
  logo.svg  hero.svg  og.png  favicon.svg  favicon.png  sprite.svg
  hero-bg.svg  hero-bg2.svg  icon48/128/192/512.png
```

### Dépendance ajoutée, dépendances retirées

`@astrojs/markdown-satteri` passe en dépendance directe (elle était déjà
installée : c'est le processeur Markdown par défaut d'Astro 7) pour configurer
la ponctuation typographique sans passer par l'option dépréciée.

`postcss`, `postcss-cli` et `cssnano` sont retirées : la minification CSS est
faite par lightningcss, dans le build. `postcss` reste dans l'arbre comme
dépendance transitive de Vite.

---

## Phase 6 — Extraction du paquet

> À ne faire qu'une fois les phases 0 à 5 terminées : à ce stade c'est un simple
> déplacement de fichiers, protégé par les tests.

### Tâches

- [ ] Mettre en place le monorepo (`packages/conference-kit` + `apps/devlille`).
- [ ] Déplacer `src/data/`, `src/core/`, `src/components/`, `src/styles/`, `src/i18n/`
      vers le paquet ; `src/config/`, `src/theme/`, `src/content/`, `public/theme/`
      restent côté instance.
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

Tous découplés : le métier en phase 4, le thème et les assets en phase 5.

| Fichier | Nature du couplage | Statut |
|---|---|---|
| `src/layouts/Layout.astro` | JSON-LD (adresse, tarifs), meta, titre, logo | ✅ config + `core/event-jsonld.ts` |
| `src/pages/index.astro` | 4 sections de contenu entièrement en dur | ✅ collection `sections` |
| `src/pages/a-propos.astro` | équipe en dur dans le HTML | ✅ collections `team` et `blocks` |
| `src/components/Footer.astro` | Mailchimp, liens sociaux, e-mail, stores | ✅ config + `Newsletter.astro` |
| `src/core/agenda.ts` | heuristiques de salles et d'horaires | ✅ `resolveSlotTitle` + `event.slotTitles` |
| `src/core/sponsor-tiers.ts` | libellés des packs de sponsoring | ✅ `event.sponsorTiers` |
| `src/data/adapters/http/mappers.ts` | `TIER_OVERRIDES` (un UUID en dur) | ✅ `event.sponsorTierOverrides` |
| `src/config/config.ts` | 4 responsabilités mélangées | ✅ éclaté en 4 fichiers validés |
| `public/css/`, `public/img/` | couleurs, polices, logos, sprite | ✅ `src/theme/` + `public/theme/` |

### Métriques de suivi

| Indicateur | Avant phase 0 | Aujourd'hui | Cible |
|---|---|---|---|
| Appels HTTP par build | 10 | **4** | 3 |
| `fetch` hors couche données | 8 | **0** | 0 |
| Fichiers de test | 0 | **18** | ≥ 8 |
| Tests | 0 | **201** | — |
| `console.log` en production | 18 | **0** | 0 |
| Appels `marked` divergents | 5 | **0** | 0 |
| Build reproductible | non | **oui** | oui |
| Sources de données | 1 | **2** (`http`, `static`) | ≥ 2 |
| Build possible sans réseau | non | **oui** | oui |
| Couleurs en dur (CSS) | 34 (20 distinctes) | **0** | 0 |
| Occurrences de `any` dans `src/` | 23 | **0** | 0 |
| Pages déclarant un `og` non publié | 2 | **0** | 0 |
| Fichiers de configuration | 3 | **5 + 1 index** | validés par Zod |
| Chaînes visibles en dur dans les composants | 62 | **0** | 0 |
| Collections de contenu local | 1 | **6** | — |
| Fichiers CSS servis | 3, non hashés | **1**, hashé | 1 |
| Chemins d'assets de marque dans le code | 8 | **0** | 0 |
| Références internes mortes | 59 | **0** | 0 |
