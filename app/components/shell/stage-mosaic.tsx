import type { CSSProperties } from "react";

import { Portrait } from "~/components/portrait";
import type { PortraitThumb } from "~/lib/content/images";

export interface MosaicItem {
  slug: string;
  image: PortraitThumb;
}

const COLUMNS = 10;

/**
 * Decorative, dimmed wall of portraits behind the start page (Figma "BG").
 * Hidden from assistive technology; every other row is offset by half a tile.
 */
export function StageMosaic({ items }: { items: MosaicItem[] }) {
  const rows = Array.from({ length: Math.ceil(items.length / COLUMNS) }, (_, r) =>
    items.slice(r * COLUMNS, (r + 1) * COLUMNS),
  );

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden bg-stage">
      <div
        className="absolute -inset-x-[10%] -top-[8%] flex flex-col gap-3 opacity-30 sm:gap-6"
        style={{ "--tile": "clamp(7.5rem, 13vw, 12.5rem)" } as CSSProperties}
      >
        {rows.map((row, r) => (
          <div
            key={r}
            className="flex gap-3 sm:gap-6"
            style={{ marginLeft: r % 2 ? "calc(var(--tile) / 2)" : 0 }}
          >
            {row.map((item) => (
              <div key={item.slug} className="aspect-square w-(--tile) shrink-0 overflow-hidden">
                <Portrait
                  slug={item.slug}
                  image={item.image}
                  alt=""
                  sizes="(min-width: 640px) 200px, 120px"
                  className="size-full object-cover"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* Vignette keeps text on top readable regardless of the portraits underneath. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--c-stage)_85%)]" />
    </div>
  );
}

/** Deterministic pseudo-random order (stable between pre-rendering and hydration). */
export function mosaicOrder<T extends { slug: string }>(items: T[], count: number): T[] {
  const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return [...items].sort((a, b) => hash(a.slug) - hash(b.slug)).slice(0, count);
}
