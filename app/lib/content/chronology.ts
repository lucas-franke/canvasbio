import { yearOf } from "./format";

/*
 * The timeline overview ("Zeitstrahl"): people ordered by year of birth, grouped by decade,
 * each with their life span on a shared time scale. Pure functions, shared by the view and tests.
 */

interface Dated {
  name: { sort: string };
  born: { date?: string };
  died?: { date?: string };
}

export interface ChronologyRow<T> {
  person: T;
  /** Year of birth. */
  from: number;
  /** Year of death; undefined if unknown (or still alive). */
  to?: number;
}

export interface DecadeGroup<T> {
  /** First year of the decade, e.g. 1850; null for people without a known year of birth. */
  decade: number | null;
  rows: ChronologyRow<T>[];
}

export interface TimeScale {
  start: number;
  end: number;
  /** Years to label on the axis. */
  ticks: number[];
}

const year = (date?: string) => {
  const value = date ? Number(yearOf(date)) : NaN;
  return Number.isFinite(value) ? value : undefined;
};

/** A person on the timeline: birth and death year (NaN / undefined when unknown). */
export function rowFor<T extends Dated>(person: T): ChronologyRow<T> {
  const from = year(person.born.date);
  const to = year(person.died?.date);
  if (from === undefined) return { person, from: NaN, to };
  return { person, from, to: to !== undefined && to >= from ? to : undefined };
}

/** People by decade of birth (oldest first); within a decade by year, then by sort name. */
export function groupByDecade<T extends Dated>(people: readonly T[]): DecadeGroup<T>[] {
  const rows: ChronologyRow<T>[] = [];
  const undated: ChronologyRow<T>[] = [];
  for (const person of people) {
    const from = year(person.born.date);
    const to = year(person.died?.date);
    if (from === undefined) undated.push({ person, from: NaN, to });
    else rows.push({ person, from, to: to !== undefined && to >= from ? to : undefined });
  }
  rows.sort((a, b) => a.from - b.from || a.person.name.sort.localeCompare(b.person.name.sort));

  const groups: DecadeGroup<T>[] = [];
  for (const row of rows) {
    const decade = Math.floor(row.from / 10) * 10;
    const last = groups.at(-1);
    if (last?.decade === decade) last.rows.push(row);
    else groups.push({ decade, rows: [row] });
  }
  if (undated.length > 0) groups.push({ decade: null, rows: undated });
  return groups;
}

/**
 * Years from the earliest birth to the latest death, widened to whole decades, with axis
 * labels every 25 or 50 years (every 10 for short spans).
 */
export function timeScale(groups: readonly DecadeGroup<unknown>[]): TimeScale | null {
  return scaleOfRows(groups.flatMap((g) => (g.decade === null ? [] : g.rows)));
}

/** The time scale for any rows (those without a year of birth are left out). */
export function scaleOfRows(all: readonly ChronologyRow<unknown>[]): TimeScale | null {
  const rows = all.filter((r) => Number.isFinite(r.from));
  if (rows.length === 0) return null;
  const start = Math.floor(Math.min(...rows.map((r) => r.from)) / 10) * 10;
  const end = Math.max(start + 10, Math.ceil(Math.max(...rows.map((r) => r.to ?? r.from)) / 10) * 10);
  const span = end - start;
  const step = span > 150 ? 50 : span > 60 ? 25 : 10;
  const ticks: number[] = [];
  for (let tick = Math.ceil(start / step) * step; tick <= end; tick += step) ticks.push(tick);
  return { start, end, ticks };
}

/** Position of a year on the scale, in percent. */
export const scalePercent = (scale: TimeScale, year: number) =>
  ((year - scale.start) / (scale.end - scale.start)) * 100;
