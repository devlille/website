import { describe, expect, it } from "vitest";
import {
  event,
  favoritesStorageKey,
  features,
  integrations,
  lang,
  site,
  ticketsUrl,
} from "../../src/config";

describe("configuration de l'instance", () => {
  it("se charge : les quatre fichiers passent leur schéma", () => {
    expect(site.name).toBe("DevLille");
    expect(event.edition).toBe(2026);
    expect(features.sponsoring).toBe(true);
    expect(integrations.api.eventId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("dérive la langue du document de la locale", () => {
    expect(lang).toBe("fr");
  });

  it("dérive l'URL de billetterie de l'édition en cours", () => {
    expect(ticketsUrl).toBe("https://www.billetweb.fr/devlille-2026");
    expect(ticketsUrl).not.toContain("{edition}");
  });

  it("préfixe la clé de stockage des favoris par l'identifiant du site", () => {
    expect(favoritesStorageKey).toBe("devlille_favorites");
  });

  it("commence et finit l'événement dans le bon ordre", () => {
    expect(event.startDate <= event.endDate).toBe(true);
    expect(event.ticketing.salesOpenDate < event.startDate).toBe(true);
  });

  it("ne déclare pas deux packs de sponsoring sous le même libellé", () => {
    const labels = event.sponsorTiers.flatMap((tier) => tier.labels);

    expect(new Set(labels).size).toBe(labels.length);
  });

  it("ne gate un lien de pied de page que sur un drapeau connu", () => {
    for (const link of site.footerLinks) {
      if (link.feature) expect(features).toHaveProperty(link.feature);
    }
  });
});
