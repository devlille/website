/**
 * Schémas Zod du domaine.
 *
 * Un seul jeu de schémas, deux usages :
 * - l'adapter statique valide les fichiers d'entrée avec (un fichier mal formé
 *   fait échouer le build en nommant le champ fautif) ;
 * - `src/content.config.ts` valide les collections Astro avec.
 *
 * Ils décrivent exactement les types de `domain.ts` : tout écart se voit au
 * build. Les champs de liste portent un `.default([])` — leur absence dans un
 * fichier écrit à la main vaut « aucun », jamais une erreur.
 *
 * `astro/zod` est le Zod embarqué par Astro : celui qu'utilise
 * `defineCollection`, et il s'importe hors d'un contexte Astro (donc dans les
 * tests) contrairement à `astro:content`.
 */
import { z } from "astro/zod";
import { SOCIAL_TYPES } from "./domain";

const socialLinkSchema = z.object({
  type: z.enum(SOCIAL_TYPES),
  url: z.string(),
});

const socialsSchema = z.array(socialLinkSchema).default([]);

const partnerRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  logoUrl: z.string(),
});

const jobSchema = z.object({
  url: z.string(),
  title: z.string(),
  companyName: z.string(),
  location: z.string(),
  salary: z
    .object({
      min: z.number(),
      max: z.number(),
      recurrence: z.string(),
    })
    .nullable(),
  requirements: z.number().nullable(),
  publishDate: z.number(),
});

export const speakerSchema = z.object({
  id: z.string(),
  name: z.string(),
  bio: z.string(),
  photoUrl: z.string(),
  pronouns: z.string().nullable(),
  company: z.string().nullable(),
  jobTitle: z.string().nullable(),
  socials: socialsSchema,
  websiteUrl: z.string().nullable(),
  partners: z.array(partnerRefSchema).default([]),
});

const sessionSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string().nullable(),
  abstract: z.string(),
  language: z.string(),
  level: z.string().nullable(),
  speakerIds: z.array(z.string()).default([]),
  slidesUrl: z.string().nullable(),
  replayUrl: z.string().nullable(),
  openFeedbackUrl: z.string().nullable(),
});

const scheduleSlotSchema = z.object({
  id: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  room: z.string(),
  sessionId: z.string().nullable(),
});

export const agendaSchema = z.object({
  schedules: z.array(scheduleSlotSchema).default([]),
  sessions: z.array(sessionSchema).default([]),
  speakers: z.array(speakerSchema).default([]),
});

export const partnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  logoUrl: z.string(),
  logoName: z.string(),
  siteUrl: z.string().nullable(),
  videoUrl: z.string().nullable(),
  socials: socialsSchema,
  tiers: z.array(z.string()).default([]),
  jobs: z.array(jobSchema).default([]),
  speakerIds: z.array(z.string()).default([]),
});

export const activitySchema = z.object({
  id: z.string(),
  name: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  partnerId: z.string(),
  partnerName: z.string(),
  partnerLogoUrl: z.string().nullable(),
});

const faqEntrySchema = z.object({
  id: z.string(),
  order: z.number(),
  question: z.string(),
  response: z.string(),
  acronyms: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .default([]),
  actions: z
    .array(z.object({ label: z.string(), url: z.string() }))
    .default([]),
});

export const eventInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  faq: z.array(faqEntrySchema).default([]),
});

export const videoSchema = z.object({
  id: z.string(),
  videoId: z.string(),
  title: z.string(),
  description: z.string(),
  publishedAt: z.string(),
  thumbnailUrl: z.string(),
});
