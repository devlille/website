import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";
import { buildTalkSheets } from "./core/agenda";
import { dataSource } from "./data";
import type { Activity, Partner } from "./data/domain";
import {
  activitySchema,
  partnerSchema,
  speakerSchema,
  videoSchema,
} from "./data/schemas";

const sponsors = defineCollection({
  schema: partnerSchema,

  loader: async () => {
    try {
      const [partners, activities] = await Promise.all([
        dataSource.getPartners(),
        dataSource.getActivities(),
      ]);

      if (AUDIT_SPONSORS) logSponsorsAudit(partners, activities);

      return partners;
    } catch (error) {
      console.error("Error loading sponsors:", error);
      return [];
    }
  },
});

/**
 * Tableau de complétude des fiches partenaires, à destination de l'équipe
 * contenu. Bruyant dans les logs de build : sur demande explicite seulement.
 */
const AUDIT_SPONSORS = process.env.AUDIT_SPONSORS === "1";

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

/**
 * Fiche de talk : une session de l'agenda dont les speakers sont résolus.
 * Seule collection qui n'est pas un type du domaine tel quel.
 */
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
  schema: videoSchema,

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
  schema: activitySchema,

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
