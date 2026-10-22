import { describe, expect, it } from "vitest";

import { chaptersOf, sortFor, sortPeople } from "./sort";

const person = (sort: string, born?: string, died?: string) => ({
  name: { sort },
  born: { date: born },
  died: died ? { date: died } : undefined,
});

const people = [
  person("Zetkin, Clara", "1857-07-05", "1933-06-20"),
  person("Dohm, Hedwig", "1831-09-20", "1919-06-01"),
  person("Augspurg, Anita", "1857-09-22", "1943"),
  person("Bäumer, Gertrud", "1873", "1954"),
  person("Öko, Unbekannt"),
];
const names = (list: { name: { sort: string } }[]) => list.map((p) => p.name.sort.split(",")[0]);

describe("sortFor", () => {
  it("keeps orders the view offers and falls back to its default", () => {
    expect(sortFor("list", "born-desc")).toBe("born-desc");
    expect(sortFor("list", "age")).toBe("name");
    expect(sortFor("timeline", undefined)).toBe("born");
    expect(sortFor("timeline", "name")).toBe("born");
  });
});

describe("chaptersOf", () => {
  it("sorts by name in letter chapters, umlauts with their base letter", () => {
    const chapters = chaptersOf(people, "name");
    expect(chapters.map((c) => c.value)).toEqual(["A", "B", "D", "O", "Z"]);
    expect(chapters[0]!.id).toBe("buchstabe-a");
    expect(names(sortPeople(people, "name-desc"))).toEqual(["Zetkin", "Öko", "Dohm", "Bäumer", "Augspurg"]);
  });

  it("sorts by birth in decades, unknown years last", () => {
    const chapters = chaptersOf(people, "born");
    expect(chapters.map((c) => [c.kind, c.value])).toEqual([
      ["born", 1830],
      ["born", 1850],
      ["born", 1870],
      ["unknown", "born"],
    ]);
    // Same year: by name.
    expect(names(chapters[1]!.items)).toEqual(["Augspurg", "Zetkin"]);
    expect(names(sortPeople(people, "born-desc")).slice(0, 2)).toEqual(["Bäumer", "Augspurg"]);
  });

  it("sorts by death and by life span", () => {
    expect(chaptersOf(people, "died").map((c) => c.id)).toEqual([
      "tod-1910",
      "tod-1930",
      "tod-1940",
      "tod-1950",
      "tod-unbekannt",
    ]);
    // Longest lives first: Dohm 87, Augspurg 86, Bäumer 81, Zetkin 75.
    const age = chaptersOf(people, "age");
    expect(age.map((c) => c.value)).toEqual([80, 70, "age"]);
    expect(names(age[0]!.items)).toEqual(["Dohm", "Augspurg", "Bäumer"]);
  });
});

describe("life span chapters", () => {
  it("puts everyone who lived 100 years or more into one chapter", () => {
    const old = [
      person("A, A", "1800", "1901"),
      person("B, B", "1800", "1912"),
      person("C, C", "1800", "1890"),
    ];
    expect(chaptersOf(old, "age").map((c) => [c.id, c.items.length])).toEqual([
      ["alter-100", 2],
      ["alter-90", 1],
    ]);
  });
});
