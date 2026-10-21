import { Hand, X } from "lucide-react";
import { useCallback, useState } from "react";

import { useHydrated, useMediaQuery } from "~/lib/hooks";
import { useMessages } from "~/lib/i18n";

const STORAGE_KEY = "canvas-hint-done";

function hintDone(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Storage blocked: show the hint, it just comes back on the next visit.
    return false;
  }
}

/**
 * One-time hint on the portrait wall for first-time visitors: how to explore and open.
 * It goes away for good on the first drag, zoom or opened biography, or when closed.
 * Shown only after hydration, so pre-rendered HTML and returning visitors never see it flash.
 */
export function useGestureHint(): [visible: boolean, dismiss: () => void] {
  const hydrated = useHydrated();
  const [dismissed, setDismissed] = useState(false);
  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Not remembered.
    }
  }, []);
  return [hydrated && !dismissed && !hintDone(), dismiss];
}

export function GestureHint({ onDismiss }: { onDismiss: () => void }) {
  const m = useMessages();
  const touch = useMediaQuery("(pointer: coarse)", false);
  return (
    // The wall stays usable around and through the hint; only the close button takes pointer events.
    <div className="pointer-events-none absolute inset-x-3 top-1/2 z-20 flex -translate-y-1/2 justify-center">
      <div className="gesture-hint flex max-w-md items-center gap-3 rounded-[1.75rem] bg-nav py-1.5 pr-1.5 pl-5 text-nav-foreground shadow-[0_2px_4px_rgb(0_0_0/0.25)]">
        <Hand aria-hidden="true" className="size-5 shrink-0" />
        <p className="text-body-sm font-medium">
          {touch ? m.canvas.gestureHintTouch : m.canvas.gestureHintPointer}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={m.canvas.gestureHintClose}
          className="pointer-events-auto grid size-11 shrink-0 place-items-center rounded-full hover:bg-nav-foreground hover:text-nav"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
    </div>
  );
}
