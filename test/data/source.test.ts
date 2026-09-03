import { describe, expect, it, vi } from "vitest";

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

  it("refuse une source de données inconnue", async () => {
    vi.resetModules();
    vi.stubEnv("DATA_SOURCE", "postgres");
    const previous = Symbol.for("devlille.dataSource");
    const host = globalThis as Record<symbol, unknown>;
    const saved = host[previous];
    delete host[previous];

    await expect(import("../../src/data")).rejects.toThrow(/postgres/);

    host[previous] = saved;
    vi.unstubAllEnvs();
  });
});
