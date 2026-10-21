import { describe, expect, it } from "vitest";

import type { FacetConfig } from "~/lib/config/schema";
import type { PersonListItem } from "~/lib/content/adapter";
import {
  filterPeople,
  isSearchActive,
  nameMatches,
  normalize,
  parseSearch,
  searchSuffix,
  toSearchParams,
  wordMatches,
} from "./search";

const facets: FacetConfig[] = [
  { key: "field", type: "multi", label: { de: "Feld", en: "Field", "de-LS": "Feld" } },
  { key: "place", type: "autocomplete", label: { de: "Ort", en: "Place", "de-LS": "Ort" } },
];

const person = (display: string, sort: string, field: string[], place: string[]) =>
  ({
    slug: normalize(display).replace(/\W+/g, "-"),
    name: { display, sort },
    facets: { field, place },
  }) as unknown as PersonListItem;

const people = [
  person("Clara Zetkin", "Zetkin, Clara", ["politics", "writing"], ["koenigshain", "arkhangelskoye"]),
  person("Hedwig Dohm", "Dohm, Hedwig", ["writing"], ["berlin"]),
  person("Gertrud Bäumer", "Bäumer, Gertrud", ["politics", "education"], ["hohenlimburg", "bethel"]),
  person("Helene Müller", "Müller, Helene", ["education"], ["muenchen"]),
];

const labels = {
  field: { politics: "Politik", writing: "Literatur", education: "Bildung" },
  place: {
    koenigshain: "Königshain",
    arkhangelskoye: "Archangelskoje",
    berlin: "Berlin",
    hohenlimburg: "Hohenlimburg",
    bethel: "Bethel",
    muenchen: "München",
  },
};

describe("normalize", () => {
  it("folds case, accents, ß and German transcriptions", () => {
    expect(normalize("Müller")).toBe(normalize("Mueller"));
    expect(normalize("Müller")).toBe("muller");
    expect(normalize("Groß")).toBe("gross");
    expect(normalize("Éléonore")).toBe("eleonore");
  });
});

describe("name search", () => {
  it("matches word starts in any order", () => {
    expect(nameMatches("zet", "Clara Zetkin")).toBe(true);
    expect(nameMatches("zetkin clara", "Clara Zetkin")).toBe(true);
    // Only word starts (and typos of 4+ letter words), not any substring.
    expect(nameMatches("kin", "Clara Zetkin")).toBe(false);
    expect(nameMatches("zetkin dohm", "Clara Zetkin")).toBe(false);
  });

  it("tolerates a typo in longer words but not in short ones", () => {
    expect(wordMatches("zetkni", "zetkin")).toBe(true);
    expect(wordMatches("baumre", "baumer")).toBe(true);
    expect(wordMatches("dhm", "dohm")).toBe(false);
  });

  it("finds umlauts however they are typed", () => {
    expect(nameMatches("baeumer", "Gertrud Bäumer")).toBe(true);
    expect(nameMatches("bäumer", "Gertrud Baeumer")).toBe(true);
  });
});

describe("URL state", () => {
  it("round-trips through search parameters", () => {
    const state = { q: "clara", facets: { field: ["politics", "writing"], place: ["Berlin"] } };
    const params = toSearchParams(state, facets, new URLSearchParams("other=1"));
    expect(params.get("other")).toBe("1");
    expect(parseSearch(params, facets)).toEqual(state);
  });

  it("ignores empty values and keeps only one place", () => {
    const state = parseSearch(new URLSearchParams("q=+&field=&place=a&place=b&field=x&field=x"), facets);
    expect(state).toEqual({ q: "", facets: { field: ["x"], place: ["a"] } });
    expect(isSearchActive(state)).toBe(true);
    expect(isSearchActive(parseSearch(new URLSearchParams(""), facets))).toBe(false);
  });

  it("builds a link suffix", () => {
    expect(searchSuffix({ q: "", facets: {} }, facets)).toBe("");
    expect(searchSuffix({ q: "zet", facets: {} }, facets)).toBe("?q=zet");
  });
});

describe("filterPeople", () => {
  const search = (q: string, f: Record<string, string[]> = {}) =>
    filterPeople(people, { q, facets: f }, facets, labels).map((p) => p.name.display);

  it("returns everyone without a search", () => {
    expect(search("")).toHaveLength(4);
  });

  it("combines name, any of the selected fields and place", () => {
    expect(search("", { field: ["writing"] })).toEqual(["Clara Zetkin", "Hedwig Dohm"]);
    expect(search("", { field: ["writing", "education"] })).toHaveLength(4);
    expect(search("clara", { field: ["education"] })).toEqual([]);
    expect(search("", { field: ["politics"], place: ["bethel"] })).toEqual(["Gertrud Bäumer"]);
  });

  it("matches places by their label, accent-insensitively", () => {
    expect(search("", { place: ["munchen"] })).toEqual(["Helene Müller"]);
    expect(search("", { place: ["königs"] })).toEqual(["Clara Zetkin"]);
  });
});
