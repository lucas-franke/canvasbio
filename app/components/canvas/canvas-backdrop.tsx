import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { siteConfig } from "~/lib/config";
import { firstPaintScript } from "~/lib/canvas/camera";
import { cellOrigin, personAt, seededShuffle, tileVariation, type Cell } from "~/lib/canvas/layout";
import { tornVariant } from "~/lib/canvas/torn-edge";
import type { PersonListItem } from "~/lib/content/adapter";
import { canvasLayout, canvasLimits } from "./canvas-layout";
import { CanvasTile } from "./canvas-tile";
import { LAST_CAMERA_KEY, staticView, useCamera } from "./use-camera";
import { WallPainter } from "./wall-painter";

const { canvas: config, theme } = siteConfig;

/** Drift speed of the camera, in screen pixels per second. */
const DRIFT = { x: 9, y: 5 };

/**
 * The portrait wall as a slowly drifting, decorative backdrop (start page): a few portraits
 * up close; "Mosaik" continues right there. Same order, layout and
 * tiles as the interactive canvas, and it shares the last camera position with
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
  const layout = useMemo(() => canvasLayout(ordered.length), [ordered.length]);
  const limits = useMemo(() => canvasLimits(layout), [layout]);
  const initialView = useMemo(() => staticView(layout, limits), [layout, limits]);
  // Painted on a canvas like the wall; the pre-rendered tiles step back once it has painted.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const painter = useRef<WallPainter | null>(null);
  const onApply = useCallback(
    (cam: Parameters<WallPainter["setCamera"]>[0], size: Parameters<WallPainter["setCamera"]>[1]) =>
      painter.current?.setCamera(cam, size),
    [],
  );
  const camera = useCamera({ layout, limits, storageKey: LAST_CAMERA_KEY, initialView, onApply });
  const { viewportRef, worldRef, view } = camera;
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wall = new WallPainter(canvas, {
      layout,
      people: ordered,
      variance: config.sizeVariance,
      torn: theme.tileEdge === "torn",
      names: true,
    });
    wall.onComplete = () => setPainted(true);
    wall.setCamera(camera.camera.current, camera.size.current);
    painter.current = wall;
    const refresh = () => wall.refreshTheme();
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      observer.disconnect();
      wall.dispose();
      painter.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the camera object is stable in its parts
  }, [layout, ordered]);

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

  return (
    <div aria-hidden="true" inert className="pointer-events-none absolute inset-0 overflow-clip">
      <div ref={viewportRef} className="canvas-viewport absolute inset-0 overflow-clip">
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" />
        <div
          ref={worldRef}
          // The transform is written outside React (camera, and the script below before hydration).
          suppressHydrationWarning
          className="canvas-world absolute top-1/2 left-1/2 origin-top-left"
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
                near
                painted={painted}
                active={false}
                variation={tileVariation(layout, cell, config.sizeVariance)}
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
