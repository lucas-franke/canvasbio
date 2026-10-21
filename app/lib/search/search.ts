import type { FacetConfig } from "~/lib/config/schema";
import type { PersonListItem } from "~/lib/content/adapter";

/**
 * Search and filters of the people overview (pure functions, shared by canvas and list).
 *
 * The state lives in the URL, so results can be shared and survive opening a biography:
 * `q` is the name, every facet uses its key from site.config.ts as parameter, e.g.
 * `?q=zetkin&field=politics&field=writing&place=Berlin`.
 * - "multi" facets hold values (slugs); a person matches if they have any of them,
 * - "autocomplete" facets hold free text, matched against the labels of the person's values,
 * - `saved=1` keeps only the people bookmarked in this browser (the "Merkliste").
 */

export interface SearchState {
  q: string;
  facets: Record<string, string[]>;
  /** Only bookmarked people. */
  saved: boolean;
}

export const emptySearch: SearchState = { q: "", facets: {}, saved: false };

export function parseSearch(params: URLSearchParams, facets: readonly FacetConfig[]): SearchState {
  const state: SearchState = {
    q: params.get("q")?.trim() ?? "",
    facets: {},
    saved: params.get("saved") === "1",
  };
  for (const facet of facets) {
    const values = params
      .getAll(facet.key)
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length > 0)
      state.facets[facet.key] = facet.type === "multi" ? [...new Set(values)] : [values[0]!];
  }
  return state;
}

/** Search parameters for a state; keeps unrelated parameters of `base`. */
export function toSearchParams(
  state: SearchState,
  facets: readonly FacetConfig[],
  base?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(base);
  params.delete("q");
  params.delete("saved");
  for (const facet of facets) params.delete(facet.key);
  if (state.q.trim()) params.set("q", state.q.trim());
  if (state.saved) params.set("saved", "1");
  for (const facet of facets) {
    for (const value of state.facets[facet.key] ?? []) params.append(facet.key, value);
  }
  return params;
}

/** "?…" for links, or "" without any search. */
export function searchSuffix(state: SearchState, facets: readonly FacetConfig[]): string {
  const query = toSearchParams(state, facets).toString();
  return query ? `?${query}` : "";
}

export const isSearchActive = (state: SearchState) =>
  state.q.trim() !== "" || state.saved || Object.values(state.facets).some((values) => values.length > 0);

/**
 * Folds text for comparison: case, accents (é → e), ß → ss and the German transcriptions
 * ae/oe/ue, so "Müller", "Mueller" and "muller" are the same.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ae/g, "a")
    .replace(/oe/g, "o")
    .replace(/ue/g, "u");
}

const tokenize = (text: string) =>
  normalize(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/**
 * Edit distance where swapping two neighbouring letters counts as one typo
 * (optimal string alignment), stopping early once it exceeds `max`.
 */
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let before: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, before[j - 2]! + 1);
      }
      current[j] = value;
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return max + 1;
    before = previous;
    previous = current;
  }
  return previous[b.length]!;
}

/**
 * A query word matches a name word if it is the start of it ("zet" → "zetkin"), or close to
 * it with a typo (one for words of 4+ letters, two for 8+).
 */
export function wordMatches(query: string, word: string): boolean {
  if (word.startsWith(query)) return true;
  const typos = query.length >= 8 ? 2 : query.length >= 4 ? 1 : 0;
  if (typos === 0) return false;
  return (
    distance(query, word.slice(0, query.length), typos) <= typos || distance(query, word, typos) <= typos
  );
}

/** Every word of the query has to match a word of the name (in any order). */
export function nameMatches(query: string, name: string): boolean {
  const queryWords = tokenize(query);
  if (queryWords.length === 0) return true;
  const nameWords = tokenize(name);
  return queryWords.every((q) => nameWords.some((w) => wordMatches(q, w)));
}

/**
 * People for the type-ahead list under the name field, best first: the name starts with the
 * query ("clara z…"), then every query word starts a name word, then typo matches. Ties go
 * to the better known person, then alphabetically. Needs at least two characters.
 */
export function suggestPeople<T extends { name: { display: string; sort: string }; prominence: number }>(
  people: readonly T[],
  query: string,
  limit = 5,
): T[] {
  const q = normalize(query.trim());
  if (q.length < 2) return [];
  const queryWords = tokenize(query);
  const rank = (person: T) => {
    const display = normalize(person.name.display);
    if (display.startsWith(q)) return 0;
    const words = tokenize(`${person.name.display} ${person.name.sort}`);
    if (queryWords.every((qw) => words.some((w) => w.startsWith(qw)))) return 1;
    return nameMatches(query, `${person.name.display} ${person.name.sort}`) ? 2 : -1;
  };
  return people
    .map((person) => ({ person, score: rank(person) }))
    .filter(({ score }) => score >= 0)
    .sort(
      (a, b) =>
        a.score - b.score ||
        b.person.prominence - a.person.prominence ||
        a.person.name.sort.localeCompare(b.person.name.sort),
    )
    .slice(0, limit)
    .map(({ person }) => person);
}

/** Labels of facet values, per facet: `labels.place.berlin === "Berlin"`. */
export type FacetLabels = Record<string, Record<string, string>>;

/** People matching the search, in their original order. */
export function filterPeople(
  people: readonly PersonListItem[],
  state: SearchState,
  facets: readonly FacetConfig[],
  labels: FacetLabels,
  bookmarks: ReadonlySet<string> = new Set(),
): PersonListItem[] {
  if (!isSearchActive(state)) return [...people];
  return people.filter((person) => {
    if (state.saved && !bookmarks.has(person.slug)) return false;
    if (state.q && !nameMatches(state.q, `${person.name.display} ${person.name.sort}`)) return false;
    for (const facet of facets) {
      const wanted = state.facets[facet.key];
      if (!wanted?.length) continue;
      const values = person.facets[facet.key] ?? [];
      if (facet.type === "multi") {
        if (!values.some((v) => wanted.includes(v))) return false;
      } else {
        const text = normalize(wanted[0]!);
        const names = values.map((v) => normalize(labels[facet.key]?.[v] ?? v));
        if (!names.some((name) => name.includes(text))) return false;
      }
    }
    return true;
  });
}
