import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router";

/*
 * Building blocks of the floating navigation, fixed at the top of every screen size.
 * All targets are at least 44 px (mobile) / 40 px (desktop) high.
 */

/** Dark rounded container. `bare` drops the background (used on the dark stage of the start page). */
export function NavPill({ bare = false, className, ...props }: ComponentProps<"div"> & { bare?: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-1 rounded-full p-1",
        !bare && "bg-nav text-nav-foreground shadow-[0_2px_12px_rgb(0_0_0/0.12)] ring-1 ring-line/70",
        className,
      )}
      {...props}
    />
  );
}

/** Buttons inside the pills: no outline of their own, a light tint on hover. */
const outlined = "text-nav-foreground transition-colors hover:bg-nav-foreground/10";

/** Text pill with outline, e.g. "About the project". */
export function NavTextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "inline-flex h-12 items-center rounded-full px-5 text-label font-medium whitespace-nowrap lg:h-11",
        outlined,
        className,
      )}
      {...props}
    />
  );
}

interface IconActionProps {
  /** Accessible name, also shown as the tooltip. */
  label: string;
  icon: ReactNode;
}

/**
 * Round icon button of the navigation (search, menu): no visible label, to keep the bar
 * quiet. The label is the accessible name and the tooltip (native `title`, which also
 * shows on long-press in some mobile browsers).
 */
export function NavIconButton({
  label,
  icon,
  className,
  ...props
}: IconActionProps & Omit<ComponentProps<"button">, "children">) {
  return (
    <button
      type="button"
      title={label}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full lg:size-10 [&_svg]:size-5",
        outlined,
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="contents">
        {icon}
      </span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

/**
 * The site navigation with a left and right group (and an optional center slot), fixed at
 * the top of the screen (the safe area of notched phones is respected). The bottom stays free
 * for the canvas controls and the random button.
 */
export function TopNav({
  label,
  start,
  center,
  end,
  inert = false,
}: {
  label: string;
  start: ReactNode;
  center?: ReactNode;
  end?: ReactNode;
  inert?: boolean;
}) {
  return (
    <nav
      aria-label={label}
      inert={inert || undefined}
      // Own view-transition layer: stays put (and on top) while pages and panels animate.
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] [view-transition-name:site-nav] sm:px-6 lg:px-8",
        // Behind an open dialog (inert) the nav is part of the page snapshot, so it fades and
        // blurs together with the rest instead of staying sharp on its own layer.
        "[&[inert]]:[view-transition-name:none]",
        "print:hidden",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">{start}</div>
      {center && <div className="pointer-events-auto hidden md:block">{center}</div>}
      <div className="flex items-center gap-2">{end}</div>
    </nav>
  );
}
