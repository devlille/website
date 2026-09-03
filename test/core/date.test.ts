import { describe, expect, it } from "vitest";
import {
  eachDayBetween,
  formatLocalDate,
  formatLongDate,
  toDateOnly,
  toHour,
} from "../../src/core/date";

describe("toDateOnly", () => {
  it("garde la partie date d'un horodatage ISO", () => {
    expect(toDateOnly("2026-06-11T08:00")).toBe("2026-06-11");
  });

  it("laisse intacte une date déjà sans heure", () => {
    expect(toDateOnly("2026-06-11")).toBe("2026-06-11");
  });
});

describe("toHour", () => {
  it("extrait l'heure d'un horodatage ISO", () => {
    expect(toHour("2026-06-11T08:30")).toBe("08:30");
  });

  it("retombe sur minuit quand l'horodatage n'a pas d'heure", () => {
    expect(toHour("2026-06-11")).toBe("00:00");
  });
});

describe("formatLocalDate", () => {
  it("formate une date locale en YYYY-MM-DD", () => {
    expect(formatLocalDate(new Date(2026, 5, 11))).toBe("2026-06-11");
  });

  it("complète mois et jour sur deux chiffres", () => {
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("eachDayBetween", () => {
  it("renvoie le seul jour d'une activité qui ne déborde pas", () => {
    expect(eachDayBetween("2026-06-11T09:00", "2026-06-11T17:30")).toEqual([
      "2026-06-11",
    ]);
  });

  it("énumère tous les jours d'une activité à cheval sur deux jours", () => {
    expect(eachDayBetween("2026-06-11T08:00", "2026-06-12T17:30")).toEqual([
      "2026-06-11",
      "2026-06-12",
    ]);
  });

  it("énumère les jours intermédiaires d'une activité longue", () => {
    expect(eachDayBetween("2026-06-10T08:00", "2026-06-13T10:00")).toEqual([
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
      "2026-06-13",
    ]);
  });

  it("traverse un changement de mois", () => {
    expect(eachDayBetween("2026-05-31T23:00", "2026-06-01T01:00")).toEqual([
      "2026-05-31",
      "2026-06-01",
    ]);
  });

  it("ne renvoie aucun jour quand la fin précède le début", () => {
    expect(eachDayBetween("2026-06-12T08:00", "2026-06-11T17:30")).toEqual([]);
  });
});

describe("formatLongDate", () => {
  it("formate une date en français, style long", () => {
    expect(formatLongDate(new Date(2026, 5, 11, 12))).toBe("11 juin 2026");
  });
});
