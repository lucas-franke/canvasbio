import { useCallback, useSyncExternalStore } from "react";

/*
 * Small per-browser memories in localStorage. Optional by nature: when storage is blocked
 * (private mode, settings) everything still works, it just isn't remembered.
 */

const SEEN_KEY = "seen-people";
const SEEN_LIMIT = 300;

/** People whose biography was opened in this browser (weights "Zufällige Biografie"). */
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

const HIDE_NAMES_KEY = "hide-names";
const listeners = new Set<() => void>();
/** Used when localStorage is unavailable: the choice then lasts until reload. */
let unstored: boolean | undefined;

function readHideNames(): boolean {
  if (unstored !== undefined) return unstored;
  try {
    return localStorage.getItem(HIDE_NAMES_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * "Namen ausblenden" on the canvas. False while pre-rendered HTML hydrates, then the stored
 * choice; shared by all components and other tabs.
 */
export function useHideNames(): [boolean, (hidden: boolean) => void] {
  const hidden = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      window.addEventListener("storage", listener);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
      };
    },
    readHideNames,
    () => false,
  );
  const setHidden = useCallback((value: boolean) => {
    try {
      localStorage.setItem(HIDE_NAMES_KEY, value ? "1" : "0");
    } catch {
      unstored = value;
    }
    for (const listener of listeners) listener();
  }, []);
  return [hidden, setHidden];
}
