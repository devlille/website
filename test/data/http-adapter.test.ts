import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHttpDataSource } from "../../src/data/adapters/http";
import agendaFixture from "../fixtures/agenda.json" with { type: "json" };
import partnersFixture from "../fixtures/partners.json" with { type: "json" };

const EVENT = {
  id: "evt",
  name: "DevLille",
  start_date: "2026-06-11",
  end_date: "2026-06-12",
  qanda: [
    {
      id: "q1",
      order: 1,
      question: "Quand ?",
      response: "En juin",
      acronyms: [],
      actions: [],
    },
  ],
};

const YOUTUBE_FEED = `<feed><entry>
  <yt:videoId>abc</yt:videoId><title>Une vidéo</title>
  <published>2025-06-12T10:00:00+00:00</published>
  <media:thumbnail url="https://i.ytimg.com/vi/abc/hq.jpg"/>
  <media:description>Résumé</media:description>
</entry></feed>`;

const config = {
  baseUrl: "https://api.example.com",
  eventId: "evt",
  youtubePlaylistId: "PL123",
};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

const stubFetch = () => {
  const calls: string[] = [];
  const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("youtube.com")) return new Response(YOUTUBE_FEED);
    if (url.endsWith("/agenda")) return jsonResponse(agendaFixture);
    if (url.endsWith("/partners/activities")) return jsonResponse(partnersFixture);
    return jsonResponse(EVENT);
  });
  vi.stubGlobal("fetch", fetchSpy);
  return calls;
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("createHttpDataSource", () => {
  it("construit les URLs à partir de la base et de l'identifiant d'événement", async () => {
    const calls = stubFetch();
    const source = createHttpDataSource(config);

    await source.getAgenda();
    await source.getPartners();
    await source.getEvent();

    expect(calls).toEqual([
      "https://api.example.com/events/evt/agenda",
      "https://api.example.com/events/evt/partners/activities",
      "https://api.example.com/events/evt",
    ]);
  });

  it("ne récupère l'agenda qu'une seule fois, quel que soit le nombre d'appels", async () => {
    const calls = stubFetch();
    const source = createHttpDataSource(config);

    await Promise.all([
      source.getAgenda(),
      source.getAgenda(),
      source.getSpeakers(),
    ]);
    await source.getAgenda();

    expect(calls.filter((u) => u.endsWith("/agenda"))).toHaveLength(1);
  });

  it("ne récupère les partenaires qu'une seule fois pour partners, activities et jobs", async () => {
    const calls = stubFetch();
    const source = createHttpDataSource(config);

    await Promise.all([
      source.getPartners(),
      source.getActivities(),
      source.getJobs(),
      source.getActivities(),
    ]);

    expect(
      calls.filter((u) => u.endsWith("/partners/activities")),
    ).toHaveLength(1);
  });

  it("ne récupère l'événement qu'une seule fois pour l'événement et la FAQ", async () => {
    const calls = stubFetch();
    const source = createHttpDataSource(config);

    await Promise.all([source.getEvent(), source.getFaq(), source.getFaq()]);

    expect(calls.filter((u) => u === "https://api.example.com/events/evt")).toHaveLength(1);
  });

  it("réclame la version 4 de l'API pour l'agenda", async () => {
    stubFetch();
    const source = createHttpDataSource(config);

    await source.getAgenda();

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/events/evt/agenda",
      { headers: { Accept: "application/json; version=4" } },
    );
  });

  it("expose la FAQ de l'événement", async () => {
    stubFetch();
    const source = createHttpDataSource(config);

    expect(await source.getFaq()).toEqual([
      {
        id: "q1",
        order: 1,
        question: "Quand ?",
        response: "En juin",
        acronyms: [],
        actions: [],
      },
    ]);
  });

  it("lit la playlist YouTube configurée", async () => {
    const calls = stubFetch();
    const source = createHttpDataSource(config);

    const videos = await source.getVideos();

    expect(calls).toContain(
      "https://www.youtube.com/feeds/videos.xml?playlist_id=PL123",
    );
    expect(videos).toEqual([
      {
        id: "abc",
        videoId: "abc",
        title: "Une vidéo",
        description: "Résumé",
        publishedAt: "2025-06-12T10:00:00+00:00",
        thumbnailUrl: "https://i.ytimg.com/vi/abc/hq.jpg",
      },
    ]);
  });

  it("signale une réponse en erreur plutôt que de renvoyer des données vides", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 500 })),
    );
    const source = createHttpDataSource(config);

    await expect(source.getAgenda()).rejects.toThrow(/500/);
  });
});
