import { indexLetter, yearOf } from "./format";
import { ALPHABET } from "./group";

/*
 * Sort orders of the list and the timeline, and the chapters they are divided into
 * (letters, decades of birth or death, life spans). Pure functions, shared by the views,
 * the previous/next order of the biographies and tests.
 */

export const SORTS = {
  list: ["name", "name-desc", "born", "born-desc"],
  timeline: ["born", "born-desc", "died", "age"],
} as const;

export type SortView = keyof typeof SORTS;
export type SortKey = (typeof SORTS)[SortView][number];

/** The requested order if the view offers it, else the view's default (its first). */
export function sortFor(view: SortView, requested: string | undefined): SortKey {
  const options = SORTS[view] as readonly string[];
  return (requested && options.includes(requested) ? requested : options[0]) as SortKey;
}

export type ChapterKind = "letter" | "born" | "died" | "age" | "unknown";

export interface Chapter<T> {
  /** Id of the chapter heading (anchor of the chapter navigation). */
  id: string;
  kind: ChapterKind;
  /**
   * The letter; the first year of the decade (born, died) or of the ten years of life (age);
   * for "unknown" the field that is unknown ("born", "died" or "age").
   */
  value: string | number;
  items: T[];
}

interface Sortable {
  name: { sort: string };
  born: { date?: string };
  died?: { date?: string };
}

const yearFrom = (date?: string) => {
  const value = date ? Number(yearOf(date)) : NaN;
  return Number.isFinite(value) ? value : undefined;
};

const birth = (p: Sortable) => yearFrom(p.born.date);
const death = (p: Sortable) => yearFrom(p.died?.date);
const lifespan = (p: Sortable) => {
  const from = birth(p);
  const to = death(p);
  return from !== undefined && to !== undefined && to >= from ? to - from : undefined;
};

const collator = new Intl.Collator("de", { sensitivity: "base" });
const byName = (a: Sortable, b: Sortable) => collator.compare(a.name.sort, b.name.sort);

/** Letters in alphabet order, everything else ("#") after Z. */
const letterRank = (letter: string) => (letter === "#" ? ALPHABET.length : ALPHABET.indexOf(letter));

export const letterAnchor = (letter: string) =>
  `buchstabe-${letter === "#" ? "andere" : letter.toLowerCase()}`;

/** Splits sorted items into consecutive chapters by a key. */
function split<T>(sorted: T[], keyOf: (item: T) => string, make: (key: string, items: T[]) => Chapter<T>) {
  const chapters: Chapter<T>[] = [];
  let key: string | null = null;
  let items: T[] = [];
  for (const item of sorted) {
    const k = keyOf(item);
    if (k !== key && items.length > 0) {
      chapters.push(make(key!, items));
      items = [];
    }
    key = k;
    items.push(item);
  }
  if (items.length > 0) chapters.push(make(key!, items));
  return chapters;
}

/** Chapters by a year-like value in decades; people without the value come last. */
function byDecades<T extends Sortable>(
  people: readonly T[],
  valueOf: (p: T) => number | undefined,
  direction: 1 | -1,
  kind: "born" | "died" | "age",
  prefix: string,
): Chapter<T>[] {
  const known = people.filter((p) => valueOf(p) !== undefined);
  const unknown = people.filter((p) => valueOf(p) === undefined).sort(byName);
  known.sort((a, b) => direction * (valueOf(a)! - valueOf(b)!) || byName(a, b));
  const chapters = split(
    known,
    // Life spans of 100 years and more form one chapter ("100+").
    (p) => String(Math.min(Math.floor(valueOf(p)! / 10) * 10, kind === "age" ? 100 : Infinity)),
    (key, items) => ({ id: `${prefix}-${key}`, kind, value: Number(key), items }),
  );
  if (unknown.length > 0)
    chapters.push({ id: `${prefix}-unbekannt`, kind: "unknown", value: kind, items: unknown });
  return chapters;
}

/** People in the given order, divided into chapters. */
export function chaptersOf<T extends Sortable>(people: readonly T[], sort: SortKey): Chapter<T>[] {
  switch (sort) {
    case "name":
    case "name-desc": {
      const sorted = [...people].sort(
        (a, b) => letterRank(indexLetter(a.name.sort)) - letterRank(indexLetter(b.name.sort)) || byName(a, b),
      );
      if (sort === "name-desc") sorted.reverse();
      return split(
        sorted,
        (p) => indexLetter(p.name.sort),
        (letter, items) => ({ id: letterAnchor(letter), kind: "letter", value: letter, items }),
      );
    }
    case "born":
      return byDecades(people, birth, 1, "born", "jahrzehnt");
    case "born-desc":
      return byDecades(people, birth, -1, "born", "jahrzehnt");
    case "died":
      return byDecades(people, death, 1, "died", "tod");
    case "age":
      return byDecades(people, lifespan, -1, "age", "alter");
  }
}

/** People in the given order (e.g. for previous/next in the biography). */
export const sortPeople = <T extends Sortable>(people: readonly T[], sort: SortKey): T[] =>
  chaptersOf(people, sort).flatMap((chapter) => chapter.items);
