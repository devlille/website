import { describe, expect, it } from "vitest";
import { pickOneWithSeed, pickWithSeed, shuffleWithSeed } from "../../src/core/pick";

const items = ["a", "b", "c", "d", "e", "f", "g", "h"];

describe("shuffleWithSeed", () => {
  it("rend le même ordre pour une même graine", () => {
    expect(shuffleWithSeed(items, "2026")).toEqual(shuffleWithSeed(items, "2026"));
  });

  it("rend un ordre différent pour une graine différente", () => {
    expect(shuffleWithSeed(items, "2026")).not.toEqual(
      shuffleWithSeed(items, "2027"),
    );
  });

  it("conserve tous les éléments", () => {
    expect([...shuffleWithSeed(items, "2026")].sort()).toEqual([...items].sort());
  });

  it("ne modifie pas le tableau d'origine", () => {
    const source = [...items];
    shuffleWithSeed(source, "2026");

    expect(source).toEqual(items);
  });
});

describe("pickWithSeed", () => {
  it("prend le nombre d'éléments demandé", () => {
    expect(pickWithSeed(items, "2026", 3)).toHaveLength(3);
  });

  it("rend la même sélection pour une même graine", () => {
    expect(pickWithSeed(items, "2026", 3)).toEqual(pickWithSeed(items, "2026", 3));
  });

  it("ne rend jamais deux fois le même élément", () => {
    const picked = pickWithSeed(items, "2026", 5);

    expect(new Set(picked).size).toBe(5);
  });

  it("rend tous les éléments quand on en demande plus qu'il n'y en a", () => {
    expect(pickWithSeed(["a", "b"], "2026", 5)).toHaveLength(2);
  });

  it("rend un tableau vide pour une source vide", () => {
    expect(pickWithSeed([], "2026", 3)).toEqual([]);
  });
});

describe("pickOneWithSeed", () => {
  it("rend toujours le même élément pour une même graine", () => {
    expect(pickOneWithSeed(items, "2026")).toBe(pickOneWithSeed(items, "2026"));
  });

  it("rend un élément de la source", () => {
    expect(items).toContain(pickOneWithSeed(items, "2026"));
  });

  it("rend undefined pour une source vide", () => {
    expect(pickOneWithSeed([], "2026")).toBeUndefined();
  });
});
