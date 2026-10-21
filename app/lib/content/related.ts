import { yearOf } from "./format";

export interface RelatedCandidate {
  slug: string;
  facets: Record<string, string[]>;
  born?: { date?: string };
  died?: { date?: string };
  prominence: number;
}

/** Why two people are related: a shared facet value, or lifetimes that overlap. */
export type RelatedReason = { kind: "facet"; facet: string; value: string } | { kind: "era" };

export interface Related<T> {
  person: T;
  /** Strongest reasons first. */
  reasons: RelatedReason[];
}

/** Lifetimes have to overlap by this many years to count as "same era". */
const ERA_MIN_OVERLAP = 20;
/** Assumed lifespan when the year of death is unknown. */
const ASSUMED_LIFESPAN = 70;

function lifespan(person: RelatedCandidate): [number, number] | undefined {
  const born = Number(yearOf(person.born?.date ?? ""));
  if (!Number.isFinite(born) || !person.born?.date) return undefined;
  const died = Number(yearOf(person.died?.date ?? ""));
  return [born, person.died?.date && Number.isFinite(died) ? died : born + ASSUMED_LIFESPAN];
}

/**
 * People related to `person`: shared facet values count by their rarity (sharing a small
 * town says more than sharing "writing"), overlapping lifetimes add a little. Pure and
 * deterministic, so pre-rendered pages and the browser agree.
 */
export function relatedPeople<T extends RelatedCandidate>(
  person: RelatedCandidate,
  all: readonly T[],
  limit = 4,
): Related<T>[] {
  // How many people share each facet value → inverse frequency as weight.
  const key = (facet: string, value: string) => `${facet}\u0000${value}`;
  const counts = new Map<string, number>();
  for (const p of all) {
    for (const [facet, values] of Object.entries(p.facets)) {
      for (const value of values) counts.set(key(facet, value), (counts.get(key(facet, value)) ?? 0) + 1);
    }
  }
  const weight = (facet: string, value: string) =>
    Math.log((all.length + 1) / (counts.get(key(facet, value)) ?? 1));

  const ownSpan = lifespan(person);
  const scored = all
    .filter((p) => p.slug !== person.slug)
    .map((p) => {
      const shared: { reason: RelatedReason; score: number }[] = [];
      for (const [facet, values] of Object.entries(person.facets)) {
        const theirs = new Set(p.facets[facet] ?? []);
        for (const value of values) {
          if (theirs.has(value))
            shared.push({ reason: { kind: "facet", facet, value }, score: weight(facet, value) });
        }
      }
      const span = lifespan(p);
      if (ownSpan && span) {
        const overlap = Math.min(ownSpan[1], span[1]) - Math.max(ownSpan[0], span[0]);
        if (overlap >= ERA_MIN_OVERLAP)
          shared.push({ reason: { kind: "era" }, score: Math.min(1, overlap / 50) });
      }
      shared.sort((a, b) => b.score - a.score);
      return { person: p, score: shared.reduce((sum, s) => sum + s.score, 0), shared };
    })
    // Only the era in common is too weak a link on its own.
    .filter((entry) => entry.shared.some((s) => s.reason.kind === "facet"));

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      // Ties: lesser-known people first (discovery), then by slug for a stable order.
      a.person.prominence - b.person.prominence ||
      a.person.slug.localeCompare(b.person.slug),
  );
  return scored
    .slice(0, limit)
    .map(({ person: p, shared }) => ({ person: p, reasons: shared.map((s) => s.reason) }));
}
