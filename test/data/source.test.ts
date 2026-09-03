import { describe, expect, it, vi } from "vitest";

const SINGLETON = Symbol.for("devlille.dataSource");

/**
 * Réévalue `src/data` avec d'autres variables d'environnement. L'instance est
 * ancrée sur `globalThis` : il faut la retirer, puis la remettre, sinon les
 * autres tests hériteraient de la source construite ici.
 */
const withEnv = async (
  env: Record<string, string>,
  run: () => Promise<void>,
): Promise<void> => {
  const host = globalThis as Record<symbol, unknown>;
  const saved = host[SINGLETON];
  delete host[SINGLETON];
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  try {
    await run();
  } finally {
    vi.unstubAllEnvs();
    vi.resetModules();
    host[SINGLETON] = saved;
  }
};

describe("dataSource", () => {
  it("reste la même instance quand le module est réévalué", async () => {
    // Astro évalue `src/data` dans deux graphes de modules distincts (loaders
    // de contenu et bundle des pages) : sans ancrage global, le cache des
    // appels réseau serait dupliqué et chaque endpoint appelé deux fois.
    const first = (await import("../../src/data")).dataSource;

    vi.resetModules();
    const second = (await import("../../src/data")).dataSource;

    expect(second).toBe(first);
  });

  it("sélectionne l'adapter statique sans toucher au réseau", async () => {
    using _fetchSpy = vi.spyOn(globalThis, "fetch");
    await withEnv({ DATA_SOURCE: "static" }, async () => {
      const { dataSource } = await import("../../src/data");

      const event = await dataSource.getEvent();

      expect(event.name).toBeTypeOf("string");
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  it("refuse une source de données inconnue", async () => {
    await withEnv({ DATA_SOURCE: "postgres" }, async () => {
      await expect(import("../../src/data")).rejects.toThrow(/postgres/);
    });
  });
});
