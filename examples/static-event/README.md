# Jeu de données statique

Ce dossier contient **tout ce dont le site a besoin pour se construire**, sous
forme de cinq fichiers JSON. Aucun serveur, aucune API, aucune connexion
Internet : le site se génère à partir de ces fichiers seuls.

```bash
pnpm install
pnpm build:static        # -> dist/, prêt à publier
```

Pour travailler sur un autre dossier que celui-ci :

```bash
DATA_SOURCE=static STATIC_DATA_DIR=./mon-evenement pnpm build
```

---

## Les cinq fichiers

| Fichier | Contenu |
|---|---|
| `event.json` | L'événement lui-même : nom, dates, et la FAQ |
| `agenda.json` | Le planning, les sessions et les speakers |
| `partners.json` | Les partenaires, avec leurs offres d'emploi |
| `activities.json` | Les animations tenues sur les stands |
| `videos.json` | Les vidéos mises en avant sur la page d'accueil |

Il n'y a pas de fichier pour les offres d'emploi : elles vivent dans la fiche du
partenaire qui les publie (`partners.json` → `jobs`).

### Conventions générales

- **Encodage** : UTF-8.
- **Champ obligatoire** : il doit être présent. S'il n'a pas de valeur, écrire
  `null` (jamais une chaîne vide déguisée en absence… sauf si c'est bien une
  chaîne vide que vous voulez afficher).
- **Champ « liste »** (`socials`, `jobs`, `tiers`, `speakerIds`, `faq`,
  `acronyms`, `actions`, `partners`) : peut être omis. Il vaut alors la liste
  vide.
- **Texte long** (`bio`, `abstract`, `description`, `response`) : du
  **Markdown**. Le gras `**ainsi**`, les listes `- ainsi` et les liens
  `[texte](url)` fonctionnent. Le HTML brut est retiré à la publication.
- **Dates** : `"2026-06-11"` pour un jour, `"2026-06-11T09:30"` pour un horaire.
  Pas de fuseau : c'est l'heure locale de l'événement.
- **Identifiants** (`id`) : n'importe quelle chaîne stable et unique. Ils
  servent à relier les fichiers entre eux **et** à construire les adresses des
  pages : changer un `id` change l'URL de la page correspondante.

---

## `event.json`

```json
{
  "id": "devlille-2026",
  "name": "DevLille 2026",
  "startDate": "2026-06-11",
  "endDate": "2026-06-12",
  "faq": [
    {
      "id": "acces",
      "order": 1,
      "question": "Comment venir ?",
      "response": "En métro, station **Mairie de Lille**.",
      "acronyms": [{ "key": "CFP", "value": "Call For Papers" }],
      "actions": [{ "label": "le plan", "url": "https://exemple.fr/plan" }]
    }
  ]
}
```

Dans une entrée de FAQ, `acronyms` fait apparaître une infobulle sur chaque
occurrence du sigle dans la réponse, et `actions` transforme chaque occurrence
du libellé en lien. Les deux sont facultatifs.

`order` fixe l'ordre d'affichage des questions.

---

## `agenda.json`

Trois listes qui se répondent :

```json
{
  "schedules": [
    {
      "id": "creneau-1",
      "date": "2026-06-11",
      "startTime": "2026-06-11T09:00",
      "endTime": "2026-06-11T09:45",
      "room": "Grand Théâtre",
      "sessionId": "ouverture"
    }
  ],
  "sessions": [
    {
      "id": "ouverture",
      "type": "talk-session",
      "title": "Keynote d'ouverture",
      "abstract": "Ce qui nous attend ces deux jours.",
      "language": "fr",
      "level": "beginner",
      "speakerIds": ["alice"],
      "slidesUrl": null,
      "replayUrl": null,
      "openFeedbackUrl": null
    }
  ],
  "speakers": [
    {
      "id": "alice",
      "name": "Alice Martin",
      "bio": "Développeuse, elle parle de **build**.",
      "photoUrl": "https://exemple.fr/alice.jpg",
      "pronouns": "elle",
      "company": "Acme",
      "jobTitle": "Staff Engineer",
      "websiteUrl": "https://alice.example",
      "socials": [{ "type": "linkedin", "url": "https://linkedin.com/in/alice" }],
      "partners": []
    }
  ]
}
```

- **`schedules`** — un créneau = une salle × une plage horaire. Le `sessionId`
  pointe vers une entrée de `sessions`, ou vaut `null` pour un créneau sans
  contenu (pause, déjeuner…).
- **`sessions`** — le contenu, indépendamment de son horaire. `type` vaut
  `"talk-session"` pour une conférence, autre chose sinon (il sert aussi de
  classe CSS dans l'agenda). Une session sans créneau n'apparaît nulle part ;
  un créneau sans session apparaît vide.
- **`speakers`** — les personnes. `speakerIds` d'une session les référence par
  `id`. `partners` sert à rattacher un·e speaker à un partenaire :
  `[{ "id": "acme", "name": "Acme", "logoUrl": "…" }]`.

`socials.type` doit valoir l'un de : `linkedin`, `youtube`, `github`,
`bluesky`, `instagram`, `x`, `mastodon`. Tout autre type est refusé au build —
c'est volontaire : le site n'a pas d'icône pour le reste. Le site personnel se
met dans `websiteUrl`, pas dans `socials`.

---

## `partners.json`

Une liste :

```json
[
  {
    "id": "acme",
    "name": "Acme",
    "description": "Acme fabrique des **enclumes** depuis 1949.",
    "logoUrl": "https://exemple.fr/acme.png",
    "siteUrl": "https://acme.example",
    "videoUrl": null,
    "socials": [],
    "tiers": ["Pack Gold"],
    "speakerIds": ["alice"],
    "jobs": [
      {
        "url": "https://acme.example/jobs/42",
        "title": "Développeur·se back-end",
        "companyName": "Acme",
        "location": "Lille",
        "salary": { "min": 45000, "max": 60000, "recurrence": "YEAR" },
        "requirements": 3,
        "publishDate": 1750000000000
      }
    ]
  }
]
```

- **`tiers`** — les packs souscrits. Ce sont ces libellés qui décident dans
  quelle section de la page d'accueil le partenaire apparaît : ils doivent
  correspondre à ceux déclarés dans `src/config/event.config.ts` — aujourd'hui
  `Pack Gold` (ou `gold`), `Pack Silver` (`silver`), `Pack Bronze` (`bronze`),
  `Partenaires DevLille Graine de Dev`, `Partenaire Hébergement`,
  `Community Partners` et `Partenaires Média`. Un pack inconnu ne fait pas
  échouer le build, mais le partenaire n'apparaît alors dans aucune section de
  la liste — seule sa fiche `/partner-…` est produite. Un partenaire qui cumule
  deux packs apparaît dans les deux.
- **`logoUrl`** — le logo affiché sur la fiche du partenaire. Il sert aussi
  d'image de partage sur les réseaux sociaux, qui préfèrent un PNG ou un JPEG à
  un SVG.
- **`salary`** — vaut `null`, ou bien les trois champs. Seuls `min` et `max`
  sont affichés (« 45 000 € à 60 000 € ») ; `recurrence` est exigé par le
  format mais n'apparaît nulle part pour l'instant.
- **`requirements`** — un nombre d'années d'expérience, affiché
  « Minimum 3 ans ». `null` ou `0` n'affiche rien.
- **`publishDate`** — un horodatage en millisecondes
  (`Date.now()`, ou `new Date("2026-01-15").getTime()`).

---

## `activities.json`

Les animations de stand. Chacune est rattachée à un partenaire par `partnerId`.

```json
[
  {
    "id": "atelier-1",
    "name": "Atelier soudure",
    "startTime": "2026-06-11T14:00",
    "endTime": "2026-06-11T15:00",
    "partnerId": "acme",
    "partnerName": "Acme",
    "partnerLogoUrl": "https://exemple.fr/acme.png"
  }
]
```

Une animation qui court sur plusieurs jours est affichée sur chacun des jours
qu'elle couvre.

---

## `videos.json`

```json
[
  {
    "id": "dQw4w9WgXcQ",
    "videoId": "dQw4w9WgXcQ",
    "title": "Rétrospective 2025",
    "description": "Deux jours en trois minutes.",
    "publishedAt": "2025-06-20T10:00:00+00:00",
    "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
  }
]
```

`videoId` est l'identifiant YouTube (ce qui suit `?v=` dans l'adresse).

---

## Quand quelque chose ne va pas

Le build **s'arrête** plutôt que de publier une page cassée, et dit quoi
corriger. Trois messages possibles :

```
…/event.json : fichier introuvable. L'adapter statique attend les fichiers
event.json, agenda.json, partners.json, activities.json, videos.json.
```

```
…/videos.json n'est pas un JSON valide : Unexpected token } in JSON at position 214
```
→ presque toujours une virgule en trop avant une accolade fermante.

```
…/partners.json ne respecte pas le format attendu :
  - [0].logoUrl : Invalid input: expected string, received undefined
  - [3].jobs[1].publishDate : Invalid input: expected number, received string
```
→ le chemin entre crochets est la position dans la liste : `[3].jobs[1]` désigne
la deuxième offre du quatrième partenaire.

---

## Régénérer ce jeu depuis l'API DevLille

Ce dossier est un instantané de l'API de production. Pour le rafraîchir :

```bash
pnpm dump:static                       # -> examples/static-event/
pnpm dump:static ./autre-dossier
```

Le script écrit exactement ce que l'adapter HTTP donne au site : les fichiers
n'ont aucune traduction à subir, ils *sont* le format interne du site. C'est ce
qui garantit que le build statique et le build en ligne produisent le même
résultat — la CI (`.github/workflows/static-build.yml`) le vérifie à chaque
poussée.
