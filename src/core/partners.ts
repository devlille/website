import isURL from "isurl";
import { normalizeSocials, type ApiSocial, type Social } from "./socials";

type ApiPartnerMedia = {
  svg: string;
  pngs?: {
    _250: string;
    _500: string;
    _1000: string;
  };
};

type ApiPartnerActivity = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  partner_id: string;
};

export type ApiPartner = {
  id: string;
  name: string;
  description: string;
  media: ApiPartnerMedia;
  videoUrl: string | null;
  address?: unknown;
  types: string[];
  socials?: ApiSocial[];
  siteUrl?: string;
};

export type ApiPartnerResponse = {
  /** Libellés des packs proposés par l'événement, ex. `"Pack Gold"`. */
  types: string[];
  partners: ApiPartner[];
  activities: ApiPartnerActivity[];
};

export type ApiSponsor = {
  id: string;
  socials: Social[];
  sponsoring: string[];
  name: string;
  logoName: string;
  siteUrl?: string;
  logoUrl: string;
  ext: string;
  description?: string;
  editedVideoUrl?: string;
};

/** Projette un partenaire de l'API sur la forme consommée par les composants. */
export const formatPartner = (partner: ApiPartner): ApiSponsor => ({
  id: partner.id,
  name: partner.name,
  description: partner.description,
  socials: normalizeSocials(partner.socials),
  siteUrl: partner.siteUrl,
  logoUrl: partner.media.svg,
  ext: "svg",
  logoName: partner.name.toLowerCase().replaceAll(" ", "-"),
  sponsoring: partner.types || [],
  editedVideoUrl: partner.videoUrl ?? undefined,
});

/**
 * Complète en `https://` une URL de site sans schéma. Mutation en place :
 * comportement d'origine, conservé tel quel.
 */
export const normalizeSponsorUrl = (sponsor: ApiSponsor): void => {
  if (!sponsor.siteUrl) return;
  try {
    if (
      !sponsor.siteUrl.includes("https://") &&
      !sponsor.siteUrl.includes("http://")
    ) {
      sponsor.siteUrl = "https://" + sponsor.siteUrl;
    }
    isURL(new URL(sponsor.siteUrl));
  } catch {
    console.error(`Bad URL for ${sponsor.name}`);
  }
};

/**
 * Overrides temporaires du niveau de sponsoring, en attendant la mise à jour
 * côté backend (CMS partenaires). Clé = id du partenaire, valeur = types forcés.
 */
const SPONSORING_OVERRIDES: Record<string, string[]> = {
  // DECATHLON DIGITAL : Pack Bronze -> Pack Gold
  "b9ae1a05-2f42-4d0f-b414-c455b3fe20b0": ["Pack Gold"],
};

export const applySponsoringOverride = (sponsor: ApiSponsor): ApiSponsor => {
  const override = SPONSORING_OVERRIDES[sponsor.id];
  return override ? { ...sponsor, sponsoring: override } : sponsor;
};

/** Index « ce partenaire a-t-il au moins une activité ? », pour l'audit. */
export const buildPartnerActivities = (
  activities: unknown,
): Record<string, boolean> => {
  const result: Record<string, boolean> = {};
  if (!Array.isArray(activities)) return result;
  for (const activity of activities) {
    if (activity?.partnerId) {
      result[activity.partnerId] = true;
    }
  }
  return result;
};
