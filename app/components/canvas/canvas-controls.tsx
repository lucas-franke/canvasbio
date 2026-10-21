import { cn } from "cn";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crosshair,
  Minus,
  Move,
  Plus,
  Tag,
} from "lucide-react";
import { useId, useState, type ComponentProps, type ReactNode } from "react";

import { useMessages } from "~/lib/i18n";

function ControlButton({
  label,
  icon,
  className,
  ...props
}: { label: string; icon: ReactNode } & Omit<ComponentProps<"button">, "children">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid size-11 place-items-center rounded-full text-nav-foreground transition-colors hover:bg-nav-foreground/15 aria-expanded:bg-nav-foreground aria-expanded:text-nav [&_svg]:size-6",
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
  /** Move the content by a fraction of the viewport (positive = towards right/bottom). */
  onPan: (x: number, y: number) => void;
  onRecenter: () => void;
  /** "Namen ausblenden" (omit to hide the toggle). */
  namesHidden?: boolean;
  onNamesHiddenChange?: (hidden: boolean) => void;
}

/**
 * Zoom buttons (alternative to pinching, WCAG 2.5.1) and a direction pad that pans without
 * dragging (WCAG 2.5.7). The pad is folded away by default to keep the wall uncluttered.
 */
export function CanvasControls({
  onZoomIn,
  onZoomOut,
  onPan,
  onRecenter,
  namesHidden,
  onNamesHiddenChange,
}: CanvasControlsProps) {
  const m = useMessages();
  const padId = useId();
  const [padOpen, setPadOpen] = useState(false);

  return (
    <div
      role="group"
      aria-label={m.canvas.controls}
      // Pad after the buttons in the DOM (tab order), but shown to their left, aligned to the
      // top so it stays clear of the "Zufällige Biografie" button on phones.
      className="pointer-events-none absolute right-3 bottom-22 z-20 flex flex-row-reverse items-start gap-2 sm:right-6 sm:bottom-30 lg:right-12"
    >
      <div className="pointer-events-auto flex flex-col gap-1 rounded-full bg-nav p-1 shadow-[0_2px_4px_rgb(0_0_0/0.25)]">
        <ControlButton label={m.canvas.zoomIn} icon={<Plus />} onClick={onZoomIn} />
        <ControlButton label={m.canvas.zoomOut} icon={<Minus />} onClick={onZoomOut} />
        <ControlButton
          label={m.canvas.move}
          icon={<Move />}
          aria-expanded={padOpen}
          aria-controls={padId}
          onClick={() => setPadOpen((open) => !open)}
        />
        {namesHidden !== undefined && (
          <ControlButton
            label={m.canvas.hideNames}
            icon={<Tag />}
            aria-pressed={namesHidden}
            onClick={() => onNamesHiddenChange?.(!namesHidden)}
            className="aria-pressed:bg-nav-foreground aria-pressed:text-nav"
          />
        )}
      </div>
      {padOpen && (
        <div
          id={padId}
          className="pointer-events-auto grid origin-bottom-right animate-in grid-cols-3 gap-1 rounded-card bg-nav p-1 shadow-[0_2px_4px_rgb(0_0_0/0.25)] duration-200 zoom-in-90 fade-in"
        >
          {/* Arrows name the direction you look in: "left" shows what lies to the left. */}
          <ControlButton
            label={m.canvas.moveUp}
            icon={<ChevronUp />}
            onClick={() => onPan(0, 0.5)}
            className="col-start-2"
          />
          <ControlButton
            label={m.canvas.moveLeft}
            icon={<ChevronLeft />}
            onClick={() => onPan(0.5, 0)}
            className="col-start-1"
          />
          <ControlButton label={m.canvas.recenter} icon={<Crosshair />} onClick={onRecenter} />
          <ControlButton label={m.canvas.moveRight} icon={<ChevronRight />} onClick={() => onPan(-0.5, 0)} />
          <ControlButton
            label={m.canvas.moveDown}
            icon={<ChevronDown />}
            onClick={() => onPan(0, -0.5)}
            className="col-start-2"
          />
        </div>
      )}
    </div>
  );
}
