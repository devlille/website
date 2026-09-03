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
- [Phase 2 — Nettoyage et corrections](#phase-2--nettoyage-et-corrections)
- [Phase 3 — Adapter statique (le « sans backend »)](#phase-3--adapter-statique-le--sans-backend-)
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

## Phase 2 — Nettoyage et corrections

> Indépendante des autres phases, faisable en parallèle. Corrige des bugs réels
> sur le site en production.

### Bugs

- [ ] `src/layouts/Layout.astro:23` et `:45` — template Eleventy jamais remplacé,
      publié tel quel dans le JSON-LD :
      `url: "https://www.billetweb.fr/devlille-{{ collections.config.edition }}"`
      (2 offres sur 3 concernées).
- [x] `src/content.config.ts:222` — `buildPartnerActivities` lit `activity.partnerId`
      alors que l'API renvoie `partner_id`. La colonne « Activités » de l'audit est
      donc toujours `✗`. **Résolu en phase 1** : le domaine expose `partnerId`,
      l'audit lit des `Activity` et non plus la réponse brute.
- [ ] `src/pages/agenda.astro:8` et `src/pages/animations.astro:8` — `const og = {…}`
      déclaré mais jamais passé à `<Layout>` : ces deux pages n'ont **aucune balise
      Open Graph**.
- [ ] `src/layouts/Layout.astro` — `og.ogTitle` n'est jamais lu, alors que 3 pages
      le renseignent.
- [ ] `src/pages/index.astro` — `<picture>` imbriqué en double (bloc « scratch »).
- [ ] `src/core/partners.ts` — `normalizeSponsorUrl` teste `siteUrl.includes("https://")`
      au lieu de `startsWith` : une URL sans schéma qui contient `https://` dans un
      paramètre n'est pas préfixée. Comportement figé par un test en phase 0.

### Déterminisme du build

- [ ] `speakers.astro:26` et `talk-page-[id].astro:79` — `?v=${Math.random()}` sur les
      photos de speakers : casse le cache navigateur **et** rend le build non
      reproductible. À supprimer (ou remplacer par un hash stable côté API).
- [ ] `Layout.astro:16` (verbatim aléatoire) et `youtube-videos.astro:7` (3 vidéos
      aléatoires) — à seeder sur l'édition, ou à assumer explicitement.
- [ ] `astro.config.mjs` — `sitemap.lastmod: new Date()` fait churner tout le sitemap
      à chaque build nocturne. Utiliser une date de contenu.

### Code mort et bruit

- [ ] `src/layouts/Layout.astro:3` — `import editions` inutilisé.
- [ ] `src/content.config.ts` — `fetchImage`, `getExtensionFromLogoUrl`, `tempFolder`,
      `ApiPartnerType` : chemin de téléchargement des logos jamais emprunté.
- [ ] `src/content.config.ts` — champ `jobs` du schéma sponsors, jamais rempli par le
      loader (l'audit le teste pourtant → toujours `✗`).
- [ ] **18 `console.log`** à retirer ou passer derrière un flag `DEBUG`, dont :
  - `sponsors.astro:9` — dump JSON complet du premier sponsor
  - `partner-[id].astro:135` — `<script>` client qui logge dans le navigateur
  - `content.config.ts` — l'URL loggée 2× de suite, `console.table` d'audit
- [ ] Dédupliquer `eachDayBetween` / `toDateOnly` / `formatLocalDate`, aujourd'hui
      copiés à l'identique entre `getActivitiesByDate.ts` et `SponsorActivities.astro`.

### Sécurité

- [ ] `marked` + `set:html` sans sanitisation sur des données backend (abstracts, bios,
      FAQ). Avec des sources tierces en marque blanche, c'est un vrai risque.
      → **reporté de la phase 1** : le domaine transporte le Markdown brut (dont
      `stripMarkdown` a besoin pour les meta-descriptions). Introduire un
      `renderMarkdown()` unique — sanitisation comprise — et remplacer les quatre
      appels `marked` divergents des templates.
- [ ] Remplacer les manipulations de HTML par chaînes (`shiftHeadings` dans
      `talk-page-[id].astro`, `.replaceAll("h2", "p")` dans `getTalksByDate.ts`) par
      un renderer `marked` configuré.

---

## Phase 3 — Adapter statique (le « sans backend »)

> **C'est le livrable qui prouve que l'extraction fonctionne.** Un jeu de fixtures =
> un site complet, sans aucun appel réseau.

### Tâches

- [ ] Choisir le format d'entrée (voir [Décisions à arbitrer](#décisions-à-arbitrer)).
- [ ] Implémenter `src/data/adapters/static.ts` conforme à `EventDataSource`.
- [ ] Valider les fichiers d'entrée avec les **mêmes schémas Zod** que l'adapter HTTP :
      un fichier mal formé doit faire échouer le build avec un message exploitable.
- [ ] Fournir un jeu d'exemple complet et documenté (`examples/static-event/`).
- [ ] CI : un job qui build le site avec `DATA_SOURCE=static` sur les fixtures.
      C'est le test de non-régression de l'extraction.
- [ ] Documenter la marche à suivre pour un organisateur non-développeur.

### Critère de sortie

`DATA_SOURCE=static npm run build` produit un site complet et navigable, sans réseau.

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

- [ ] `sponsors.astro` — 7 filtres copiés-collés sur des libellés en dur
      (`"Pack Gold"`, `"Partenaires DevLille Graine de Dev"`, `"Partenaire Hébergement"`…)
      → un tableau `sponsorTiers: [{ id, label, match }]` en config + **une seule boucle**.
- [ ] `content.config.ts:180` `SPONSORING_OVERRIDES` — un UUID Decathlon en dur dans ce
      qui deviendra du code partagé → config d'instance.
- [ ] `getTalksByDate.ts:14` `guessEventTitle()` — heuristiques 100 % DevLille : salle
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
- [ ] Helper `formatDate` centralisé : `Intl.DateTimeFormat("fr")` est aujourd'hui
      dupliqué dans `getTalksByDate.ts:165`, `getActivitiesByDate.ts:85` et
      `SponsorActivities.astro:57`, et `toLocaleString("fr-FR")` dans `JobCard.astro`.
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
| **Format de l'adapter statique** | JSON plat *vs* collections Markdown | Ergonomie pour un organisateur non-développeur. Le Markdown est plus agréable pour les textes longs (bios, abstracts), le JSON plus simple à générer depuis un export. |
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
| `src/components/sponsors.astro` | libellés de packs en dur |
| `src/utils/getTalksByDate.ts` | heuristiques de salles et d'horaires |
| `src/config/config.ts` | 4 responsabilités mélangées |

### Métriques de suivi

| Indicateur | Avant phase 0 | Aujourd'hui | Cible |
|---|---|---|---|
| Appels HTTP par build | 10 | **4** | 3 |
| `fetch` hors couche données | 8 | **0** | 0 |
| Fichiers de test | 0 | **7** | ≥ 8 |
| `console.log` en production | 18 | **4** | 0 |
| Couleurs en dur (CSS) | 5 | 5 | 0 |
| Occurrences de `any` dans `src/` | 23 | **0** | 0 |
| Pages sans Open Graph | 2 | 2 | 0 |
