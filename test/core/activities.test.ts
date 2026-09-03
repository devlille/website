import { describe, expect, it } from "vitest";
import {
  groupActivitiesByDate,
  groupActivitiesByDay,
} from "../../src/core/activities";
import type { Activity } from "../../src/data/domain";
import { toActivities } from "../../src/data/adapters/http/mappers";
import type { ApiPartnersResponse } from "../../src/data/adapters/http/mappers";
import partnersFixture from "../fixtures/partners.json" with { type: "json" };

const activity = (over: Partial<Activity> = {}): Activity => ({
  id: "a1",
  name: "Flèchette",
  startTime: "2026-06-11T08:00",
  endTime: "2026-06-11T17:30",
  partnerId: "p1",
  partnerName: "Partenaire",
  partnerLogoUrl: null,
  ...over,
});

describe("groupActivitiesByDate", () => {
  it("range une activité sous son jour et son créneau de début", () => {
    const [day] = groupActivitiesByDate([
      activity({ startTime: "2026-06-11T09:00", endTime: "2026-06-11T10:00" }),
    ]);

    expect(day.date).toBe("2026-06-11");
    expect(day.label).toBe("11 juin 2026");
    expect(day.slots).toEqual([
      [
        "09:00",
        [
          expect.objectContaining({
            id: "a1",
            hour: "09:00",
            displayRange: "09:00 - 10:00",
          }),
        ],
      ],
    ]);
  });

  it("répète une activité à cheval sur chacun des jours couverts", () => {
    const days = groupActivitiesByDate([
      activity({ startTime: "2026-06-11T08:00", endTime: "2026-06-12T17:30" }),
    ]);

    expect(days.map((d) => d.date)).toEqual(["2026-06-11", "2026-06-12"]);
    expect(days[0].slots[0][1][0].id).toBe("a1");
    expect(days[1].slots[0][1][0].id).toBe("a1");
  });

  it("conserve la plage horaire d'origine sur chaque jour couvert", () => {
    const days = groupActivitiesByDate([
      activity({ startTime: "2026-06-11T08:00", endTime: "2026-06-12T17:30" }),
    ]);

    expect(days[1].slots).toEqual([
      ["08:00", [expect.objectContaining({ displayRange: "08:00 - 17:30" })]],
    ]);
  });

  it("trie les jours puis les créneaux par ordre chronologique", () => {
    const days = groupActivitiesByDate([
      activity({ id: "b", startTime: "2026-06-12T14:00", endTime: "2026-06-12T15:00" }),
      activity({ id: "a", startTime: "2026-06-11T16:00", endTime: "2026-06-11T17:00" }),
      activity({ id: "c", startTime: "2026-06-11T09:00", endTime: "2026-06-11T10:00" }),
    ]);

    expect(days.map((d) => d.date)).toEqual(["2026-06-11", "2026-06-12"]);
    expect(days[0].slots.map(([hour]) => hour)).toEqual(["09:00", "16:00"]);
  });

  it("regroupe dans le même créneau deux activités qui commencent ensemble", () => {
    const [day] = groupActivitiesByDate([
      activity({ id: "a" }),
      activity({ id: "b" }),
    ]);

    expect(day.slots).toHaveLength(1);
    expect(day.slots[0][1].map((a) => a.id)).toEqual(["a", "b"]);
  });

  it("accepte un partenaire sans logo", () => {
    const [day] = groupActivitiesByDate([activity({ partnerLogoUrl: null })]);

    expect(day.slots[0][1][0].partnerLogoUrl).toBeNull();
  });

  it("ne renvoie aucun jour pour une liste vide", () => {
    expect(groupActivitiesByDate([])).toEqual([]);
  });

  it("couvre les deux jours de l'événement sur le dump réel", () => {
    const activities: Activity[] = toActivities(
      partnersFixture as ApiPartnersResponse,
    );

    const days = groupActivitiesByDate(activities);

    expect(days.map((d) => d.date)).toEqual(["2026-06-11", "2026-06-12"]);
    expect(days.every((d) => d.slots.length > 0)).toBe(true);
  });
});

describe("groupActivitiesByDay", () => {
  it("groupe par jour et trie les activités par heure de début", () => {
    const days = groupActivitiesByDay([
      { startTime: "2026-06-11T14:00", endTime: "2026-06-11T15:00", name: "après" },
      { startTime: "2026-06-11T09:00", endTime: "2026-06-11T10:00", name: "avant" },
    ]);

    expect(days).toHaveLength(1);
    expect(days[0].label).toBe("11 juin 2026");
    expect(days[0].activities.map((a) => a.name)).toEqual(["avant", "après"]);
  });

  it("fait apparaître une activité à cheval sur les deux jours", () => {
    const days = groupActivitiesByDay([
      { startTime: "2026-06-11T08:00", endTime: "2026-06-12T17:30", name: "stand" },
    ]);

    expect(days.map((d) => d.date)).toEqual(["2026-06-11", "2026-06-12"]);
    expect(days.every((d) => d.activities[0].name === "stand")).toBe(true);
  });

  it("ne renvoie aucun jour pour une liste vide", () => {
    expect(groupActivitiesByDay([])).toEqual([]);
  });
});
