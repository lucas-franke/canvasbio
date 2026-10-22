/*
 * Small per-browser memories in localStorage. Optional by nature: when storage is blocked
 * (private mode, settings) everything still works, it just isn't remembered.
 */

const SEEN_KEY = "seen-people";
const SEEN_LIMIT = 300;

/** People whose biography was opened in this browser (weights the random biography). */
export function readSeen(): Set<string> {
  try {
    const value = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as unknown;
    return new Set(Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

export function markSeen(slug: string) {
  try {
    const seen = [...readSeen()].filter((s) => s !== slug);
    seen.push(slug);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(-SEEN_LIMIT)));
  } catch {
    // Not remembered; the pick is just less varied.
  }
}
