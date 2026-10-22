import { useCallback, useSyncExternalStore } from "react";

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

const BOOKMARKS_KEY = "bookmarks";
const bookmarkListeners = new Set<() => void>();
const noBookmarks: ReadonlySet<string> = new Set();
/** Parsed bookmarks per stored string, so the snapshot stays the same object until it changes. */
let bookmarkCache: { raw: string | null; set: ReadonlySet<string> } = { raw: null, set: noBookmarks };
/** Used when localStorage is unavailable: bookmarks then last until reload. */
let unstoredBookmarks: string | undefined;

function readBookmarks(): ReadonlySet<string> {
  let raw: string | null;
  try {
    raw = unstoredBookmarks ?? localStorage.getItem(BOOKMARKS_KEY);
  } catch {
    raw = null;
  }
  if (raw === bookmarkCache.raw) return bookmarkCache.set;
  let set = noBookmarks;
  try {
    const value = JSON.parse(raw ?? "[]") as unknown;
    if (Array.isArray(value)) set = new Set(value.filter((v): v is string => typeof v === "string"));
  } catch {
    // Unreadable: start with an empty list.
  }
  bookmarkCache = { raw, set };
  return set;
}

/**
 * The reader's bookmarked people ("Merkliste"), in this browser only. Empty while
 * pre-rendered HTML hydrates; shared by all components and other tabs.
 */
export function useBookmarks(): [ReadonlySet<string>, (slug: string, saved: boolean) => void] {
  const bookmarks = useSyncExternalStore(
    (listener) => {
      bookmarkListeners.add(listener);
      window.addEventListener("storage", listener);
      return () => {
        bookmarkListeners.delete(listener);
        window.removeEventListener("storage", listener);
      };
    },
    readBookmarks,
    () => noBookmarks,
  );
  const setBookmark = useCallback((slug: string, saved: boolean) => {
    const next = [...readBookmarks()].filter((s) => s !== slug);
    if (saved) next.push(slug);
    const raw = JSON.stringify(next);
    try {
      localStorage.setItem(BOOKMARKS_KEY, raw);
    } catch {
      unstoredBookmarks = raw;
    }
    for (const listener of bookmarkListeners) listener();
  }, []);
  return [bookmarks, setBookmark];
}
