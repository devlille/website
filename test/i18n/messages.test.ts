import { describe, expect, it } from "vitest";
import { site } from "../../src/config";
import { locale, t } from "../../src/i18n";
import { fr } from "../../src/i18n/fr";

describe("dictionnaire du site", () => {
  it("est branché sur la locale de l'instance", () => {
    expect(locale).toBe(site.locale);
  });

  it("traduit une clé du dictionnaire chargé", () => {
    expect(t("favorites.add")).toBe("Ajouter aux favoris");
  });

  it("interpole le nom du site et l'édition", () => {
    expect(t("footer.copyright", { site: "DevLille", edition: 2026 })).toBe(
      "DevLille, 2026",
    );
  });

  it("ne laisse aucun message vide", () => {
    const empty = Object.entries(fr).filter(([, value]) => !value.trim());

    expect(empty).toEqual([]);
  });
});
