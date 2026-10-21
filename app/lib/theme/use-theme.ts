import { useCallback, useSyncExternalStore } from "react";

export type ThemeChoice = "system" | "light" | "dark";

const STORAGE_KEY = "theme";
const listeners = new Set<() => void>();

function read(): ThemeChoice {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
}

/**
 * Light/dark preference. "system" follows the OS; an explicit choice is stored
 * and applied before first paint by the inline script in root.tsx.
 */
export function useTheme(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const choice = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    read,
    () => "system" as const,
  );

  const setChoice = useCallback((next: ThemeChoice) => {
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode): the choice still applies for this page view.
    }
    apply(next);
    listeners.forEach((l) => l());
  }, []);

  return [choice, setChoice];
}
