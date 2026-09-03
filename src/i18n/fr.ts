/**
 * Dictionnaire français.
 *
 * Toutes les chaînes visibles des composants et des pages vivent ici. Les
 * contenus éditoriaux longs (code de conduite, sections de la page d'accueil,
 * équipe) sont des collections de contenu, pas des messages d'interface.
 */
export const fr = {
  // Chrome du site
  "nav.skip": "Navigation (Sauter)",
  "layout.home": "{site}: Retour à l'accueil",
  "layout.logoAlt": "{site} {edition}",
  "layout.tickets": "Prenez votre place!",
  "layout.becomePartner": "Devenez partenaire",
  "layout.partnersThanks":
    "Un grand merci à nos partenaires qui nous soutiennent déjà pour l'édition {edition}!",
  "layout.titleSuffix": "{site} {edition}",

  // Pied de page
  "footer.newsletterTitle": "S'inscrire à la newsletter du {site}",
  "footer.email": "Email",
  "footer.subscribe": "Confirmer",
  "footer.eventName": "{site} {edition}",
  "footer.copyright": "{site}, {edition}",

  // Partenaires
  "partnership.fileHint": "[PDF, 5Mo]",
  "sponsors.visitSite": "Visiter le site de {name}",
  "sponsors.logoAlt": "Logo de {name}",
  "sponsors.partnerHeading": "Partenaire",
  "sponsors.partnersHeading": "Partenaires",
  "sponsors.activitiesHeading": "Nos activités pendant le {site}",
  "sponsors.talksHeading": "Les talks de nos collaborateurs",
  "sponsors.jobsHeading": "Offres d'emploi chez {name}",
  "socials.website": "Site Web",

  // Agenda et favoris
  "agenda.anchorAlt": "Ancre",
  "favorites.add": "Ajouter aux favoris",
  "favorites.added": "Favori",
  "favorites.filter": "Afficher mes favoris uniquement",

  // Offres d'emploi
  "job.experience": "Expérience",
  "job.minYears": "Minimum {years} ans",
  "job.salary": "Salaire",
  "job.salaryRange": "{min}€ à {max}€",
  "jobs.title": "Les offres d'emploi de nos partenaires",
  "jobs.intro": "Nos partenaires nous partagent leurs offres d'emploi actuelles.",
  "jobs.empty": "Aucune offre d'emploi disponible pour le moment.",

  // Talks et speakers
  "talk.presentedBy": "Présenté par :",
  "talk.watchAgain": "Regardez ou re-regardez",
  "talk.replay": "La vidéo du talk",
  "talk.slides": "Les slides du talk",
  "talk.feedbackIntro":
    "Suite à la conférence, vous pouvez faire un retour aux conférenciers et conférencières sur",
  "talk.feedbackLink": "OpenFeedback",
  "speaker.photoAlt": "Photo de {name}",
  "speaker.company": "Entreprise: ",
  "speaker.talksHeading": "présentés par {name}",
  "speaker.fallbackName": "Speaker",
  "speaker.pageTitle": "{name}, speaker",
  "speaker.metaDescription":
    "Découvrez {name}{company}, speaker à {site} {edition}.",

  // Titres de pages
  "page.agenda": "Agenda",
  "page.animations": "Animations",
  "page.faq": "Foire aux questions",
  "page.speakers": "Speakers",
  "page.press": "On parle de nous",
  "page.pressForJournalists": "Pour la Presse",
  "page.pressPublished": "Publié sur {by} le {at}",
  "page.pressPublishedOn": "Publié le {at}",
  "page.team": "L'équipe {site}",

  // Descriptions Open Graph des pages sans contenu dynamique
  "og.home":
    "Le {site} est une conférence de deux jours autour des sujets Web, Mobile et Cloud.",
  "og.agenda": "{tagline}",
  "og.animations":
    "Les animations proposées par nos sponsors pendant les 2 jours de {site}",
  "og.about":
    "Le {site} est une journée de conférences et d'échanges sur le Web, Mobile, Cloud,\tet de leur utilisation par les acteurs locaux",

  // Page d'accueil
  "home.statsTitle": "Le {site} Lille {edition} en chiffres",
  "home.attendees": "participants",
  "home.speakers": "speakers",
  "home.talks": "conférences",
  "home.tracks": "tracks",
} as const;
