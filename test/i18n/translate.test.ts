import { describe, expect, it } from "vitest";
import { createTranslator } from "../../src/i18n/translate";

const messages = {
  "job.experience": "Expérience",
  "job.minYears": "Minimum {years} ans",
  "sponsors.visitSite": "Visiter le site de {name}",
  "layout.thanks": "Merci pour l'édition {edition} de {site} !",
} as const;

const t = createTranslator(messages);

describe("createTranslator", () => {
  it("rend un message sans paramètre", () => {
    expect(t("job.experience")).toBe("Expérience");
  });

  it("interpole les paramètres nommés", () => {
    expect(t("sponsors.visitSite", { name: "Decathlon" })).toBe(
      "Visiter le site de Decathlon",
    );
  });

  it("interpole plusieurs paramètres, y compris numériques", () => {
    expect(t("layout.thanks", { edition: 2026, site: "DevLille" })).toBe(
      "Merci pour l'édition 2026 de DevLille !",
    );
  });

  it("échoue sur une clé inconnue plutôt que d'afficher la clé", () => {
    // @ts-expect-error — clé absente du dictionnaire, refusée à la compilation
    expect(() => t("job.unknown")).toThrow(/job\.unknown/);
  });

  it("échoue sur un paramètre manquant plutôt que de laisser le marqueur", () => {
    expect(() => t("job.minYears")).toThrow(/years/);
  });
});
