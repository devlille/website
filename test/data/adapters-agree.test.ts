import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createStaticDataSource } from "../../src/data/adapters/static";
import {
  toActivities,
  toAgenda,
  toPartners,
} from "../../src/data/adapters/http/mappers";
import agendaFixture from "../fixtures/agenda.json" with { type: "json" };
import partnersFixture from "../fixtures/partners.json" with { type: "json" };

/**
 * Le format statique n'est pas un format de plus : c'est le domaine sérialisé.
 * Ce test l'impose — ce que produit l'adapter HTTP doit être relisible à
 * l'identique par l'adapter statique. Toute dérive entre `domain.ts` et
 * `schemas.ts` le casse.
 */
const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true })));
});

describe("adapters HTTP et statique", () => {
  it("s'accordent sur le domaine : ce que l'un produit, l'autre le relit", async () => {
    const agenda = toAgenda(agendaFixture as never);
    const partners = toPartners(partnersFixture as never);
    const activities = toActivities(partnersFixture as never);
    const event = {
      id: "evt",
      name: "DevLille",
      startDate: "2026-06-11",
      endDate: "2026-06-12",
      faq: [],
    };

    const dir = await mkdtemp(join(tmpdir(), "roundtrip-"));
    dirs.push(dir);
    for (const [name, value] of Object.entries({
      event,
      agenda,
      partners,
      activities,
      videos: [],
    })) {
      await writeFile(join(dir, `${name}.json`), JSON.stringify(value), "utf8");
    }

    const source = createStaticDataSource({ dir });

    expect(await source.getAgenda()).toEqual(agenda);
    expect(await source.getPartners()).toEqual(partners);
    expect(await source.getActivities()).toEqual(activities);
  });
});
