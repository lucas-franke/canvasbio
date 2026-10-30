import { cn } from "cn";
import { memo } from "react";
import { Link } from "react-router";

import { Portrait } from "~/components/portrait";
import type { TileVariation } from "~/lib/canvas/layout";
import type { PersonListItem } from "~/lib/content/adapter";
import { markPortraitSource } from "~/lib/view-transition";

interface CanvasTileProps {
  person: PersonListItem;
  /** "col:row", used to find the tile for keyboard focus. */
  cellId: string;
  x: number;
  y: number;
  size: number;
  href: string;
  /**
   * The one instance of this person exposed to assistive tech. With the endless wrap (or the
   * filler cells of the endless wall) a person can appear several times; the other copies are hidden
   * from screen readers.
   */
  primary: boolean;
  /** Roving tabindex: exactly one tile is in the tab order. */
  tabbable: boolean;
  /** In or near the view: with portrait and label. Far away only the link and its name. */
  near: boolean;
  /** Seen from afar: names are hidden anyway, so only the portrait (cheaper to restyle). */
  far?: boolean;
  /** Biography of this person is open. */
  active: boolean;
  /**
   * With a search: whether this person matches (highlighted) or not (dimmed, and hidden from
   * screen readers, so they hear the matches only).
   */
  match?: boolean;
  /** Slight size and position variation (see canvas.sizeVariance). */
  variation: TileVariation;
  /** `sizes` value matching the rendered tile size. */
  sizes: string;
  /** Mask class for the torn paper edge, if enabled. */
  edgeClass?: string;
}

/**
 * Props are equal when all are identical, the variation by value (it is computed anew on every
 * render; comparing it by identity would re-render every tile on every camera move).
 */
function sameProps(a: CanvasTileProps, b: CanvasTileProps) {
  return (Object.keys(a) as (keyof CanvasTileProps)[]).every((key) =>
    key === "variation"
      ? a.variation.scale === b.variation.scale &&
        a.variation.dx === b.variation.dx &&
        a.variation.dy === b.variation.dy
      : a[key] === b[key],
  );
}

/** One portrait on the canvas: a link to the biography with the name on a dark gradient. */
export const CanvasTile = memo(function CanvasTile({
  person,
  cellId,
  x,
  y,
  size,
  href,
  primary,
  tabbable,
  near,
  far = false,
  active,
  match,
  variation,
  sizes,
  edgeClass,
}: CanvasTileProps) {
  return (
    <li
      data-vt-item
      aria-hidden={primary && match !== false ? undefined : true}
      className="absolute top-0 left-0"
      style={{
        width: size,
        height: size,
        transform: `translate(${x + variation.dx}px, ${y + variation.dy}px)`,
        ["--tile-scale" as string]: variation.scale,
      }}
    >
      <Link
        to={href}
        preventScrollReset
        viewTransition
        onClick={markPortraitSource}
        draggable={false}
        data-cell={cellId}
        data-person={primary ? person.slug : undefined}
        data-active={active || undefined}
        data-match={match === undefined ? undefined : match ? "hit" : "miss"}
        aria-current={primary && active ? "page" : undefined}
        tabIndex={tabbable ? 0 : -1}
        className="canvas-tile group block size-full"
      >
        {near ? (
          <span
            data-vt-portrait
            data-tint
            className={cn("relative block size-full overflow-hidden bg-stage", edgeClass)}
          >
            <Portrait
              slug={person.slug}
              image={person.image}
              alt=""
              sizes={sizes}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Dark gradient guarantees contrast for the name regardless of the photo. */}
            {far ? (
              <span className="sr-only">{person.name.display}</span>
            ) : (
              <span className="canvas-tile-name absolute inset-x-0 bottom-0 bg-linear-to-t from-stage via-stage/80 to-transparent font-medium text-stage-foreground">
                <span className="canvas-tile-label">{person.name.display}</span>
              </span>
            )}
          </span>
        ) : (
          // Its dominant colour shows through until it comes near (a fast fling, the far wall).
          <span className="block size-full" style={{ backgroundColor: person.image.color }}>
            <span className="sr-only">{person.name.display}</span>
          </span>
        )}
      </Link>
    </li>
  );
}, sameProps);
