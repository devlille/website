import { describe, expect, it } from "vitest";
import { getSocialUrl, normalizeSocials } from "../../src/core/socials";
import partnersFixture from "../fixtures/partners.json" with { type: "json" };
import agendaFixture from "../fixtures/agenda.json" with { type: "json" };

describe("normalizeSocials", () => {
  it("conserve les réseaux dont le type est connu", () => {
    expect(
      normalizeSocials([
        { type: "linkedin", url: "https://linkedin.com/company/devlille" },
      ]),
    ).toEqual([
      { type: "linkedin", url: "https://linkedin.com/company/devlille" },
    ]);
  });

  it("filtre un réseau d'un type inconnu", () => {
    expect(
      normalizeSocials([
        { type: "facebook", url: "https://facebook.com/devlille" },
        { type: "x", url: "https://x.com/devlille" },
      ]),
    ).toEqual([{ type: "x", url: "https://x.com/devlille" }]);
  });

  it("normalise la casse du type", () => {
    expect(
      normalizeSocials([{ type: "LinkedIn", url: "https://example.com" }]),
    ).toEqual([{ type: "linkedin", url: "https://example.com" }]);
  });

  it("renvoie une liste vide quand le partenaire n'a aucun réseau", () => {
    expect(normalizeSocials(undefined)).toEqual([]);
    expect(normalizeSocials([])).toEqual([]);
  });

  it("renvoie une liste vide quand l'API n'envoie pas un tableau", () => {
    expect(normalizeSocials("linkedin" as never)).toEqual([]);
    expect(normalizeSocials(null as never)).toEqual([]);
  });

  it("ne laisse passer aucun type inconnu sur le dump réel", () => {
    const kept = partnersFixture.partners.flatMap((p) =>
      normalizeSocials(p.socials).map((s) => s.type),
    );

    expect(kept).not.toContain("facebook");
    expect(new Set(kept)).toEqual(
      new Set(["linkedin", "instagram", "youtube", "x", "bluesky", "mastodon"]),
    );
  });
});

describe("getSocialUrl", () => {
  it("retrouve l'URL d'un type donné", () => {
    expect(
      getSocialUrl(
        [
          { type: "website", url: "https://devlille.fr" },
          { type: "x", url: "https://x.com/devlille" },
        ],
        "website",
      ),
    ).toBe("https://devlille.fr");
  });

  it("renvoie null quand le type est absent", () => {
    expect(getSocialUrl([{ type: "x", url: "https://x.com" }], "website")).toBe(
      null,
    );
  });

  it("renvoie null pour un speaker sans réseau", () => {
    expect(getSocialUrl([], "website")).toBe(null);
  });

  it("ne casse sur aucun speaker du dump réel", () => {
    for (const speaker of agendaFixture.speakers) {
      expect(() => getSocialUrl(speaker.socials ?? [], "website")).not.toThrow();
    }
  });
});
