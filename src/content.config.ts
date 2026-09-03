import { file, glob } from "astro/loaders";
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

/** Illustration d'une section de contenu, avec sa source haute résolution. */
const illustrationSchema = z.object({
  src: z.string().min(1),
  alt: z.string(),
  srcset: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  media: z.string().min(1).optional(),
});

/**
 * Blocs éditoriaux libres, appelés par leur identifiant depuis une page.
 * Ils portent du Markdown enrichi de HTML : c'est du contenu local, donc de
 * confiance, contrairement à ce que renvoie la source de données.
 */
const blocks = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blocks" }),
  schema: z.object({ title: z.string() }),
});

/** Les membres de l'équipe : une fiche par fichier Markdown. */
const team = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/team" }),
  schema: z.object({
    name: z.string(),
    photo: z.string(),
    order: z.number().int(),
  }),
});

/**
 * Les sections éditoriales de la page d'accueil. `variant` choisit la mise en
 * page : `venue` encadre le texte de deux illustrations, `decor` n'en a qu'une.
 */
const sections = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/sections" }),
  schema: z.object({
    order: z.number().int(),
    variant: z.enum(["venue", "decor"]),
    title: z.string(),
    titleHighlight: z.string().optional(),
    illustrations: z.array(illustrationSchema).default([]),
    link: z
      .object({
        href: z.string().min(1),
        label: z.string().min(1),
        external: z.boolean().default(false),
      })
      .optional(),
  }),
});

/** Les éditions précédentes, listées en pied de page. */
const editions = defineCollection({
  loader: file("src/content/editions/editions.json", {
    parser: (text) =>
      (JSON.parse(text) as Array<{ year: number }>).map((edition) => ({
        id: String(edition.year),
        ...edition,
      })),
  }),
  schema: z.object({ year: z.number().int(), url: z.string().url() }),
});

/** Les documents que la presse peut télécharger. */
const pressKit = defineCollection({
  loader: file("src/content/press/press-kit.json", {
    parser: (text) =>
      (JSON.parse(text) as Array<{ title: string }>).map((doc, index) => ({
        id: String(index),
        ...doc,
      })),
  }),
  schema: z.object({
    title: z.string(),
    url: z.string().url(),
    publishedAt: z.string(),
  }),
});

/** Les articles publiés à notre sujet, groupés par année à l'affichage. */
const pressArticles = defineCollection({
  loader: file("src/content/press/articles.json", {
    parser: (text) =>
      (JSON.parse(text) as Array<{ year: number; rank: number }>).map(
        (article) => ({ id: `${article.year}-${article.rank}`, ...article }),
      ),
  }),
  schema: z.object({
    year: z.number().int(),
    /** Rang dans l'année : fige l'ordre d'affichage. */
    rank: z.number().int(),
    title: z.string(),
    url: z.string().url(),
    publishedAt: z.string(),
    publishedBy: z.string(),
    /** Sert aussi de classe CSS sur l'entrée. */
    type: z.enum(["press", "video"]),
  }),
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
  blocks,
  editions,
  pressArticles,
  pressKit,
  sections,
  sponsors,
  team,
  speakers,
  talks,
  verbatims,
  youtubeVideos,
  partnerActivities,
};
