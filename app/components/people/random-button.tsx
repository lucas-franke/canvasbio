import { cn } from "cn";
import { Shuffle } from "lucide-react";

import { useMessages } from "~/lib/i18n";

/**
 * "Zufällige Biografie" (Figma FAB): floats centred above the bottom navigation.
 * The surrounding element positions it; this is just the button.
 */
export function RandomButton({ onClick, className }: { onClick: () => void; className?: string }) {
  const m = useMessages();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "pointer-events-auto inline-flex min-h-12 items-center gap-3 rounded-full bg-brand px-6 text-label font-medium whitespace-nowrap text-brand-foreground shadow-[0_2px_4px_rgb(0_0_0/0.25)] transition-[filter] hover:brightness-90 sm:min-h-14 sm:px-8",
        className,
      )}
    >
      {m.random.label}
      <Shuffle aria-hidden="true" className="size-5" />
    </button>
  );
}

/**
 * Vertical position above the floating nav (its height plus the safe area on phones).
 * Shared by canvas (absolute) and list (sticky).
 */
export const RANDOM_BUTTON_BOTTOM =
  "bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.75rem)] sm:bottom-27";
