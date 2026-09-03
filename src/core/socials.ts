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

export type ApiSocial = { type: string; url: string };

export type Social = { type: SocialType; url: string };

const isSocialType = (type: string): type is SocialType =>
  (SOCIAL_TYPES as readonly string[]).includes(type.toLowerCase());

/**
 * Normalise la casse des types de réseaux et écarte ceux que le site ne sait
 * pas afficher (pas d'icône dans le sprite).
 */
export const normalizeSocials = (socials: ApiSocial[] | undefined): Social[] => {
  if (!Array.isArray(socials)) return [];
  return socials
    .map((s) => ({ ...s, type: s.type.toLowerCase() }))
    .filter((s): s is Social => isSocialType(s.type));
};

/** Premier lien du type demandé, `null` s'il n'y en a pas. */
export const getSocialUrl = (
  socials: ApiSocial[],
  type: string,
): string | null => socials.find((s) => s.type === type)?.url ?? null;
