import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router";

/*
 * Building blocks of the floating navigation (Figma "Nav-bottom").
 * All targets are at least 48 px (mobile) / 56 px (desktop) high.
 */

/** Dark rounded container. `bare` drops the background (used on the dark stage of the start page). */
export function NavPill({ bare = false, className, ...props }: ComponentProps<"div"> & { bare?: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-2 rounded-full p-1.5 sm:gap-3 sm:p-2",
        !bare && "bg-nav text-nav-foreground shadow-[0_2px_2px_rgb(0_0_0/0.25)]",
        className,
      )}
      {...props}
    />
  );
}

const outlined =
  "border-2 border-nav-foreground bg-nav text-nav-foreground transition-colors hover:bg-nav-foreground hover:text-nav";

/** Text pill with outline, e.g. "About the project". */
export function NavTextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "inline-flex h-12 items-center rounded-full px-5 text-label font-medium whitespace-nowrap sm:h-14 sm:px-7",
        outlined,
        className,
      )}
      {...props}
    />
  );
}

interface IconActionProps {
  label: string;
  icon: ReactNode;
  /** Where the visible label sits relative to the round icon. */
  labelSide?: "start" | "end";
  /** Hide the visible label on small screens (it stays the accessible name). */
  compactLabel?: boolean;
}

function IconActionContent({ label, icon, labelSide = "start", compactLabel = true }: IconActionProps) {
  const text = (
    <span
      className={cn(
        "nav-label text-label font-medium whitespace-nowrap",
        compactLabel && "sr-only md:not-sr-only",
      )}
    >
      {label}
    </span>
  );
  return (
    <>
      {labelSide === "start" && text}
      <span
        aria-hidden="true"
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-full sm:size-14 [&_svg]:size-6",
          outlined,
          "group-hover/action:bg-nav-foreground group-hover/action:text-nav",
        )}
      >
        {icon}
      </span>
      {labelSide === "end" && text}
    </>
  );
}

const iconActionClass = (labelSide: "start" | "end" = "start", compactLabel = true) =>
  cn(
    "nav-icon-action group/action inline-flex items-center gap-3 rounded-full text-nav-foreground",
    labelSide === "start" ? (compactLabel ? "md:pl-6" : "pl-6") : compactLabel ? "md:pr-6" : "pr-6",
  );

/** Visible label + round outlined icon, as a link (e.g. search, home). */
export function NavIconLink({
  label,
  icon,
  labelSide,
  compactLabel,
  className,
  ...props
}: IconActionProps & Omit<ComponentProps<typeof Link>, "children">) {
  return (
    <Link className={cn(iconActionClass(labelSide, compactLabel), className)} {...props}>
      <IconActionContent label={label} icon={icon} labelSide={labelSide} compactLabel={compactLabel} />
    </Link>
  );
}

/** Same look as NavIconLink, as a button (opens menus/panels). */
export function NavIconButton({
  label,
  icon,
  labelSide,
  compactLabel,
  className,
  ...props
}: IconActionProps & Omit<ComponentProps<"button">, "children">) {
  return (
    <button type="button" className={cn(iconActionClass(labelSide, compactLabel), className)} {...props}>
      <IconActionContent label={label} icon={icon} labelSide={labelSide} compactLabel={compactLabel} />
    </button>
  );
}

/** Width of the biography column in the split view; the nav and other overlays start after it. */
export const ASIDE_WIDTH = "min(55%,56rem)";

/**
 * The site navigation with a left and right group (and an optional center slot):
 * at the bottom on phones and tablets (thumb reach, safe area respected), at the top from
 * `lg` (on a desktop it would cover the content at the bottom). With `besideAside` it
 * spans only the overview column of the split view, so it never covers the biography,
 * and shows icons only.
 */
export function BottomNav({
  label,
  start,
  center,
  end,
  inert = false,
  besideAside = false,
}: {
  label: string;
  start: ReactNode;
  center?: ReactNode;
  end?: ReactNode;
  inert?: boolean;
  besideAside?: boolean;
}) {
  return (
    <nav
      aria-label={label}
      inert={inert || undefined}
      data-nav-compact={besideAside || undefined}
      // Own view-transition layer: stays put (and on top) while pages and panels animate.
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex items-end justify-between gap-2 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [view-transition-name:site-nav] sm:px-6 sm:pb-6",
        "lg:top-0 lg:bottom-auto lg:items-center lg:px-8 lg:pt-3 lg:pb-0",
        besideAside && "lg:left-[min(55%,56rem)] lg:px-4",
        "print:hidden",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">{start}</div>
      {center && <div className="pointer-events-auto hidden md:block">{center}</div>}
      <div className="flex items-center gap-2">{end}</div>
    </nav>
  );
}
