export type SponsorTier = {
  id: string;
  /** Titre affiché au-dessus du pack. */
  title: string;
  /** Reconnaît un des libellés de sponsoring renvoyés par l'API. */
  match: (sponsoring: string) => boolean;
};

const exactly =
  (...labels: string[]) =>
  (sponsoring: string) =>
    labels.includes(sponsoring);

/**
 * Packs de sponsoring, dans leur ordre d'affichage.
 *
 * Les libellés sont ceux du DevLille : ils remonteront en configuration
 * d'instance en phase 4, cette table n'a pas vocation à rester générique.
 */
export const SPONSOR_TIERS: SponsorTier[] = [
  { id: "gold", title: "Gold", match: exactly("gold", "Pack Gold") },
  { id: "silver", title: "Silver", match: exactly("silver", "Pack Silver") },
  { id: "bronze", title: "Bronze", match: exactly("bronze", "Pack Bronze") },
  {
    id: "graine-de-dev",
    title: "Partenaires DevLille Graine de Dev",
    match: exactly("Partenaires DevLille Graine de Dev"),
  },
  {
    id: "hebergement",
    title: "Partenaire Hébergement",
    match: exactly("Partenaire Hébergement"),
  },
  {
    id: "community",
    title: "Community Partners",
    match: exactly("Community Partners"),
  },
  {
    id: "media",
    title: "Partenaires Média",
    match: exactly("Partenaires Média"),
  },
];

export type SponsorGroup<T> = {
  id: string;
  title: string;
  partners: T[];
};

/** Tout ce dont la répartition a besoin : la liste des packs du partenaire. */
type Sponsored = { tiers: string[] };

/**
 * Répartit les partenaires par pack, dans l'ordre de `tiers`, en écartant les
 * packs vides. Un partenaire qui cumule deux packs apparaît dans les deux.
 */
export const groupSponsorsByTier = <T extends Sponsored>(
  sponsors: T[],
  tiers: SponsorTier[] = SPONSOR_TIERS,
): SponsorGroup<T>[] =>
  tiers
    .map((tier) => ({
      id: tier.id,
      title: tier.title,
      partners: sponsors.filter((s) => s.tiers.some(tier.match)),
    }))
    .filter((group) => group.partners.length > 0);
