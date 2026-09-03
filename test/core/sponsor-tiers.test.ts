import { describe, expect, it } from "vitest";
import { toPartners } from "../../src/data/adapters/http/mappers";
import type { ApiPartnersResponse } from "../../src/data/adapters/http/mappers";
import { groupSponsorsByTier } from "../../src/core/sponsor-tiers";
import { event } from "../../src/config";

const TIERS = event.sponsorTiers;
import partnersFixture from "../fixtures/partners.json" with { type: "json" };

const sponsor = (name: string, tiers: string[]) => ({ id: name, name, tiers });

describe("groupSponsorsByTier", () => {
  it("range chaque partenaire sous son pack", () => {
    const tiers = groupSponsorsByTier(TIERS, [
      sponsor("Alpha", ["Pack Gold"]),
      sponsor("Beta", ["Pack Silver"]),
    ]);

    expect(tiers.map((t) => [t.title, t.partners.map((p) => p.name)])).toEqual([
      ["Gold", ["Alpha"]],
      ["Silver", ["Beta"]],
    ]);
  });

  it("accepte aussi les libellés courts de l'ancienne API", () => {
    const tiers = groupSponsorsByTier(TIERS, [
      sponsor("Alpha", ["gold"]),
      sponsor("Beta", ["silver"]),
      sponsor("Gamma", ["bronze"]),
    ]);

    expect(tiers.map((t) => t.title)).toEqual(["Gold", "Silver", "Bronze"]);
  });

  it("omet les packs sans aucun partenaire", () => {
    const tiers = groupSponsorsByTier(TIERS, [sponsor("Alpha", ["Pack Gold"])]);

    expect(tiers).toHaveLength(1);
  });

  it("respecte l'ordre d'affichage des packs quelle que soit l'entrée", () => {
    const tiers = groupSponsorsByTier(TIERS, [
      sponsor("Media", ["Partenaires Média"]),
      sponsor("Bronze", ["Pack Bronze"]),
      sponsor("Gold", ["Pack Gold"]),
      sponsor("Graine", ["Partenaires DevLille Graine de Dev"]),
    ]);

    expect(tiers.map((t) => t.title)).toEqual([
      "Gold",
      "Bronze",
      "Partenaires DevLille Graine de Dev",
      "Partenaires Média",
    ]);
  });

  it("fait apparaître dans les deux packs un partenaire qui en cumule deux", () => {
    const tiers = groupSponsorsByTier(TIERS, [
      sponsor("Alpha", ["Pack Gold", "Partenaires Média"]),
    ]);

    expect(tiers.map((t) => t.title)).toEqual(["Gold", "Partenaires Média"]);
    expect(tiers.every((t) => t.partners[0].name === "Alpha")).toBe(true);
  });

  it("ignore un partenaire dont le pack n'est reconnu par aucun tier", () => {
    expect(groupSponsorsByTier(TIERS, [sponsor("Alpha", ["Pack Platine"])])).toEqual(
      [],
    );
  });

  it("ignore un partenaire sans aucun pack", () => {
    expect(groupSponsorsByTier(TIERS, [sponsor("Alpha", [])])).toEqual([]);
  });

  it("ne renvoie aucun pack pour une liste vide", () => {
    expect(groupSponsorsByTier(TIERS, [])).toEqual([]);
  });

  it("classe tous les partenaires du dump réel", () => {
    const sponsors = toPartners(partnersFixture as ApiPartnersResponse);

    const tiers = groupSponsorsByTier(TIERS, sponsors);
    const classified = new Set(
      tiers.flatMap((t) => t.partners.map((p) => p.id)),
    );

    expect(classified.size).toBe(sponsors.length);
  });

  it("couvre chaque type annoncé par l'API", () => {
    const matched = partnersFixture.types.filter((type) =>
      TIERS.some((tier) => tier.labels.includes(type)),
    );

    expect(matched).toHaveLength(partnersFixture.types.length);
  });
});
