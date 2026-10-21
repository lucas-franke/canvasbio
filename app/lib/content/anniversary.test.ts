import { describe, expect, it } from "vitest";

import { anniversaries } from "./anniversary";

const people = [
  { slug: "zetkin", born: { date: "1857-07-05" }, died: { date: "1933-06-20" } },
  { slug: "partial", born: { date: "1857-07" }, died: { date: "1900" } },
  { slug: "leap", born: { date: "1868-02-29" } },
  { slug: "dohm", born: { date: "1831-09-20" }, died: { date: "1919-06-01" } },
];

const slugs = (list: { person: { slug: string }; kind: string }[]) =>
  list.map((a) => `${a.person.slug}:${a.kind}`);

describe("anniversaries", () => {
  it("finds births and deaths on the day with the years since", () => {
    const today = anniversaries(people, new Date(2026, 6, 5));
    expect(slugs(today)).toEqual(["zetkin:born"]);
    expect(today[0]!.years).toBe(169);
    expect(today[0]!.inDays).toBe(0);
  });

  it("ignores partial dates", () => {
    expect(anniversaries(people, new Date(2026, 6, 1), 30).map((a) => a.person.slug)).not.toContain(
      "partial",
    );
  });

  it("looks ahead a number of days, soonest first", () => {
    const week = anniversaries(people, new Date(2026, 4, 28), 7);
    expect(slugs(week)).toEqual(["dohm:died"]);
    expect(week[0]!.inDays).toBe(4);
  });

  it("remembers 29 February on 28 February in non-leap years", () => {
    expect(slugs(anniversaries(people, new Date(2027, 1, 28)))).toEqual(["leap:born"]);
    expect(slugs(anniversaries(people, new Date(2028, 1, 28)))).toEqual([]);
    expect(slugs(anniversaries(people, new Date(2028, 1, 29)))).toEqual(["leap:born"]);
  });
});
