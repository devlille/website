import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createStaticDataSource } from "../../src/data/adapters/static";

/**
 * Jeu minimal mais complet : chaque fichier ne porte que les champs
 * obligatoires, afin que les valeurs par défaut des schémas soient exercées.
 */
const DATASET: Record<string, unknown> = {
  "event.json": {
    id: "evt",
    name: "DevLille",
    startDate: "2026-06-11",
    endDate: "2026-06-12",
    faq: [
      {
        id: "q1",
        order: 1,
        question: "Quand ?",
        response: "En **juin**",
      },
    ],
  },
  "agenda.json": {
    schedules: [
      {
        id: "s1",
        date: "2026-06-11",
        startTime: "2026-06-11T09:00",
        endTime: "2026-06-11T09:45",
        room: "Grand Théâtre",
        sessionId: "t1",
      },
    ],
    sessions: [
      {
        id: "t1",
        type: "talk-session",
        title: "Astro sans backend",
        abstract: "Un résumé",
        language: "fr",
        level: null,
        speakerIds: ["sp1"],
        slidesUrl: null,
        replayUrl: null,
        openFeedbackUrl: null,
      },
    ],
    speakers: [
      {
        id: "sp1",
        name: "Alice",
        bio: "Bio",
        photoUrl: "https://cdn.example.com/alice.png",
        pronouns: null,
        company: null,
        jobTitle: null,
        websiteUrl: null,
      },
    ],
  },
  "partners.json": [
    {
      id: "p1",
      name: "Acme",
      description: "Une description",
      logoUrl: "https://cdn.example.com/acme.png",
      logoName: "acme",
      siteUrl: "https://acme.example.com",
      videoUrl: null,
      tiers: ["Pack Gold"],
      jobs: [
        {
          url: "https://acme.example.com/jobs/1",
          title: "Dev",
          companyName: "Acme",
          location: "Lille",
          salary: null,
          requirements: null,
          publishDate: 1750000000000,
        },
      ],
    },
  ],
  "activities.json": [
    {
      id: "a1",
      name: "Atelier",
      startTime: "2026-06-11T10:00",
      endTime: "2026-06-11T11:00",
      partnerId: "p1",
      partnerName: "Acme",
      partnerLogoUrl: null,
    },
  ],
  "videos.json": [
    {
      id: "v1",
      videoId: "v1",
      title: "Rétrospective",
      description: "Résumé",
      publishedAt: "2025-06-12T10:00:00+00:00",
      thumbnailUrl: "https://i.ytimg.com/vi/v1/hq.jpg",
    },
  ],
};

const dirs: string[] = [];

/** Écrit un jeu de fichiers, `overrides` remplaçant ou supprimant un fichier. */
const writeDataset = async (
  overrides: Record<string, unknown | string | null> = {},
): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "static-event-"));
  dirs.push(dir);
  const files = { ...DATASET, ...overrides };
  for (const [name, content] of Object.entries(files)) {
    if (content === null) continue;
    const body =
      typeof content === "string" ? content : JSON.stringify(content, null, 2);
    await writeFile(join(dir, name), body, "utf8");
  }
  return dir;
};

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true })));
});

describe("createStaticDataSource", () => {
  it("lit l'événement et sa FAQ depuis event.json", async () => {
    const source = createStaticDataSource({ dir: await writeDataset() });

    const event = await source.getEvent();

    expect(event.name).toBe("DevLille");
    expect(event.startDate).toBe("2026-06-11");
    expect(await source.getFaq()).toEqual(event.faq);
    expect(event.faq[0]).toEqual({
      id: "q1",
      order: 1,
      question: "Quand ?",
      response: "En **juin**",
      acronyms: [],
      actions: [],
    });
  });

  it("lit l'agenda et en expose les speakers", async () => {
    const source = createStaticDataSource({ dir: await writeDataset() });

    const agenda = await source.getAgenda();

    expect(agenda.schedules).toHaveLength(1);
    expect(agenda.sessions[0]?.title).toBe("Astro sans backend");
    expect(await source.getSpeakers()).toEqual(agenda.speakers);
  });

  it("complète les champs de liste absents par un tableau vide", async () => {
    const source = createStaticDataSource({ dir: await writeDataset() });

    const [speaker] = (await source.getAgenda()).speakers;
    const [partner] = await source.getPartners();

    expect(speaker?.socials).toEqual([]);
    expect(speaker?.partners).toEqual([]);
    expect(partner?.socials).toEqual([]);
    expect(partner?.speakerIds).toEqual([]);
  });

  it("lit les partenaires et les activités", async () => {
    const source = createStaticDataSource({ dir: await writeDataset() });

    expect((await source.getPartners())[0]?.tiers).toEqual(["Pack Gold"]);
    expect((await source.getActivities())[0]?.partnerId).toBe("p1");
  });

  it("dérive les offres d'emploi des partenaires, comme l'adapter HTTP", async () => {
    const source = createStaticDataSource({ dir: await writeDataset() });

    expect(await source.getJobs()).toEqual([
      {
        url: "https://acme.example.com/jobs/1",
        title: "Dev",
        companyName: "Acme",
        location: "Lille",
        salary: null,
        requirements: null,
        publishDate: 1750000000000,
        partnerId: "p1",
        partnerName: "Acme",
      },
    ]);
  });

  it("lit les vidéos", async () => {
    const source = createStaticDataSource({ dir: await writeDataset() });

    expect((await source.getVideos())[0]?.videoId).toBe("v1");
  });

  it("ne lit et ne valide chaque fichier qu'une seule fois", async () => {
    const dir = await writeDataset();
    const source = createStaticDataSource({ dir });

    const [partners] = await Promise.all([
      source.getPartners(),
      source.getActivities(),
      source.getJobs(),
    ]);

    expect(await source.getPartners()).toBe(partners);
  });

  it("nomme le fichier attendu quand il manque", async () => {
    const source = createStaticDataSource({
      dir: await writeDataset({ "event.json": null }),
    });

    await expect(source.getEvent()).rejects.toThrow(/event\.json.*introuvable/i);
  });

  it("signale un JSON syntaxiquement invalide sans laisser fuir l'erreur brute", async () => {
    const source = createStaticDataSource({
      dir: await writeDataset({ "videos.json": "[{,]" }),
    });

    await expect(source.getVideos()).rejects.toThrow(
      /videos\.json.*JSON valide/i,
    );
  });

  it("nomme le champ fautif quand le contenu ne respecte pas le schéma", async () => {
    const source = createStaticDataSource({
      dir: await writeDataset({
        "activities.json": [{ id: "a1", name: 42, partnerId: "p1" }],
      }),
    });

    const error = await source.getActivities().catch((e: Error) => e);

    expect(String(error)).toMatch(/activities\.json/);
    expect(String(error)).toMatch(/\[0\]\.name/);
    expect(String(error)).toMatch(/\[0\]\.startTime/);
  });

  it("laisse passer une erreur système qui n'est pas un fichier absent", async () => {
    // Un dossier nommé `videos.json` : ni un fichier manquant, ni un JSON
    // invalide. L'erreur doit remonter telle quelle plutôt qu'être traduite en
    // « fichier introuvable », qui enverrait sur une fausse piste.
    const dir = await writeDataset({ "videos.json": null });
    await mkdir(join(dir, "videos.json"));

    await expect(createStaticDataSource({ dir }).getVideos()).rejects.toThrow(
      /EISDIR/,
    );
  });

  it("refuse un objet là où un tableau est attendu", async () => {
    const source = createStaticDataSource({
      dir: await writeDataset({ "partners.json": { id: "p1" } }),
    });

    await expect(source.getPartners()).rejects.toThrow(/partners\.json/);
  });

  it("refuse un type de réseau social hors de la liste connue", async () => {
    const dir = await writeDataset({
      "partners.json": [
        {
          ...(DATASET["partners.json"] as Array<Record<string, unknown>>)[0],
          socials: [{ type: "myspace", url: "https://myspace.com/acme" }],
        },
      ],
    });

    await expect(
      createStaticDataSource({ dir }).getPartners(),
    ).rejects.toThrow(/socials/);
  });
});

describe("le jeu d'exemple livré avec le dépôt", () => {
  const source = createStaticDataSource({ dir: "examples/static-event" });

  it("est complet et valide", async () => {
    const [event, agenda, partners, activities, videos] = await Promise.all([
      source.getEvent(),
      source.getAgenda(),
      source.getPartners(),
      source.getActivities(),
      source.getVideos(),
    ]);

    expect(event.faq.length).toBeGreaterThan(0);
    expect(agenda.schedules.length).toBeGreaterThan(0);
    expect(agenda.sessions.length).toBeGreaterThan(0);
    expect(agenda.speakers.length).toBeGreaterThan(0);
    expect(partners.length).toBeGreaterThan(0);
    expect(activities.length).toBeGreaterThan(0);
    expect(videos.length).toBeGreaterThan(0);
  });

  it("garde ses références internes cohérentes", async () => {
    const agenda = await source.getAgenda();
    const sessionIds = new Set(agenda.sessions.map((s) => s.id));
    const speakerIds = new Set(agenda.speakers.map((s) => s.id));
    const partnerIds = new Set((await source.getPartners()).map((p) => p.id));

    const orphanSlots = agenda.schedules
      .filter((slot) => slot.sessionId !== null)
      .filter((slot) => !sessionIds.has(slot.sessionId as string));
    const orphanSpeakers = agenda.sessions.flatMap((session) =>
      session.speakerIds.filter((id) => !speakerIds.has(id)),
    );
    const orphanActivities = (await source.getActivities()).filter(
      (activity) => !partnerIds.has(activity.partnerId),
    );

    expect(orphanSlots).toEqual([]);
    expect(orphanSpeakers).toEqual([]);
    expect(orphanActivities).toEqual([]);
  });
});
