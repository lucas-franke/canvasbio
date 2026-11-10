import { cn } from "cn";
import { Minus, Plus } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { useMessages } from "~/lib/i18n";

/**
 * At a zoom limit the button stays focusable but says it can't do more (aria-disabled, dimmed):
 * a disabled button would drop the focus of whoever just pressed it to the end.
 */
function ControlButton({
  label,
  icon,
  unavailable = false,
  onClick,
  className,
  ...props
}: { label: string; icon: ReactNode; unavailable?: boolean } & Omit<ComponentProps<"button">, "children">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-disabled={unavailable || undefined}
      onClick={unavailable ? undefined : onClick}
      className={cn(
        "hit-44 grid size-10 place-items-center rounded-full text-nav-foreground transition-colors hover:bg-nav-foreground/10 [&_svg]:size-5",
        "aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-transparent",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

interface CanvasControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** At the zoom limit, if any: that button can't do more. */
  zoomEdge?: "in" | "out" | null;
  /** Name of the group (default: the wall's). */
  label?: string;
}

/**
 * Zoom buttons (alternative to pinching, WCAG 2.5.1), kept small so the wall stays the focus.
 * Panning without dragging (WCAG 2.5.7): arrow keys, the search's previous/next match, and
 * the list and timeline views with the same people.
 */
export function CanvasControls({ onZoomIn, onZoomOut, zoomEdge = null, label }: CanvasControlsProps) {
  const m = useMessages();
  return (
    <div
      role="group"
      aria-label={label ?? m.canvas.controls}
      className="pointer-events-none absolute right-3 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-20 flex flex-col items-end sm:right-6 lg:right-8 lg:bottom-8"
    >
      <div className="pointer-events-auto flex flex-col gap-0.5 rounded-full bg-nav p-0.5 shadow-[0_2px_10px_rgb(0_0_0/0.12)]">
        <ControlButton
          label={m.canvas.zoomIn}
          icon={<Plus />}
          onClick={onZoomIn}
          unavailable={zoomEdge === "in"}
        />
        <ControlButton
          label={m.canvas.zoomOut}
          icon={<Minus />}
          onClick={onZoomOut}
          unavailable={zoomEdge === "out"}
        />
      </div>
    </div>
  );
}
