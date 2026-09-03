import { describe, expect, it } from "vitest";
import {
  buildTalkDays,
  buildTalkSheets,
  formatDurationLabel,
  guessEventTitle,
} from "../../src/core/agenda";
import type {
  Agenda,
  ScheduleSlot,
  Session,
  Speaker,
} from "../../src/data/domain";
import { toAgenda } from "../../src/data/adapters/http/mappers";
import type { ApiAgenda } from "../../src/data/adapters/http/mappers";
import agendaFixture from "../fixtures/agenda.json" with { type: "json" };

const schedule = (over: Partial<ScheduleSlot> = {}): ScheduleSlot => ({
  id: "sch-1",
  date: "2026-06-11",
  startTime: "2026-06-11T09:00",
  endTime: "2026-06-11T09:45",
  room: "Marie Curie",
  sessionId: "sess-1",
  ...over,
});

const talkSession = (over: Partial<Session> = {}): Session => ({
  id: "sess-1",
  type: "talk-session",
  title: "Astro par la pratique",
  abstract: "Un **super** talk",
  language: "fr",
  level: "beginner",
  speakerIds: ["spk-1"],
  slidesUrl: null,
  replayUrl: null,
  openFeedbackUrl: null,
  ...over,
});

const eventSession = (id: string, title: string): Session => ({
  ...talkSession(),
  id,
  type: "event-session",
  title,
  speakerIds: [],
});

const speaker = (over: Partial<Speaker> = {}): Speaker => ({
  id: "spk-1",
  name: "Alice",
  bio: "",
  photoUrl: "https://example.com/a.jpg",
  pronouns: null,
  company: null,
  jobTitle: null,
  socials: [],
  websiteUrl: null,
  partners: [],
  ...over,
});

const agenda = (over: Partial<Agenda> = {}): Agenda => ({
  schedules: [schedule()],
  sessions: [talkSession()],
  speakers: [speaker()],
  ...over,
});

describe("formatDurationLabel", () => {
  it("exprime la durée d'un créneau en minutes", () => {
    expect(formatDurationLabel("2026-06-11T09:00", "2026-06-11T09:45")).toBe(
      "45 mn",
    );
  });

  it("compte les minutes au-delà d'une heure", () => {
    expect(formatDurationLabel("2026-06-11T12:00", "2026-06-11T14:00")).toBe(
      "120 mn",
    );
  });
});

describe("guessEventTitle", () => {
  const eventSessions: Session[] = [
    eventSession("e1", "Keynote d'ouverture 2026"),
    eventSession("e2", "Enregistrement des badges"),
    eventSession("e3", "Lunch 🍽️"),
    eventSession("e4", "Pause"),
  ];

  it("devine une keynote au Grand Théâtre", () => {
    expect(
      guessEventTitle(schedule({ room: "Grand Théâtre" }), eventSessions),
    ).toBe("Keynote d'ouverture 2026");
  });

  it("devine un enregistrement avant 9 h", () => {
    expect(
      guessEventTitle(
        schedule({ startTime: "2026-06-11T08:30" }),
        eventSessions,
      ),
    ).toBe("Enregistrement des badges");
  });

  it("devine un lunch entre midi et 14 h", () => {
    expect(
      guessEventTitle(
        schedule({ startTime: "2026-06-11T12:00" }),
        eventSessions,
      ),
    ).toBe("Lunch 🍽️");
  });

  it("devine une pause en dehors de ces plages", () => {
    expect(
      guessEventTitle(
        schedule({ startTime: "2026-06-11T15:30" }),
        eventSessions,
      ),
    ).toBe("Pause");
  });

  it("retombe sur un libellé par défaut quand aucune session ne correspond", () => {
    expect(guessEventTitle(schedule({ room: "Grand Théâtre" }), [])).toBe(
      "Keynote d'ouverture",
    );
    expect(
      guessEventTitle(schedule({ startTime: "2026-06-11T08:00" }), []),
    ).toBe("Enregistrement");
    expect(
      guessEventTitle(schedule({ startTime: "2026-06-11T13:00" }), []),
    ).toBe("Lunch");
    expect(
      guessEventTitle(schedule({ startTime: "2026-06-11T16:00" }), []),
    ).toBe("Pause");
  });

  it("donne la priorité au Grand Théâtre sur l'heure", () => {
    expect(
      guessEventTitle(
        schedule({ room: "Grand Théâtre", startTime: "2026-06-11T12:30" }),
        eventSessions,
      ),
    ).toBe("Keynote d'ouverture 2026");
  });
});

describe("buildTalkDays", () => {
  it("range un talk sous son jour et son créneau", () => {
    const [day] = buildTalkDays(agenda());

    expect(day.date).toBe("2026-06-11");
    expect(day.label).toBe("11 juin 2026");
    expect(day.slots).toHaveLength(1);
    expect(day.slots[0][0]).toBe("09:00");
    expect(day.slots[0][1][0].talk).toMatchObject({
      id: "sch-1",
      type: "talk-session",
      title: "Astro par la pratique",
      language: "fr",
      level: "beginner",
      room: "Marie Curie",
      duration: "45 mn",
    });
  });

  it("expose l'id du créneau et l'id de session pour un talk", () => {
    const [day] = buildTalkDays(agenda());
    const entry = day.slots[0][1][0];

    expect(entry.id).toBe("sch-1");
    expect(entry.sessionId).toBe("sess-1");
  });

  it("joint les noms des intervenants", () => {
    const [day] = buildTalkDays(
      agenda({
        sessions: [talkSession({ speakerIds: ["spk-1", "spk-2"] })],
        speakers: [speaker(), speaker({ id: "spk-2", name: "Bob" })],
      }),
    );

    expect(day.slots[0][1][0].speakers).toBe("Alice & Bob");
    expect(day.slots[0][1][0].speakersIds).toEqual(["spk-1", "spk-2"]);
  });

  it("laisse les intervenants indéfinis pour une session sans speaker", () => {
    const [day] = buildTalkDays(
      agenda({ sessions: [talkSession({ speakerIds: [] })], speakers: [] }),
    );

    expect(day.slots[0][1][0].speakers).toBeUndefined();
    expect(day.slots[0][1][0].speakersIds).toEqual([]);
  });

  it("ignore un intervenant référencé mais absent de l'agenda", () => {
    const [day] = buildTalkDays(
      agenda({
        sessions: [talkSession({ speakerIds: ["spk-1", "fantome"] })],
        speakers: [speaker()],
      }),
    );

    expect(day.slots[0][1][0].speakersIds).toEqual(["spk-1"]);
  });

  it("rend l'abstract en HTML", () => {
    const [day] = buildTalkDays(agenda());

    expect(day.slots[0][1][0].talk.abstract).toContain("<strong>super</strong>");
  });

  it("construit un créneau générique quand le créneau n'a pas de session", () => {
    const [day] = buildTalkDays(
      agenda({
        schedules: [
          schedule({
            sessionId: null,
            room: "Hall exposant",
            startTime: "2026-06-11T08:30",
            endTime: "2026-06-11T09:00",
          }),
        ],
        sessions: [],
      }),
    );
    const entry = day.slots[0][1][0];

    expect(entry.talk).toMatchObject({
      type: "event-session",
      title: "Enregistrement",
      abstract: "",
      language: "fr",
      duration: "30 mn",
      speakers: [],
    });
    expect(entry.id).toBeUndefined();
    expect(entry.speakers).toBeUndefined();
    expect(entry.speakersIds).toEqual([]);
  });

  it("écarte un créneau dont la session est introuvable", () => {
    expect(
      buildTalkDays(agenda({ schedules: [schedule()], sessions: [] })),
    ).toEqual([]);
  });

  it("n'attache ni intervenant ni lien à une session hors talk", () => {
    const [day] = buildTalkDays(
      agenda({
        sessions: [
          {
            ...eventSession("sess-1", "Lunch"),
            abstract: "Buffet",
            speakerIds: ["spk-1"],
          },
        ],
      }),
    );
    const entry = day.slots[0][1][0];

    expect(entry.id).toBeUndefined();
    expect(entry.sessionId).toBeUndefined();
    expect(entry.talk.speakers).toEqual([]);
    expect(entry.talk.abstract).toContain("Buffet");
  });

  it("retombe sur « Pause » quand la session n'a pas de titre", () => {
    const [day] = buildTalkDays(
      agenda({ sessions: [talkSession({ title: null })] }),
    );

    expect(day.slots[0][1][0].talk.title).toBe("Pause");
  });

  it("regroupe deux talks parallèles dans le même créneau", () => {
    const [day] = buildTalkDays(
      agenda({
        schedules: [
          schedule({ id: "a" }),
          schedule({ id: "b", room: "Codelabs" }),
        ],
      }),
    );

    expect(day.slots).toHaveLength(1);
    expect(day.slots[0][1].map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("trie les créneaux par heure croissante", () => {
    const [day] = buildTalkDays(
      agenda({
        schedules: [
          schedule({ id: "b", startTime: "2026-06-11T14:00" }),
          schedule({ id: "a", startTime: "2026-06-11T09:00" }),
        ],
      }),
    );

    expect(day.slots.map(([hour]) => hour)).toEqual(["09:00", "14:00"]);
  });

  it("sépare les jours de l'événement", () => {
    const days = buildTalkDays(
      agenda({
        schedules: [
          schedule(),
          schedule({
            id: "b",
            date: "2026-06-12",
            startTime: "2026-06-12T09:00",
            endTime: "2026-06-12T09:45",
          }),
        ],
      }),
    );

    expect(days.map((d) => d.date)).toEqual(["2026-06-11", "2026-06-12"]);
  });

  it("ne renvoie aucun jour pour un agenda vide", () => {
    expect(
      buildTalkDays({ schedules: [], sessions: [], speakers: [] }),
    ).toEqual([]);
  });

  describe("sur le dump réel", () => {
    const days = buildTalkDays(toAgenda(agendaFixture as ApiAgenda));

    it("produit les deux jours de la conférence", () => {
      expect(days.map((d) => d.date)).toEqual(["2026-06-11", "2026-06-12"]);
      expect(days.map((d) => d.label)).toEqual([
        "11 juin 2026",
        "12 juin 2026",
      ]);
    });

    it("place chaque créneau de l'agenda dans un jour", () => {
      const placed = days.reduce(
        (total, day) =>
          total + day.slots.reduce((n, [, entries]) => n + entries.length, 0),
        0,
      );

      expect(placed).toBe(agendaFixture.schedules.length);
    });

    it("trie les créneaux de chaque jour", () => {
      for (const day of days) {
        const hours = day.slots.map(([hour]) => hour);
        expect(hours).toEqual([...hours].sort());
      }
    });

    it("donne une durée à chaque créneau", () => {
      const entries = days.flatMap((d) => d.slots.flatMap(([, e]) => e));

      expect(entries.every((e) => /^\d+ mn$/.test(e.talk.duration))).toBe(true);
    });

    it("ne laisse aucun talk sans intervenant", () => {
      const talks = days
        .flatMap((d) => d.slots.flatMap(([, e]) => e))
        .filter((e) => e.talk.type === "talk-session");

      expect(talks.length).toBeGreaterThan(0);
      expect(talks.every((t) => t.speakersIds.length > 0)).toBe(true);
    });
  });
});

describe("buildTalkSheets", () => {
  it("produit une fiche par créneau de talk, résolue avec ses intervenants", () => {
    expect(buildTalkSheets(agenda())).toEqual([
      {
        id: "sch-1",
        sessionId: "sess-1",
        title: "Astro par la pratique",
        abstract: "Un **super** talk",
        level: "beginner",
        language: "fr",
        speakers: [speaker()],
        slidesUrl: null,
        replayUrl: null,
        openFeedbackUrl: null,
      },
    ]);
  });

  it("écarte les créneaux sans session", () => {
    expect(
      buildTalkSheets(
        agenda({ schedules: [schedule({ sessionId: null })], sessions: [] }),
      ),
    ).toEqual([]);
  });

  it("écarte les sessions qui ne sont pas des talks", () => {
    expect(
      buildTalkSheets(agenda({ sessions: [eventSession("sess-1", "Lunch")] })),
    ).toEqual([]);
  });

  it("écarte un créneau dont la session est introuvable", () => {
    expect(buildTalkSheets(agenda({ sessions: [] }))).toEqual([]);
  });

  it("ignore un intervenant référencé mais absent de l'agenda", () => {
    const [sheet] = buildTalkSheets(
      agenda({
        sessions: [talkSession({ speakerIds: ["fantome", "spk-1"] })],
      }),
    );

    expect(sheet.speakers.map((s) => s.id)).toEqual(["spk-1"]);
  });

  it("produit une fiche par talk du dump réel", () => {
    const sheets = buildTalkSheets(toAgenda(agendaFixture as ApiAgenda));

    expect(sheets.length).toBeGreaterThan(0);
    expect(new Set(sheets.map((s) => s.id)).size).toBe(sheets.length);
    expect(sheets.every((s) => s.speakers.length > 0)).toBe(true);
  });
});
