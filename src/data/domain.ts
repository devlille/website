/**
 * Types du domaine : ce dont l'interface a besoin, pas la forme des réponses
 * de l'API.
 *
 * Règles tenues ici :
 * - `camelCase` partout, aucun `partner_id` / `display_name` ;
 * - pas de champ optionnel « au cas où » : ce qui peut manquer est `| null`,
 *   ce qui est toujours là ne l'est pas ;
 * - aucune dépendance vers un adapter : c'est le contrat que publiera le
 *   paquet marque blanche.
 */

/** Réseaux sociaux affichables (une icône existe dans le sprite pour chacun). */
export const SOCIAL_TYPES = [
  "linkedin",
  "youtube",
  "github",
  "bluesky",
  "instagram",
  "x",
  "mastodon",
] as const;

export type SocialType = (typeof SOCIAL_TYPES)[number];

export type SocialLink = { type: SocialType; url: string };

/** Partenaire tel que référencé depuis un·e speaker ou un talk. */
export type PartnerRef = {
  id: string;
  name: string;
  logoUrl: string;
};

export type Speaker = {
  id: string;
  name: string;
  /** Markdown brut. Le rendu reste une décision de présentation. */
  bio: string;
  photoUrl: string;
  pronouns: string | null;
  company: string | null;
  jobTitle: string | null;
  socials: SocialLink[];
  websiteUrl: string | null;
  partners: PartnerRef[];
};

export type Session = {
  id: string;
  /**
   * Nature de la session telle que fournie par la source (`talk-session`,
   * `event-session`, …). Sert aussi de classe CSS côté agenda.
   */
  type: string;
  title: string | null;
  /** Markdown brut : `abstract` pour un talk, `description` sinon. */
  abstract: string;
  language: string;
  level: string | null;
  speakerIds: string[];
  slidesUrl: string | null;
  replayUrl: string | null;
  openFeedbackUrl: string | null;
};

/** Un créneau de l'agenda : une salle, une plage horaire, une session ou rien. */
export type ScheduleSlot = {
  id: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** Horodatage local `YYYY-MM-DDTHH:mm`. */
  startTime: string;
  endTime: string;
  room: string;
  sessionId: string | null;
};

export type Agenda = {
  schedules: ScheduleSlot[];
  sessions: Session[];
  speakers: Speaker[];
};

type Salary = {
  min: number;
  max: number;
  recurrence: string;
};

export type Job = {
  url: string;
  title: string;
  companyName: string;
  location: string;
  salary: Salary | null;
  requirements: number | null;
  publishDate: number;
};

/** Une offre d'emploi rattachée au partenaire qui la publie. */
export type JobOffer = Job & {
  partnerId: string;
  partnerName: string;
};

export type Partner = {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  /** Nom de fichier dérivé du nom, utilisé pour l'image Open Graph. */
  logoName: string;
  siteUrl: string | null;
  videoUrl: string | null;
  socials: SocialLink[];
  /** Packs souscrits, ex. `["Pack Gold"]`. */
  tiers: string[];
  jobs: Job[];
  /** Speakers rattachés à ce partenaire. */
  speakerIds: string[];
};

export type Activity = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  partnerId: string;
  partnerName: string;
  partnerLogoUrl: string | null;
};

export type FaqEntry = {
  id: string;
  order: number;
  question: string;
  /** Markdown brut. */
  response: string;
  acronyms: Array<{ key: string; value: string }>;
  actions: Array<{ label: string; url: string }>;
};

export type EventInfo = {
  id: string;
  name: string;
  /** `YYYY-MM-DD`. */
  startDate: string;
  endDate: string;
  faq: FaqEntry[];
};

export type Video = {
  id: string;
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
};
