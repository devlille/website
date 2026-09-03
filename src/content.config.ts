import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";
import { buildTalkSheets } from "./core/agenda";
import { dataSource } from "./data";
import { SOCIAL_TYPES, type Activity, type Partner } from "./data/domain";

const socialsSchema = z
  .array(z.object({ type: z.enum(SOCIAL_TYPES), url: z.string() }))
  .default([]);

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

const speakerSchema = z.object({
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

const sponsors = defineCollection({
  schema: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    logoUrl: z.string(),
    logoName: z.string(),
    siteUrl: z.string().nullable(),
    videoUrl: z.string().nullable(),
    socials: socialsSchema,
    tiers: z.array(z.string()),
    jobs: z.array(jobSchema).default([]),
    speakerIds: z.array(z.string()).default([]),
  }),

  loader: async () => {
    try {
      const [partners, activities] = await Promise.all([
        dataSource.getPartners(),
        dataSource.getActivities(),
      ]);

      logSponsorsAudit(partners, activities);

      return partners;
    } catch (error) {
      console.error("Error loading sponsors:", error);
      return [];
    }
  },
});

const logSponsorsAudit = (
  partners: Partner[],
  activities: Activity[],
): void => {
  const check = (val: unknown) => (val ? "✓" : "✗");
  const withActivity = new Set(activities.map((a) => a.partnerId));
  const hasSocial = (p: Partner, type: string) =>
    p.socials.some((social) => social.type === type);
  const tableData = partners.map((p) => ({
    Nom: p.name,
    Description: check(p.description),
    Offres: check(p.jobs.length),
    Activités: check(withActivity.has(p.id)),
    X: check(hasSocial(p, "x")),
    LinkedIn: check(hasSocial(p, "linkedin")),
    Instagram: check(hasSocial(p, "instagram")),
    YouTube: check(hasSocial(p, "youtube")),
    Site: check(p.siteUrl),
  }));
  console.log("\n=== Audit des sponsors ===");
  console.table(tableData);
};

const speakers = defineCollection({
  schema: speakerSchema,
  loader: () => dataSource.getSpeakers(),
});

const talks = defineCollection({
  schema: z.object({
    sessionId: z.string(),
    title: z.string().nullable(),
    abstract: z.string(),
    level: z.string().nullable(),
    language: z.string(),
    speakers: z.array(speakerSchema).default([]),
    slidesUrl: z.string().nullable(),
    replayUrl: z.string().nullable(),
    openFeedbackUrl: z.string().nullable(),
  }),

  loader: async () => buildTalkSheets(await dataSource.getAgenda()),
});

const verbatims = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/verbatim" }),
  schema: z.object({
    name: z.string(),
  }),
});

const youtubeVideos = defineCollection({
  schema: z.object({
    id: z.string(),
    videoId: z.string(),
    title: z.string(),
    description: z.string(),
    publishedAt: z.string(),
    thumbnailUrl: z.string(),
  }),

  loader: async () => {
    try {
      return await dataSource.getVideos();
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des vidéos YouTube:",
        error,
      );
      return [];
    }
  },
});

const partnerActivities = defineCollection({
  schema: z.object({
    id: z.string(),
    name: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    partnerId: z.string(),
    partnerName: z.string(),
    partnerLogoUrl: z.string().nullable(),
  }),

  loader: async () => {
    try {
      return await dataSource.getActivities();
    } catch (error) {
      console.error("Error loading partner activities:", error);
      return [];
    }
  },
});

export const collections = {
  sponsors,
  speakers,
  talks,
  verbatims,
  youtubeVideos,
  partnerActivities,
};
