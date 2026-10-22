import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False during pre-rendering and hydration, true afterwards (avoids hydration mismatches). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/**
 * Media query match. Returns `serverValue` during pre-rendering and hydration,
 * then the real value — so the first client render matches the static HTML.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Tailwind `lg` breakpoint: desktop layout (top navigation, side sheets, the biography as a centred card). */
export const WIDE_QUERY = "(min-width: 64rem)";
