import { describe, expect, it } from "vitest";
import { formatLongDate } from "../../src/core/date";

describe("formatLongDate", () => {
  it("suit la locale qu'on lui passe", () => {
    const date = new Date(2026, 5, 11, 12);

    expect(formatLongDate(date, "fr-FR")).toBe("11 juin 2026");
    expect(formatLongDate(date, "en-GB")).toBe("11 June 2026");
  });
});
