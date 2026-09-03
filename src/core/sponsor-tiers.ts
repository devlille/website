/**
 * Répartition des partenaires par pack de sponsoring.
 *
 * La table des packs — leurs libellés, leur ordre — est une donnée d'instance :
 * elle arrive par paramètre depuis `event.config.ts`, jamais en dur ici.
 */
import type { SponsorTier } from "../config/schema";

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
  tiers: readonly SponsorTier[],
  sponsors: T[],
): SponsorGroup<T>[] =>
  tiers
    .map((tier) => ({
      id: tier.id,
      title: tier.title,
      partners: sponsors.filter((s) =>
        s.tiers.some((label) => tier.labels.includes(label)),
      ),
    }))
    .filter((group) => group.partners.length > 0);
