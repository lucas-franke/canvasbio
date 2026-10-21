import { describe, expect, it } from "vitest";

import { groupByDecade, scalePercent, timeScale } from "./chronology";

const person = (sort: string, born?: string, died?: string) => ({
  name: { sort },
  born: { date: born },
  died: died ? { date: died } : undefined,
});

describe("groupByDecade", () => {
  it("orders by year of birth and groups by decade", () => {
    const groups = groupByDecade([
      person("Zetkin, Clara", "1857-07-05", "1933-06-20"),
      person("Dohm, Hedwig", "1831-09-20", "1919-06-01"),
      person("Augspurg, Anita", "1857-09-22", "1943"),
      person("Bäumer, Gertrud", "1873", "1954"),
    ]);
    expect(groups.map((g) => g.decade)).toEqual([1830, 1850, 1870]);
    // Same year: by sort name.
    expect(groups[1]!.rows.map((r) => r.person.name.sort)).toEqual(["Augspurg, Anita", "Zetkin, Clara"]);
    expect(groups[0]!.rows[0]).toMatchObject({ from: 1831, to: 1919 });
  });

  it("puts people without a year of birth last and ignores impossible deaths", () => {
    const groups = groupByDecade([person("Unknown", undefined, "1900"), person("Odd", "1900", "1850")]);
    expect(groups.map((g) => g.decade)).toEqual([1900, null]);
    expect(groups[0]!.rows[0]!.to).toBeUndefined();
  });
});

describe("timeScale", () => {
  it("spans whole decades with readable ticks", () => {
    const scale = timeScale(groupByDecade([person("A", "1748", "1793"), person("B", "1890", "1987")]));
    expect(scale).toEqual({ start: 1740, end: 1990, ticks: [1750, 1800, 1850, 1900, 1950] });
    expect(scalePercent(scale!, 1865)).toBe(50);
  });

  it("uses finer ticks for short spans and handles open lives", () => {
    const scale = timeScale(groupByDecade([person("A", "1901"), person("B", "1905", "1940")]));
    expect(scale).toEqual({ start: 1900, end: 1940, ticks: [1900, 1910, 1920, 1930, 1940] });
    expect(timeScale(groupByDecade([person("A")]))).toBeNull();
  });
});
