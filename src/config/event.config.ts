/**
 * L'édition en cours : ses dates, son lieu, ses tarifs, ses packs de
 * sponsoring. C'est le fichier qu'on rouvre chaque année.
 */
import { defineConfig } from "./define";
import { eventSchema } from "./schema";

export default defineConfig("event.config.ts", eventSchema, {
  edition: 2026,
  dateLabel: "11 et 12 Juin",
  startDate: "2026-06-11",
  endDate: "2026-06-12",
  contentUpdatedAt: "2026-09-03",
  timezone: "Europe/Paris",
  description:
    "2 jours de conférences et d'échanges accessibles à tous et toutes au coeur de Lille.",
  tagline:
    "2 jours de conférences et d'échanges accessibles à tous et à toutes au coeur de Lille",
  venue: {
    name: "Grand Palais",
    displayName: "Lille Grand Palais",
    streetAddress: "1 Bd des Cités Unies",
    locality: "Lille",
    postalCode: "59777",
    country: "FR",
  },
  ticketing: {
    salesOpenDate: "2026-01-15",
    currency: "EUR",
    offers: [
      { name: "Billet 2 jours / Jeudi et Vendredi", price: 80 },
      { name: "Billet 1 jour / Jeudi", price: 40 },
      { name: "Billet 1 jour / Vendredi", price: 40 },
    ],
  },
  stats: {
    attendees: 1500,
    speakers: 60,
    talks: 44,
    tracks: 4,
  },
  sponsorTiers: [
    { id: "gold", title: "Gold", labels: ["gold", "Pack Gold"] },
    { id: "silver", title: "Silver", labels: ["silver", "Pack Silver"] },
    { id: "bronze", title: "Bronze", labels: ["bronze", "Pack Bronze"] },
    {
      id: "graine-de-dev",
      title: "Partenaires DevLille Graine de Dev",
      labels: ["Partenaires DevLille Graine de Dev"],
    },
    {
      id: "hebergement",
      title: "Partenaire Hébergement",
      labels: ["Partenaire Hébergement"],
    },
    {
      id: "community",
      title: "Community Partners",
      labels: ["Community Partners"],
    },
    {
      id: "media",
      title: "Partenaires Média",
      labels: ["Partenaires Média"],
    },
  ],
  sponsorTierOverrides: {
    // DECATHLON DIGITAL : Pack Bronze -> Pack Gold
    "b9ae1a05-2f42-4d0f-b414-c455b3fe20b0": ["Pack Gold"],
  },
  /**
   * Certains créneaux de l'agenda n'ont pas de session rattachée. Ces règles
   * reconstituent leur libellé à partir de la salle et de l'heure — elles
   * disparaîtront le jour où la source de données sera complète.
   */
  slotTitles: {
    rules: [
      {
        room: "Grand Théâtre",
        titleContains: "Keynote",
        title: "Keynote d'ouverture",
      },
      {
        beforeHour: 9,
        titleContains: "Enregistrement",
        title: "Enregistrement",
      },
      { fromHour: 12, beforeHour: 14, titleContains: "Lunch", title: "Lunch" },
    ],
    fallback: { titleEquals: "Pause", title: "Pause" },
  },
});
