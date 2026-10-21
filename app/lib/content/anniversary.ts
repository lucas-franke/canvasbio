/**
 * "An diesem Tag": people born or died on a given calendar day (only full dates count,
 * "1857" or "1857-07" don't). Pure, so the start page can compute it in the browser with
 * today's date — pre-rendered HTML doesn't know when it is read.
 */

export interface Anniversary<T> {
  person: T;
  kind: "born" | "died";
  /** Years since the event. */
  years: number;
  /** Days from the reference day (0 = today). */
  inDays: number;
  /** The day it falls on, in the reference year (local time). */
  date: Date;
}

interface Dated {
  born: { date?: string };
  died?: { date?: string };
}

const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** Month (1–12) and day of a full ISO date, or null for partial and BCE dates. */
function monthDay(date: string | undefined): { year: number; month: number; day: number } | null {
  const match = date?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/**
 * Anniversaries from `today` up to `days` days ahead, soonest first. A 29 February is
 * remembered on 28 February in non-leap years.
 */
export function anniversaries<T extends Dated>(
  people: readonly T[],
  today: Date,
  days = 0,
): Anniversary<T>[] {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const result: Anniversary<T>[] = [];
  for (let offset = 0; offset <= days; offset++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
    const year = day.getFullYear();
    const month = day.getMonth() + 1;
    const date = day.getDate();
    const leapFallback = !isLeap(year) && month === 2 && date === 28;
    for (const person of people) {
      for (const kind of ["born", "died"] as const) {
        const event = monthDay(person[kind]?.date);
        if (!event || event.year >= year) continue;
        const matches =
          (event.month === month && event.day === date) ||
          (leapFallback && event.month === 2 && event.day === 29);
        if (matches) result.push({ person, kind, years: year - event.year, inDays: offset, date: day });
      }
    }
  }
  return result;
}
