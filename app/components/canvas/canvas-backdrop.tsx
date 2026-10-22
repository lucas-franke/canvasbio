import { useEffect, useMemo } from "react";

import { siteConfig } from "~/lib/config";
import { firstPaintScript } from "~/lib/canvas/camera";
import {
  cellOrigin,
  createLayout,
  personAt,
  seededShuffle,
  tileVariation,
  type Cell,
} from "~/lib/canvas/layout";
import { tornVariant } from "~/lib/canvas/torn-edge";
import type { PersonListItem } from "~/lib/content/adapter";
import { CanvasTile } from "./canvas-tile";
import { LAST_CAMERA_KEY, sizesFor, staticView, useCamera } from "./use-camera";

const { canvas: config, theme } = siteConfig;
const limits = { minZoom: config.minZoom, maxZoom: config.maxZoom };

/** Drift speed of the camera, in screen pixels per second. */
const DRIFT = { x: 9, y: 5 };

/**
 * The portrait wall as a slowly drifting, decorative backdrop (start page). Same order,
 * layout and tiles as the interactive canvas, and it shares the last camera position with
 * it (LAST_CAMERA_KEY): the start page continues where the wall was left, and the wall
 * continues where the backdrop drifted to. Hidden from assistive tech and not interactive.
 */
export function CanvasBackdrop({
  people,
  hrefFor,
}: {
  people: PersonListItem[];
  hrefFor: (slug: string) => string;
}) {
  const ordered = useMemo(() => seededShuffle(people, "canvas"), [people]);
  const layout = useMemo(
    () =>
      createLayout(ordered.length, {
        tileSize: config.tileSize,
        gap: config.gap,
        rowOffset: config.rowOffset,
        wrap: config.wrap,
      }),
    [ordered.length],
  );
  const initialView = useMemo(() => staticView(layout, limits), [layout]);
  const camera = useCamera({ layout, limits, storageKey: LAST_CAMERA_KEY, initialView });
  const { viewportRef, worldRef, view } = camera;

  // Slow drift; none with reduced motion. rAF pauses by itself in background tabs.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let last = performance.now();
    const direction = { x: 1, y: 1 };
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { x, y, scale } = camera.camera.current;
      const next = {
        x: x + (direction.x * DRIFT.x * dt) / scale,
        y: y + (direction.y * DRIFT.y * dt) / scale,
        scale,
      };
      camera.apply(next);
      // Without an endless wall the camera stops at the edge: turn around there.
      if (camera.camera.current.x === x && dt > 0) direction.x *= -1;
      if (camera.camera.current.y === y && dt > 0) direction.y *= -1;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the camera object is stable in its parts
  }, []);

  const tiles = useMemo(() => {
    if (!view || layout.count === 0) return [];
    const cells: Cell[] = [];
    for (let row = view.range.row0; row <= view.range.row1; row++) {
      for (let col = view.range.col0; col <= view.range.col1; col++) cells.push({ col, row });
    }
    return cells.flatMap((cell) => {
      const index = personAt(layout, cell);
      return index === undefined ? [] : [{ cell, person: ordered[index]!, origin: cellOrigin(layout, cell) }];
    });
  }, [view, layout, ordered]);

  const sizes = sizesFor(view?.lod ?? 0);

  return (
    <div aria-hidden="true" inert className="pointer-events-none absolute inset-0 overflow-clip">
      <div ref={viewportRef} className="canvas-viewport absolute inset-0 overflow-clip">
        <div
          ref={worldRef}
          // The transform is written outside React (camera, and the script below before hydration).
          suppressHydrationWarning
          className="canvas-world absolute top-1/2 left-1/2 origin-top-left will-change-transform"
        >
          <ul>
            {tiles.map(({ cell, person, origin }) => (
              <CanvasTile
                key={`${cell.col}:${cell.row}`}
                cellId={`${cell.col}:${cell.row}`}
                person={person}
                x={origin.x}
                y={origin.y}
                size={layout.tile}
                href={hrefFor(person.slug)}
                primary={false}
                tabbable={false}
                active={false}
                variation={tileVariation(layout, cell, config.sizeVariance)}
                sizes={sizes}
                edgeClass={
                  theme.tileEdge === "torn" ? `torn-edge-${tornVariant(cell.col, cell.row)}` : undefined
                }
              />
            ))}
          </ul>
        </div>
      </div>
      {/* Pre-rendered HTML: zoom (and last position) before the first paint. */}
      <script dangerouslySetInnerHTML={{ __html: firstPaintScript(layout, limits, LAST_CAMERA_KEY, true) }} />
    </div>
  );
}
