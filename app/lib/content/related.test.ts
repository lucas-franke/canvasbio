import { describe, expect, it } from "vitest";

import { relatedPeople, type RelatedCandidate } from "./related";

const person = (
  slug: string,
  facets: Record<string, string[]>,
  born = "1850",
  died = "1920",
  prominence = 0.5,
): RelatedCandidate => ({ slug, facets, born: { date: born }, died: { date: died }, prominence });

const anna = person("anna", { field: ["writing", "politics"], place: ["berlin"] });
const people = [
  anna,
  person("berta", { field: ["writing"], place: ["hamburg"] }),
  person("clara", { field: ["medicine"], place: ["berlin"] }),
  person("dora", { field: ["writing"], place: ["munich"] }),
  person("emma", { field: ["writing"], place: ["vienna"] }),
  person("frieda", { field: ["science"], place: ["paris"] }),
];

describe("relatedPeople", () => {
  it("ranks a rare shared value above a common one", () => {
    const related = relatedPeople(anna, people);
    // "berlin" is shared by 2 people, "writing" by 4 → Clara first.
    expect(related[0]!.person.slug).toBe("clara");
    expect(related[0]!.reasons[0]).toEqual({ kind: "facet", facet: "place", value: "berlin" });
  });

  it("never includes the person itself or people with nothing in common", () => {
    const slugs = relatedPeople(anna, people).map((r) => r.person.slug);
    expect(slugs).not.toContain("anna");
    expect(slugs).not.toContain("frieda");
  });

  it("adds overlapping lifetimes as a reason, but not on their own", () => {
    const related = relatedPeople(anna, people);
    expect(related.find((r) => r.person.slug === "berta")!.reasons).toContainEqual({ kind: "era" });
    const strangers = [anna, person("gerda", { field: ["arts"] }, "1860", "1930")];
    expect(relatedPeople(anna, strangers)).toEqual([]);
  });

  it("prefers contemporaries when the shared values are equal", () => {
    const pool = [
      anna,
      person("old", { field: ["politics"] }, "1700", "1760"),
      person("same", { field: ["politics"] }, "1855", "1925"),
    ];
    expect(relatedPeople(anna, pool).map((r) => r.person.slug)).toEqual(["same", "old"]);
  });

  it("breaks ties by lower prominence, then slug, and respects the limit", () => {
    const pool = [
      anna,
      person("z", { field: ["politics"] }, "1850", "1920", 0.2),
      person("y", { field: ["politics"] }, "1850", "1920", 0.9),
      person("x", { field: ["politics"] }, "1850", "1920", 0.2),
    ];
    expect(relatedPeople(anna, pool, 2).map((r) => r.person.slug)).toEqual(["x", "z"]);
  });
});
