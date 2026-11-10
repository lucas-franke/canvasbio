import { cn } from "cn";
import { Shuffle } from "lucide-react";

import { useMessages } from "~/lib/i18n";

/**
 * "Random biography" button (Figma FAB): floats centred at the bottom of the canvas.
 * The surrounding element positions it; this is just the button.
 */
export function RandomButton({
  onClick,
  inResults = false,
  className,
}: {
  onClick: () => void;
  /** A search is active: the pick comes from its results, and the button says so. */
  inResults?: boolean;
  className?: string;
}) {
  const m = useMessages();
  return (
    <button
      type="button"
      data-floating=""
      onClick={onClick}
      className={cn(
        "pointer-events-auto hit-44 inline-flex min-h-10 items-center gap-2 rounded-full bg-brand px-4 text-body-sm font-medium whitespace-nowrap text-brand-foreground shadow-float transition-[filter] hover:brightness-90 sm:min-h-11 sm:px-5 sm:text-label lg:min-h-12 lg:px-6 [&_svg]:size-4 sm:[&_svg]:size-5",
        className,
      )}
    >
      <span>
        {m.random.label}
        {/* Phones: no room next to the zoom buttons; the name still says it. */}
        {inResults && <span className="max-sm:sr-only"> {m.random.fromResults}</span>}
      </span>
      <Shuffle aria-hidden="true" />
    </button>
  );
}

/** Vertical position at the bottom edge of the canvas, clear of the safe area on phones. */
export const RANDOM_BUTTON_BOTTOM = "bottom-[max(1.5rem,env(safe-area-inset-bottom))] lg:bottom-8";
