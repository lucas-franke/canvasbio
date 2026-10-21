import { describe, expect, it } from "vitest";

import { pickRandom, randomWeight } from "./random";

const people = [
  { slug: "famous", prominence: 1 },
  { slug: "unknown", prominence: 0 },
  { slug: "middle", prominence: 0.5 },
];

/** Deterministic pseudo-random sequence for statistics. */
function sequence(seed = 1) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function frequencies(options: Parameters<typeof pickRandom>[1], runs = 20000) {
  const counts: Record<string, number> = {};
  const random = sequence();
  for (let i = 0; i < runs; i++) {
    const slug = pickRandom(people, { ...options, random })!.slug;
    counts[slug] = (counts[slug] ?? 0) + 1;
  }
  return counts;
}

describe("randomWeight", () => {
  it("favours less prominent and unseen people", () => {
    const none = new Set<string>();
    expect(randomWeight(people[1]!, none)).toBeGreaterThan(randomWeight(people[0]!, none));
    expect(randomWeight(people[1]!, new Set(["unknown"]))).toBeLessThan(randomWeight(people[1]!, none));
    expect(randomWeight(people[0]!, none)).toBeGreaterThan(0);
  });
});

describe("pickRandom", () => {
  it("picks everyone sometimes, the unknown more often than the famous", () => {
    const counts = frequencies({});
    expect(Object.keys(counts).sort()).toEqual(["famous", "middle", "unknown"]);
    expect(counts.unknown!).toBeGreaterThan(counts.famous! * 2.5);
  });

  it("makes people already seen rarer", () => {
    const counts = frequencies({ seen: new Set(["unknown"]) });
    expect(counts.unknown!).toBeLessThan(counts.middle!);
  });

  it("never returns the person who is open, unless they are the only one", () => {
    expect(frequencies({ exclude: "unknown" }).unknown).toBeUndefined();
    expect(pickRandom([people[0]!], { exclude: "famous" })?.slug).toBe("famous");
    expect(pickRandom([])).toBeUndefined();
  });
});
