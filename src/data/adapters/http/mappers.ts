/**
 * Traduction API -> domaine. Fonctions pures, sans I/O : c'est ici que vivent
 * toutes les particularités de l'API (snake_case, `session_id === "null"`,
 * espaces insécables, flux RSS YouTube), et nulle part ailleurs.
 */
import isURL from "isurl";
import {
  SOCIAL_TYPES,
  type Activity,
  type Agenda,
  type EventInfo,
  type FaqEntry,
  type Job,
  type JobOffer,
  type Partner,
  type ScheduleSlot,
  type Session,
  type SocialLink,
  type SocialType,
  type Speaker,
  type Video,
} from "../../domain";
import type {
  ApiActivity,
  ApiAgenda,
  ApiEvent,
  ApiJob,
  ApiPartner,
  ApiPartnersResponse,
  ApiQuestion,
  ApiSchedule,
  ApiSession,
  ApiSocial,
  ApiSpeaker,
} from "./api-types";

export type * from "./api-types";

const isSocialType = (type: string): type is SocialType =>
  (SOCIAL_TYPES as readonly string[]).includes(type.toLowerCase());

/**
 * Normalise la casse des types de réseaux et écarte ceux que le site ne sait
 * pas afficher (pas d'icône dans le sprite).
 */
export const normalizeSocials = (
  socials: ApiSocial[] | undefined,
): SocialLink[] => {
  if (!Array.isArray(socials)) return [];
  return socials
    .map((s) => ({ ...s, type: s.type.toLowerCase() }))
    .filter((s): s is SocialLink => isSocialType(s.type));
};

/** Premier lien du type demandé, `null` s'il n'y en a pas. */
export const getSocialUrl = (
  socials: ApiSocial[] | undefined,
  type: string,
): string | null =>
  (socials ?? []).find((s) => s.type === type)?.url ?? null;

/**
 * Packs forcés pour un partenaire, en attendant la mise à jour côté source.
 * Clé = identifiant du partenaire. Vient de `event.sponsorTierOverrides`.
 */
export type TierOverrides = Record<string, string[]>;

/** Complète en `https://` une URL de site sans schéma. */
const normalizeSiteUrl = (
  siteUrl: string | undefined,
  partnerName: string,
): string | null => {
  if (!siteUrl) return null;
  let normalized = siteUrl;
  try {
    if (!/^https?:\/\//.test(normalized)) {
      normalized = "https://" + normalized;
    }
    isURL(new URL(normalized));
  } catch {
    console.error(`Bad URL for ${partnerName}`);
  }
  return normalized;
};

const toJob = (job: ApiJob): Job => ({
  url: job.url,
  title: job.title,
  companyName: job.company_name,
  location: job.location,
  salary: job.salary,
  requirements: job.requirements,
  publishDate: job.publish_date,
});

const toPartner = (
  partner: ApiPartner,
  tierOverrides: TierOverrides,
): Partner => ({
  id: partner.id,
  name: partner.name,
  description: partner.description ?? "",
  logoUrl: partner.media?.svg ?? "",
  logoName: partner.name.toLowerCase().replaceAll(" ", "-"),
  siteUrl: normalizeSiteUrl(partner.siteUrl, partner.name),
  videoUrl: partner.videoUrl ?? null,
  socials: normalizeSocials(partner.socials),
  tiers: tierOverrides[partner.id] ?? partner.types ?? [],
  jobs: (partner.jobs ?? []).map(toJob),
  speakerIds: (partner.speakers ?? []).map((s) => s.id),
});

export const toPartners = (
  response: ApiPartnersResponse,
  tierOverrides: TierOverrides = {},
): Partner[] =>
  (response.partners ?? []).map((partner) => toPartner(partner, tierOverrides));

const toActivity = (
  activity: ApiActivity,
  partnersById: Map<string, ApiPartner>,
): Activity => {
  const partner = partnersById.get(activity.partner_id);
  return {
    id: activity.id,
    name: activity.name,
    startTime: activity.start_time,
    endTime: activity.end_time,
    partnerId: activity.partner_id,
    partnerName: partner?.name ?? "",
    partnerLogoUrl: partner?.media?.svg ?? null,
  };
};

export const toActivities = (response: ApiPartnersResponse): Activity[] => {
  const partnersById = new Map(
    (response.partners ?? []).map((p) => [p.id, p] as const),
  );
  return (response.activities ?? []).map((a) => toActivity(a, partnersById));
};

/** Toutes les offres d'emploi de l'événement, rattachées à leur partenaire. */
export const toJobOffers = (response: ApiPartnersResponse): JobOffer[] =>
  (response.partners ?? []).flatMap((partner) =>
    (partner.jobs ?? []).map((job) => ({
      ...toJob(job),
      partnerId: partner.id,
      partnerName: partner.name,
    })),
  );

/** L'API insère des espaces insécables dans les titres et résumés saisis. */
const stripNbsp = (text: string | undefined): string | null =>
  typeof text === "string" ? text.replaceAll(" ", " ") : null;

const toSpeaker = (speaker: ApiSpeaker): Speaker => ({
  id: speaker.id,
  name: speaker.display_name ?? "",
  bio: speaker.bio ?? "",
  photoUrl: speaker.photo_url ?? "",
  pronouns: speaker.pronouns ?? null,
  company: speaker.company ?? null,
  jobTitle: speaker.job_title ?? null,
  socials: normalizeSocials(speaker.socials),
  websiteUrl: getSocialUrl(speaker.socials, "website"),
  partners: (speaker.partners ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    logoUrl: p.logo_url,
  })),
});

const toSession = (session: ApiSession): Session => {
  const isTalk = session.type === "talk-session";
  return {
    id: session.id,
    type: session.type,
    title: stripNbsp(session.title),
    abstract: stripNbsp(isTalk ? session.abstract : session.description) ?? "",
    language: session.language ?? "fr",
    level: session.level ?? null,
    speakerIds: session.speakers ?? [],
    slidesUrl: session.link_slides ?? null,
    replayUrl: session.link_replay ?? null,
    openFeedbackUrl: session.open_feedback ?? null,
  };
};

/** L'API sérialise l'absence de session par la chaîne `"null"`. */
const toScheduleSlot = (schedule: ApiSchedule): ScheduleSlot => ({
  id: schedule.id,
  date: schedule.date,
  startTime: schedule.start_time,
  endTime: schedule.end_time,
  room: schedule.room,
  sessionId:
    !schedule.session_id || schedule.session_id === "null"
      ? null
      : schedule.session_id,
});

export const toAgenda = (agenda: ApiAgenda): Agenda => ({
  schedules: (agenda.schedules ?? []).map(toScheduleSlot),
  sessions: (agenda.sessions ?? []).map(toSession),
  speakers: (agenda.speakers ?? []).map(toSpeaker),
});

const toFaqEntry = (question: ApiQuestion): FaqEntry => ({
  id: question.id,
  order: question.order,
  question: question.question,
  response: question.response,
  acronyms: question.acronyms ?? [],
  actions: question.actions ?? [],
});

export const toEventInfo = (event: ApiEvent): EventInfo => ({
  id: event.id,
  name: event.name,
  startDate: event.start_date,
  endDate: event.end_date,
  faq: (event.qanda ?? [])
    .map(toFaqEntry)
    .sort((a, b) => a.order - b.order),
});

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
};

const decodeEntities = (text: string): string =>
  text.replaceAll(/&amp;|&quot;|&#39;/g, (e) => HTML_ENTITIES[e]);

const firstMatch = (entry: string, pattern: RegExp): string =>
  entry.match(pattern)?.[1] ?? "";

/**
 * Lit le flux RSS d'une playlist YouTube. Volontairement sans dépendance XML :
 * le flux est stable et l'on n'en extrait que six champs.
 */
export const parseYoutubeFeed = (xml: string): Video[] =>
  (xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? []).map((entry) => {
    const videoId = firstMatch(entry, /<yt:videoId>(.*?)<\/yt:videoId>/);
    return {
      id: videoId,
      videoId,
      title: decodeEntities(firstMatch(entry, /<title>(.*?)<\/title>/)),
      description: decodeEntities(
        firstMatch(entry, /<media:description>(.*?)<\/media:description>/),
      ),
      publishedAt: firstMatch(entry, /<published>(.*?)<\/published>/),
      thumbnailUrl: firstMatch(entry, /<media:thumbnail url="(.*?)"/),
    };
  });
