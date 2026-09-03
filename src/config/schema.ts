/**
 * Schémas des configurations d'instance.
 *
 * Ils décrivent ce qu'une conférence doit renseigner pour faire tourner le
 * site. Toute valeur métier — un libellé de pack, une adresse, un identifiant
 * de liste Mailchimp — se déclare ici et nulle part dans les composants.
 */
import { z } from "astro/zod";
import { assetUrl, httpUrl as url } from "../core/zod-url";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date `YYYY-MM-DD`");

// ---------------------------------------------------------------- site

const socialLinkSchema = z.object({
  /** Libellé lu par les lecteurs d'écran (`<title>` du SVG). */
  label: z.string().min(1),
  url,
  /** Identifiant du symbole dans le sprite SVG de thème. */
  icon: z.string().min(1),
});

const navItemSchema = z.object({
  href: z.string().min(1),
  label: z.string().min(1),
  /** Valeur de `currSection` qui marque cet item comme page courante. */
  section: z.string().min(1),
});

const footerLinkSchema = z.object({
  href: z.string().min(1),
  label: z.string().min(1),
  external: z.boolean().default(false),
  /** N'apparaît que si ce drapeau de `features.ts` est actif. */
  feature: z.enum(["welovedevs", "sponsoring", "tickets"]).optional(),
});

export const siteSchema = z.object({
  /** Slug technique : préfixe des clés de stockage navigateur. */
  id: z.string().regex(/^[a-z0-9-]+$/, "slug en minuscules"),
  name: z.string().min(1),
  url,
  /** BCP 47. Le `lang` du `<html>` et le formatage des dates en dérivent. */
  locale: z.string().min(2),
  contactEmail: z.string().regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "adresse e-mail"),
  keywords: z.array(z.string().min(1)).default([]),
  themeColor: z.string().regex(/^#[0-9A-Fa-f]{3,8}$/, "couleur hexadécimale"),
  organizer: z.object({ name: z.string().min(1), url }),
  socials: z.array(socialLinkSchema).default([]),
  nav: z.array(navItemSchema).default([]),
  footerLinks: z.array(footerLinkSchema).default([]),
});

export type SiteConfig = z.infer<typeof siteSchema>;

// --------------------------------------------------------------- event

const venueSchema = z.object({
  /** Nom court, celui du JSON-LD. */
  name: z.string().min(1),
  /** Nom tel qu'affiché dans les pages. */
  displayName: z.string().min(1),
  streetAddress: z.string().min(1),
  locality: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().length(2),
});

const offerSchema = z.object({
  name: z.string().min(1),
  /** Prix TTC, en unités entières de `currency`. */
  price: z.number().nonnegative(),
});

/**
 * Règle de reconstitution du libellé d'un créneau sans session rattachée.
 *
 * Les conditions renseignées doivent toutes être vraies ; la règle cherche
 * alors une session hors-talk dont le titre correspond, et retombe sur `title`
 * si l'agenda n'en porte aucune.
 */
const slotTitleRuleSchema = z
  .object({
    room: z.string().min(1).optional(),
    /** Heure de début incluse. */
    fromHour: z.number().int().min(0).max(23).optional(),
    /** Heure de début exclue. */
    beforeHour: z.number().int().min(1).max(24).optional(),
    titleContains: z.string().min(1).optional(),
    titleEquals: z.string().min(1).optional(),
    title: z.string().min(1),
  })
  .refine(
    (rule) =>
      (rule.titleContains === undefined) !== (rule.titleEquals === undefined),
    { message: "renseigner exactement un de titleContains / titleEquals" },
  );

const sponsorTierSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "slug en minuscules"),
  /** Titre affiché au-dessus du pack. */
  title: z.string().min(1),
  /** Libellés de sponsoring de la source de données rangés sous ce pack. */
  labels: z.array(z.string().min(1)).nonempty(),
});

export const eventSchema = z.object({
  edition: z.number().int(),
  /** Libellé lisible des dates, tel qu'affiché en une. */
  dateLabel: z.string().min(1),
  startDate: isoDate,
  endDate: isoDate,
  /** Publiée dans le `lastmod` du sitemap. À bumper à la main. */
  contentUpdatedAt: isoDate,
  /** Fuseau IANA de l'événement : l'agenda s'y repère pour « aujourd'hui ». */
  timezone: z.string().min(1),
  /** Description longue : JSON-LD et métadonnées. */
  description: z.string().min(1),
  /** Résumé court : microformat `h-event` du pied de page. */
  tagline: z.string().min(1),
  venue: venueSchema,
  ticketing: z.object({
    /** Ouverture de la billetterie, publiée dans le JSON-LD. */
    salesOpenDate: isoDate,
    currency: z.string().length(3),
    offers: z.array(offerSchema).default([]),
  }),
  stats: z.object({
    attendees: z.number().int().nonnegative(),
    speakers: z.number().int().nonnegative(),
    talks: z.number().int().nonnegative(),
    tracks: z.number().int().nonnegative(),
  }),
  sponsorTiers: z.array(sponsorTierSchema).default([]),
  /**
   * Packs forcés pour un partenaire, en attendant la mise à jour de la source.
   * Clé = identifiant du partenaire.
   */
  sponsorTierOverrides: z
    .record(z.string(), z.array(z.string().min(1)))
    .default({}),
  slotTitles: z.object({
    rules: z.array(slotTitleRuleSchema).default([]),
    /** Employé quand aucune règle ne s'applique, et pour une session sans titre. */
    fallback: slotTitleRuleSchema,
  }),
});

export type EventConfig = z.infer<typeof eventSchema>;
export type SlotTitleRule = z.infer<typeof slotTitleRuleSchema>;
export type SponsorTier = z.infer<typeof sponsorTierSchema>;

// -------------------------------------------------------- integrations

/** `{edition}` y est remplacé par l'édition en cours. */
const urlTemplate = url.refine((value) => value.includes("{edition}"), {
  message: "doit contenir le marqueur {edition}",
});

export const integrationsSchema = z.object({
  api: z.object({ baseUrl: url, eventId: z.string().min(1) }),
  tickets: z.object({ urlTemplate }),
  youtube: z.object({ playlistId: z.string().min(1) }),
  partnershipDeck: z.array(
    z.object({ label: z.string().min(1), url, lang: z.string().min(2) }),
  ),
  newsletter: z.object({
    formAction: url,
    /** Champ pot-de-miel : rempli, c'est un robot. */
    botFieldName: z.string().min(1),
    hiddenFields: z
      .array(z.object({ name: z.string().min(1), value: z.string() }))
      .default([]),
    stylesheet: assetUrl,
    script: assetUrl,
    /** Champs déclarés au script de validation du prestataire. */
    fields: z
      .array(z.object({ name: z.string().min(1), type: z.string().min(1) }))
      .default([]),
    badge: z.object({ href: url, src: url, alt: z.string().min(1) }),
  }),
});

export type IntegrationsConfig = z.infer<typeof integrationsSchema>;

// --------------------------------------------------------------- thème

/** Chemin servi tel quel depuis `public/`. */
const publicPath = z.string().regex(/^\/\S+$/, "chemin absolu depuis public/");

export const themeSchema = z.object({
  /** Logo de l'en-tête. */
  logo: publicPath,
  /** Visuel de la une. */
  hero: publicPath,
  /** Image des cartes de partage, publiée en absolu dans `og:image`. */
  ogImage: publicPath,
  favicons: z
    .array(z.object({ href: publicPath, type: z.string().min(1) }))
    .nonempty(),
  /** Sprite SVG des icônes : une instance le remplace par le sien. */
  sprite: publicPath,
  /** Icônes d'interface du socle. */
  icons: z.object({ anchor: publicPath }),
});

// ------------------------------------------------------------ features

export const featuresSchema = z.object({
  welovedevs: z.boolean(),
  sponsoring: z.boolean(),
  tickets: z.boolean(),
});


/** Règles de libellé des créneaux sans session, telles que `core/agenda` les lit. */
export type SlotTitles = EventConfig["slotTitles"];
