import { describe, expect, it, vi } from "vitest";
import {
  applySponsoringOverride,
  buildPartnerActivities,
  formatPartner,
  normalizeSponsorUrl,
  type ApiPartner,
} from "../../src/core/partners";
import partnersFixture from "../fixtures/partners.json" with { type: "json" };

const apiPartner = (over: Partial<ApiPartner> = {}): ApiPartner => ({
  id: "p1",
  name: "Clever Cloud",
  description: "Un hébergeur",
  media: { svg: "https://example.com/logo.svg" },
  videoUrl: null,
  types: ["Pack Gold"],
  socials: [{ type: "linkedin", url: "https://linkedin.com/company/clever" }],
  siteUrl: "https://www.clever.cloud/fr/",
  ...over,
});

describe("formatPartner", () => {
  it("projette la réponse API sur la forme attendue par le site", () => {
    expect(formatPartner(apiPartner())).toEqual({
      id: "p1",
      name: "Clever Cloud",
      description: "Un hébergeur",
      socials: [
        { type: "linkedin", url: "https://linkedin.com/company/clever" },
      ],
      siteUrl: "https://www.clever.cloud/fr/",
      logoUrl: "https://example.com/logo.svg",
      ext: "svg",
      logoName: "clever-cloud",
      sponsoring: ["Pack Gold"],
      editedVideoUrl: undefined,
    });
  });

  it("dérive le nom de logo en minuscules et sans espace", () => {
    expect(formatPartner(apiPartner({ name: "AXA FRANCE IARD" })).logoName).toBe(
      "axa-france-iard",
    );
  });

  it("accepte un partenaire sans description", () => {
    expect(formatPartner(apiPartner({ description: "" })).description).toBe("");
  });

  it("filtre les réseaux d'un type inconnu", () => {
    const sponsor = formatPartner(
      apiPartner({
        socials: [
          { type: "facebook", url: "https://facebook.com/axa" },
          { type: "x", url: "https://x.com/axa" },
        ],
      }),
    );

    expect(sponsor.socials).toEqual([{ type: "x", url: "https://x.com/axa" }]);
  });

  it("tolère un partenaire sans réseaux du tout", () => {
    expect(formatPartner(apiPartner({ socials: undefined })).socials).toEqual(
      [],
    );
  });

  it("remplace une vidéo absente par undefined plutôt que null", () => {
    expect(formatPartner(apiPartner({ videoUrl: null })).editedVideoUrl).toBe(
      undefined,
    );
    expect(
      formatPartner(apiPartner({ videoUrl: "https://youtu.be/x" }))
        .editedVideoUrl,
    ).toBe("https://youtu.be/x");
  });

  it("retombe sur une liste vide quand l'API n'envoie pas de pack", () => {
    expect(
      formatPartner(apiPartner({ types: undefined as never })).sponsoring,
    ).toEqual([]);
  });

  it("formate tous les partenaires du dump réel sans lever d'erreur", () => {
    const sponsors = partnersFixture.partners.map((p) =>
      formatPartner(p as ApiPartner),
    );

    expect(sponsors).toHaveLength(61);
    expect(sponsors.every((s) => s.logoUrl.length > 0)).toBe(true);
    expect(sponsors.every((s) => s.ext === "svg")).toBe(true);
  });
});

describe("normalizeSponsorUrl", () => {
  it("préfixe en https une URL sans schéma", () => {
    const sponsor = formatPartner(apiPartner({ siteUrl: "devlille.fr" }));

    normalizeSponsorUrl(sponsor);

    expect(sponsor.siteUrl).toBe("https://devlille.fr");
  });

  it("laisse intacte une URL déjà en https", () => {
    const sponsor = formatPartner(
      apiPartner({ siteUrl: "https://devlille.fr" }),
    );

    normalizeSponsorUrl(sponsor);

    expect(sponsor.siteUrl).toBe("https://devlille.fr");
  });

  it("laisse intacte une URL en http", () => {
    const sponsor = formatPartner(apiPartner({ siteUrl: "http://devlille.fr" }));

    normalizeSponsorUrl(sponsor);

    expect(sponsor.siteUrl).toBe("http://devlille.fr");
  });

  it("ne touche pas à un partenaire sans site", () => {
    const sponsor = formatPartner(apiPartner({ siteUrl: undefined }));

    normalizeSponsorUrl(sponsor);

    expect(sponsor.siteUrl).toBeUndefined();
  });

  it("signale une URL invalide sans faire échouer le build", () => {
    using warn = vi.spyOn(console, "error").mockImplementation(() => {});
    const sponsor = formatPartner(apiPartner({ siteUrl: "https://" }));

    normalizeSponsorUrl(sponsor);

    expect(warn).toHaveBeenCalledWith("Bad URL for Clever Cloud");
  });

  // Comportement actuel, volontairement figé : le test porte sur `includes`
  // et non sur `startsWith`, donc une URL sans schéma qui contient "https://"
  // dans un paramètre passe à travers. À corriger en phase 2.
  it("ne préfixe pas une URL sans schéma contenant https:// dans un paramètre", () => {
    using _warn = vi.spyOn(console, "error").mockImplementation(() => {});
    const sponsor = formatPartner(
      apiPartner({ siteUrl: "devlille.fr?from=https://google.com" }),
    );

    normalizeSponsorUrl(sponsor);

    expect(sponsor.siteUrl).toBe("devlille.fr?from=https://google.com");
  });
});

describe("applySponsoringOverride", () => {
  it("force le pack d'un partenaire listé dans les overrides", () => {
    const sponsor = formatPartner(
      apiPartner({
        id: "b9ae1a05-2f42-4d0f-b414-c455b3fe20b0",
        types: ["Pack Bronze"],
      }),
    );

    expect(applySponsoringOverride(sponsor).sponsoring).toEqual(["Pack Gold"]);
  });

  it("laisse intact un partenaire non listé", () => {
    const sponsor = formatPartner(apiPartner({ types: ["Pack Bronze"] }));

    expect(applySponsoringOverride(sponsor)).toEqual(sponsor);
  });
});

describe("buildPartnerActivities", () => {
  it("marque les partenaires qui ont au moins une activité", () => {
    expect(
      buildPartnerActivities([{ partnerId: "p1" }, { partnerId: "p2" }]),
    ).toEqual({ p1: true, p2: true });
  });

  it("renvoie un objet vide quand l'API n'envoie pas un tableau", () => {
    expect(buildPartnerActivities(undefined)).toEqual({});
    expect(buildPartnerActivities(null)).toEqual({});
  });

  // Bug connu, figé ici pour être corrigé en phase 2 : l'API renvoie
  // `partner_id` (snake_case) et non `partnerId`.
  it("ne reconnaît aucune activité du dump réel (clé camelCase attendue)", () => {
    expect(buildPartnerActivities(partnersFixture.activities)).toEqual({});
  });
});
