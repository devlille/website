import { z } from "astro/zod";
import { describe, expect, it } from "vitest";
import { defineConfig } from "../../src/config/define";

const schema = z.object({
  name: z.string().min(1),
  venue: z.object({ postalCode: z.string() }),
  offers: z.array(z.object({ price: z.number() })).default([]),
});

describe("defineConfig", () => {
  it("renvoie la configuration validée, valeurs par défaut comprises", () => {
    const config = defineConfig("event.config.ts", schema, {
      name: "DevLille",
      venue: { postalCode: "59777" },
    });

    expect(config).toEqual({
      name: "DevLille",
      venue: { postalCode: "59777" },
      offers: [],
    });
  });

  it("échoue en nommant le fichier et le chemin du champ fautif", () => {
    expect(() =>
      defineConfig("event.config.ts", schema, {
        name: "",
        venue: { postalCode: "59777" },
      }),
    ).toThrow(/event\.config\.ts[\s\S]*name/);
  });

  it("désigne un champ imbriqué par son chemin complet", () => {
    expect(() =>
      defineConfig("event.config.ts", schema, {
        name: "DevLille",
        venue: { postalCode: "59777" },
        // @ts-expect-error — c'est précisément l'erreur qu'on veut voir remonter
        offers: [{ price: 80 }, { price: "quarante" }],
      }),
    ).toThrow(/offers\[1\]\.price/);
  });
});
