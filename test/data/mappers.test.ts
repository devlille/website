import { describe, expect, it, vi } from "vitest";
import {
  getSocialUrl,
  normalizeSocials,
  parseYoutubeFeed,
  toActivities,
  toAgenda,
  toEventInfo,
  toJobOffers,
  toPartners,
  type ApiAgenda,
  type ApiEvent,
  type ApiPartner,
  type ApiPartnersResponse,
} from "../../src/data/adapters/http/mappers";
import partnersFixture from "../fixtures/partners.json" with { type: "json" };
import agendaFixture from "../fixtures/agenda.json" with { type: "json" };

const apiPartner = (over: Partial<ApiPartner> = {}): ApiPartner => ({
  id: "p1",
  name: "Clever Cloud",
  description: "Un hébergeur",
  media: { svg: "https://example.com/logo.svg" },
  videoUrl: null,
  types: ["Pack Gold"],
  socials: [{ type: "linkedin", url: "https://linkedin.com/company/clever" }],
  siteUrl: "https://www.clever.cloud/fr/",
  ...over,
});

const partnersResponse = (
  over: Partial<ApiPartnersResponse> = {},
): ApiPartnersResponse => ({
  types: ["Pack Gold"],
  partners: [apiPartner()],
  activities: [],
  ...over,
});

const onePartner = (over: Partial<ApiPartner> = {}) =>
  toPartners(partnersResponse({ partners: [apiPartner(over)] }))[0];

describe("normalizeSocials", () => {
  it("conserve les réseaux dont le type est connu", () => {
    expect(
      normalizeSocials([
        { type: "linkedin", url: "https://linkedin.com/company/devlille" },
      ]),
    ).toEqual([
      { type: "linkedin", url: "https://linkedin.com/company/devlille" },
    ]);
  });

  it("filtre un réseau d'un type inconnu", () => {
    expect(
      normalizeSocials([
        { type: "facebook", url: "https://facebook.com/devlille" },
        { type: "x", url: "https://x.com/devlille" },
      ]),
    ).toEqual([{ type: "x", url: "https://x.com/devlille" }]);
  });

  it("normalise la casse du type", () => {
    expect(
      normalizeSocials([{ type: "LinkedIn", url: "https://example.com" }]),
    ).toEqual([{ type: "linkedin", url: "https://example.com" }]);
  });

  it("renvoie une liste vide quand le partenaire n'a aucun réseau", () => {
    expect(normalizeSocials(undefined)).toEqual([]);
    expect(normalizeSocials([])).toEqual([]);
  });

  it("renvoie une liste vide quand l'API n'envoie pas un tableau", () => {
    expect(normalizeSocials("linkedin" as never)).toEqual([]);
    expect(normalizeSocials(null as never)).toEqual([]);
  });

  it("ne laisse passer aucun type inconnu sur le dump réel", () => {
    const kept = partnersFixture.partners.flatMap((p) =>
      normalizeSocials(p.socials).map((s) => s.type),
    );

    expect(kept).not.toContain("facebook");
    expect(new Set(kept)).toEqual(
      new Set(["linkedin", "instagram", "youtube", "x", "bluesky", "mastodon"]),
    );
  });
});

describe("getSocialUrl", () => {
  it("retrouve l'URL d'un type donné", () => {
    expect(
      getSocialUrl(
        [
          { type: "website", url: "https://devlille.fr" },
          { type: "x", url: "https://x.com/devlille" },
        ],
        "website",
      ),
    ).toBe("https://devlille.fr");
  });

  it("renvoie null quand le type est absent", () => {
    expect(getSocialUrl([{ type: "x", url: "https://x.com" }], "website")).toBe(
      null,
    );
  });

  it("renvoie null pour un speaker sans réseau", () => {
    expect(getSocialUrl([], "website")).toBe(null);
  });
});

describe("toPartners", () => {
  it("projette la réponse API sur le domaine", () => {
    expect(onePartner()).toEqual({
      id: "p1",
      name: "Clever Cloud",
      description: "Un hébergeur",
      logoUrl: "https://example.com/logo.svg",
      logoName: "clever-cloud",
      siteUrl: "https://www.clever.cloud/fr/",
      videoUrl: null,
      socials: [
        { type: "linkedin", url: "https://linkedin.com/company/clever" },
      ],
      tiers: ["Pack Gold"],
      jobs: [],
      speakerIds: [],
    });
  });

  it("dérive le nom de logo en minuscules et sans espace", () => {
    expect(onePartner({ name: "AXA FRANCE IARD" }).logoName).toBe(
      "axa-france-iard",
    );
  });

  it("remplace une description absente par une chaîne vide", () => {
    expect(onePartner({ description: undefined }).description).toBe("");
  });

  it("filtre les réseaux d'un type inconnu", () => {
    expect(
      onePartner({
        socials: [
          { type: "facebook", url: "https://facebook.com/axa" },
          { type: "x", url: "https://x.com/axa" },
        ],
      }).socials,
    ).toEqual([{ type: "x", url: "https://x.com/axa" }]);
  });

  it("tolère un partenaire sans réseaux du tout", () => {
    expect(onePartner({ socials: undefined }).socials).toEqual([]);
  });

  it("retombe sur une liste vide quand l'API n'envoie pas de pack", () => {
    expect(onePartner({ types: undefined as never }).tiers).toEqual([]);
  });

  it("expose les ids des speakers rattachés au partenaire", () => {
    expect(
      onePartner({
        speakers: [{ id: "spk-1" }, { id: "spk-2" }],
      } as Partial<ApiPartner>).speakerIds,
    ).toEqual(["spk-1", "spk-2"]);
  });

  it("projette les offres d'emploi du partenaire", () => {
    expect(
      onePartner({
        jobs: [
          {
            url: "https://example.com/job",
            title: "Dev",
            company_name: "Clever Cloud",
            location: "Lille",
            salary: null,
            requirements: 0,
            publish_date: 0,
          },
        ],
      }).jobs,
    ).toEqual([
      {
        url: "https://example.com/job",
        title: "Dev",
        companyName: "Clever Cloud",
        location: "Lille",
        salary: null,
        requirements: 0,
        publishDate: 0,
      },
    ]);
  });

  it("préfixe en https une URL de site sans schéma", () => {
    expect(onePartner({ siteUrl: "devlille.fr" }).siteUrl).toBe(
      "https://devlille.fr",
    );
  });

  it("laisse intactes les URLs déjà schématisées", () => {
    expect(onePartner({ siteUrl: "https://devlille.fr" }).siteUrl).toBe(
      "https://devlille.fr",
    );
    expect(onePartner({ siteUrl: "http://devlille.fr" }).siteUrl).toBe(
      "http://devlille.fr",
    );
  });

  it("renvoie null pour un partenaire sans site", () => {
    expect(onePartner({ siteUrl: undefined }).siteUrl).toBeNull();
  });

  it("signale une URL invalide sans faire échouer le build", () => {
    using warn = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(onePartner({ siteUrl: "https://" }).siteUrl).toBe("https://");
    expect(warn).toHaveBeenCalledWith("Bad URL for Clever Cloud");
  });

  // Comportement actuel, volontairement figé : le test porte sur `includes`
  // et non sur `startsWith`. À corriger en phase 2.
  it("ne préfixe pas une URL sans schéma contenant https:// dans un paramètre", () => {
    using _warn = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      onePartner({ siteUrl: "devlille.fr?from=https://google.com" }).siteUrl,
    ).toBe("devlille.fr?from=https://google.com");
  });

  it("force le pack d'un partenaire listé dans les overrides", () => {
    expect(
      onePartner({
        id: "b9ae1a05-2f42-4d0f-b414-c455b3fe20b0",
        types: ["Pack Bronze"],
      }).tiers,
    ).toEqual(["Pack Gold"]);
  });

  it("projette tous les partenaires du dump réel sans lever d'erreur", () => {
    const partners = toPartners(partnersFixture as ApiPartnersResponse);

    expect(partners).toHaveLength(61);
    expect(partners.every((p) => p.logoUrl.length > 0)).toBe(true);
  });
});

describe("toActivities", () => {
  it("rattache chaque activité au nom et au logo de son partenaire", () => {
    const activities = toActivities(
      partnersResponse({
        activities: [
          {
            id: "a1",
            name: "Flèchette",
            start_time: "2026-06-11T08:00",
            end_time: "2026-06-12T17:30",
            partner_id: "p1",
          },
        ],
      }),
    );

    expect(activities).toEqual([
      {
        id: "a1",
        name: "Flèchette",
        startTime: "2026-06-11T08:00",
        endTime: "2026-06-12T17:30",
        partnerId: "p1",
        partnerName: "Clever Cloud",
        partnerLogoUrl: "https://example.com/logo.svg",
      },
    ]);
  });

  it("tolère une activité dont le partenaire est inconnu", () => {
    const [activity] = toActivities(
      partnersResponse({
        activities: [
          {
            id: "a1",
            name: "Flèchette",
            start_time: "2026-06-11T08:00",
            end_time: "2026-06-11T09:00",
            partner_id: "inconnu",
          },
        ],
      }),
    );

    expect(activity.partnerName).toBe("");
    expect(activity.partnerLogoUrl).toBeNull();
  });

  it("renvoie une liste vide quand l'API n'envoie pas d'activités", () => {
    expect(
      toActivities(
        partnersResponse({ activities: undefined as never }),
      ),
    ).toEqual([]);
  });

  it("projette toutes les activités du dump réel", () => {
    const activities = toActivities(partnersFixture as ApiPartnersResponse);

    expect(activities).toHaveLength(partnersFixture.activities.length);
    expect(activities.every((a) => a.partnerName.length > 0)).toBe(true);
  });
});

describe("toJobOffers", () => {
  it("aplatit les offres de tous les partenaires en les nommant", () => {
    const offers = toJobOffers(
      partnersResponse({
        partners: [
          apiPartner({
            jobs: [
              {
                url: "https://example.com/job",
                title: "Dev",
                company_name: "Clever Cloud",
                location: "Lille",
                salary: null,
                requirements: null,
                publish_date: 0,
              },
            ],
          }),
          apiPartner({ id: "p2", name: "Sans offre" }),
        ],
      }),
    );

    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({
      title: "Dev",
      partnerId: "p1",
      partnerName: "Clever Cloud",
    });
  });
});

describe("toAgenda", () => {
  const apiAgenda: ApiAgenda = {
    schedules: [
      {
        id: "sch-1",
        date: "2026-06-11",
        start_time: "2026-06-11T09:00",
        end_time: "2026-06-11T09:45",
        room: "Marie Curie",
        session_id: "sess-1",
      },
      {
        id: "sch-2",
        date: "2026-06-11",
        start_time: "2026-06-11T08:00",
        end_time: "2026-06-11T09:00",
        room: "Hall",
        session_id: "null",
      },
    ],
    sessions: [
      {
        id: "sess-1",
        type: "talk-session",
        title: "Astro par la pratique",
        abstract: "Un **super** talk",
        language: "fr",
        level: "beginner",
        speakers: ["spk-1"],
      },
    ],
    speakers: [
      {
        id: "spk-1",
        display_name: "Alice",
        bio: "Développeuse",
        photo_url: "https://example.com/a.jpg",
        pronouns: "elle",
        company: "ACME",
        job_title: "CTO",
        socials: [
          { type: "website", url: "https://alice.dev" },
          { type: "X", url: "https://x.com/alice" },
        ],
        partners: [
          { id: "p1", name: "ACME", logo_url: "https://example.com/l.svg" },
        ],
      },
    ],
  };

  it("normalise un session_id absent ou égal à la chaîne \"null\"", () => {
    const agenda = toAgenda(apiAgenda);

    expect(agenda.schedules[0].sessionId).toBe("sess-1");
    expect(agenda.schedules[1].sessionId).toBeNull();
  });

  it("projette les speakers sur le domaine", () => {
    expect(toAgenda(apiAgenda).speakers[0]).toEqual({
      id: "spk-1",
      name: "Alice",
      bio: "Développeuse",
      photoUrl: "https://example.com/a.jpg",
      pronouns: "elle",
      company: "ACME",
      jobTitle: "CTO",
      socials: [{ type: "x", url: "https://x.com/alice" }],
      websiteUrl: "https://alice.dev",
      partners: [
        { id: "p1", name: "ACME", logoUrl: "https://example.com/l.svg" },
      ],
    });
  });

  it("projette les sessions sur le domaine", () => {
    expect(toAgenda(apiAgenda).sessions[0]).toEqual({
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
    });
  });

  it("remplace les espaces insécables des textes de session", () => {
    const [session] = toAgenda({
      ...apiAgenda,
      sessions: [
        {
          id: "s",
          type: "talk-session",
          title: "Astro !",
          abstract: "Un talk",
        },
      ],
    }).sessions;

    expect(session.title).toBe("Astro !");
    expect(session.abstract).toBe("Un talk");
  });

  it("retombe sur la description pour une session qui n'est pas un talk", () => {
    const [session] = toAgenda({
      ...apiAgenda,
      sessions: [{ id: "s", type: "event-session", description: "Le lunch" }],
    }).sessions;

    expect(session.abstract).toBe("Le lunch");
    expect(session.title).toBeNull();
  });

  it("normalise un session_id absent au même titre que la chaîne \"null\"", () => {
    const [slot] = toAgenda({
      ...apiAgenda,
      schedules: [{ ...apiAgenda.schedules[0], session_id: undefined }],
    }).schedules;

    expect(slot.sessionId).toBeNull();
  });

  it("retombe sur le français quand la langue n'est pas renseignée", () => {
    const [session] = toAgenda({
      ...apiAgenda,
      sessions: [{ id: "s", type: "talk-session", title: "T" }],
    }).sessions;

    expect(session.language).toBe("fr");
    expect(session.level).toBeNull();
  });

  it("projette l'agenda du dump réel sans perte de créneau", () => {
    const agenda = toAgenda(agendaFixture as ApiAgenda);

    expect(agenda.schedules).toHaveLength(agendaFixture.schedules.length);
    expect(agenda.sessions).toHaveLength(agendaFixture.sessions.length);
    expect(agenda.speakers).toHaveLength(agendaFixture.speakers.length);
    expect(agenda.speakers.every((s) => s.name.length > 0)).toBe(true);
  });
});

describe("toEventInfo", () => {
  const apiEvent: ApiEvent = {
    id: "evt",
    name: "DevLille",
    start_date: "2026-06-11",
    end_date: "2026-06-12",
    qanda: [
      {
        id: "q2",
        order: 2,
        question: "Où ?",
        response: "À Lille",
        acronyms: [],
        actions: [],
      },
      {
        id: "q1",
        order: 1,
        question: "Quand ?",
        response: "En juin",
        acronyms: [{ key: "CFP", value: "Call For Papers" }],
        actions: [{ label: "billetterie", url: "https://billet" }],
      },
    ],
  };

  it("trie la FAQ par ordre croissant", () => {
    expect(toEventInfo(apiEvent).faq.map((f) => f.order)).toEqual([1, 2]);
  });

  it("projette l'événement sur le domaine", () => {
    const event = toEventInfo(apiEvent);

    expect(event.id).toBe("evt");
    expect(event.startDate).toBe("2026-06-11");
    expect(event.endDate).toBe("2026-06-12");
    expect(event.faq[0]).toEqual({
      id: "q1",
      order: 1,
      question: "Quand ?",
      response: "En juin",
      acronyms: [{ key: "CFP", value: "Call For Papers" }],
      actions: [{ label: "billetterie", url: "https://billet" }],
    });
  });

  it("tolère un événement sans FAQ", () => {
    expect(toEventInfo({ ...apiEvent, qanda: undefined }).faq).toEqual([]);
  });
});

describe("parseYoutubeFeed", () => {
  const feed = `<?xml version="1.0"?>
<feed>
  <entry>
    <yt:videoId>abc123</yt:videoId>
    <title>DevLille 2025 &amp; friends</title>
    <published>2025-06-12T10:00:00+00:00</published>
    <media:group>
      <media:thumbnail url="https://i.ytimg.com/vi/abc123/hq.jpg" width="480"/>
      <media:description>Un &quot;super&quot; talk</media:description>
    </media:group>
  </entry>
</feed>`;

  it("extrait les vidéos et décode les entités HTML", () => {
    expect(parseYoutubeFeed(feed)).toEqual([
      {
        id: "abc123",
        videoId: "abc123",
        title: "DevLille 2025 & friends",
        description: 'Un "super" talk',
        publishedAt: "2025-06-12T10:00:00+00:00",
        thumbnailUrl: "https://i.ytimg.com/vi/abc123/hq.jpg",
      },
    ]);
  });

  it("renvoie une liste vide quand le flux ne contient aucune entrée", () => {
    expect(parseYoutubeFeed("<feed></feed>")).toEqual([]);
  });
});
