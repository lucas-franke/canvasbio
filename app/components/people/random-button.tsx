import { cn } from "cn";
import { Shuffle } from "lucide-react";

import { useMessages } from "~/lib/i18n";

/**
 * "Random biography" button (Figma FAB): floats centred at the bottom of the canvas.
 * The surrounding element positions it; this is just the button.
 */
export function RandomButton({ onClick, className }: { onClick: () => void; className?: string }) {
  const m = useMessages();
  return (
    <button
      type="button"
      data-floating=""
      onClick={onClick}
      className={cn(
        "hit-44 pointer-events-auto inline-flex min-h-10 items-center gap-2 rounded-full bg-brand px-4 text-body-sm font-medium whitespace-nowrap text-brand-foreground shadow-[0_2px_4px_rgb(0_0_0/0.25)] transition-[filter] hover:brightness-90 sm:min-h-11 sm:px-5 sm:text-label lg:min-h-12 lg:px-6 [&_svg]:size-4 sm:[&_svg]:size-5",
        className,
      )}
    >
      {m.random.label}
      <Shuffle aria-hidden="true" />
    </button>
  );
}

/** Vertical position at the bottom edge of the canvas, clear of the safe area on phones. */
export const RANDOM_BUTTON_BOTTOM = "bottom-[max(1.5rem,env(safe-area-inset-bottom))] lg:bottom-8";
