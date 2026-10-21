/**
 * "Random biography": a weighted random pick that favours people who are less prominent
 * and who haven't been opened yet, so the button leads to discoveries rather than the
 * same famous names. Pure; the seen list is kept by the caller (see seen.ts).
 */

export interface RandomCandidate {
  slug: string;
  /** 0–1, higher = better known (content field `prominence`). */
  prominence: number;
}

/** Relative chance of a person being picked. */
export function randomWeight(candidate: RandomCandidate, seen: ReadonlySet<string>): number {
  const prominence = Math.min(1, Math.max(0, candidate.prominence));
  // Prominent people still come up, just less often (weight 1 → 0.3).
  const base = 1 - 0.7 * prominence;
  // Already opened: a sixth of the chance.
  return seen.has(candidate.slug) ? base / 6 : base;
}

export function pickRandom<T extends RandomCandidate>(
  candidates: readonly T[],
  options: { seen?: ReadonlySet<string>; exclude?: string; random?: () => number } = {},
): T | undefined {
  const { seen = new Set(), exclude, random = Math.random } = options;
  // Never the person who is already open, unless there is no one else.
  const pool = candidates.length > 1 ? candidates.filter((c) => c.slug !== exclude) : [...candidates];
  if (pool.length === 0) return undefined;

  const weights = pool.map((c) => randomWeight(c, seen));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let target = random() * total;
  for (let i = 0; i < pool.length; i++) {
    target -= weights[i]!;
    if (target < 0) return pool[i];
  }
  return pool.at(-1);
}
