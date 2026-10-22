import { useGesture } from "@use-gesture/react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { siteConfig } from "~/lib/config";
import {
  cellCenter,
  cellOrigin,
  createLayout,
  inRange,
  nearestInstance,
  neighbor,
  personAt,
  seededShuffle,
  tileVariation,
} from "~/lib/canvas/layout";
import type { Cell, Direction } from "~/lib/canvas/layout";
import { tornVariant } from "~/lib/canvas/torn-edge";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { RANDOM_BUTTON_BOTTOM, RandomButton } from "~/components/people/random-button";
import { SearchSummary } from "~/components/search/search-summary";
import { Button } from "~/components/ui/button";
import type { PersonListItem } from "~/lib/content/adapter";
import { useMessages } from "~/lib/i18n";
import { readSeen } from "~/lib/preferences";
import { pickRandom } from "~/lib/random";
import type { FacetLabels, SearchState } from "~/lib/search/search";
import { markPortraitSourceElement } from "~/lib/view-transition";
import { CanvasControls } from "./canvas-controls";
import { CanvasTile } from "./canvas-tile";
import { firstPaintScript } from "~/lib/canvas/camera";
import { sizesFor, staticView, useCamera, type CanvasView } from "./use-camera";

const { canvas: config, theme } = siteConfig;
const limits = { minZoom: config.minZoom, maxZoom: config.maxZoom };
const tornEdges = theme.tileEdge === "torn";

const cellId = ({ col, row }: Cell) => `${col}:${row}`;
const sameCell = (a: Cell | null, b: Cell | null) => a?.col === b?.col && a?.row === b?.row;

function parseCell(element: EventTarget | null): Cell | null {
  const id = element instanceof Element ? element.closest("[data-cell]")?.getAttribute("data-cell") : null;
  if (!id) return null;
  const [col, row] = id.split(":").map(Number);
  return { col: col!, row: row! };
}

const ARROWS: Record<string, Direction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

/** sessionStorage key prefix of the remembered camera (per history entry). */
const STORAGE_PREFIX = "canvas-camera:";

/** Duration of the overview ↔ biography view transition (app.css). */
const VIEW_TRANSITION_MS = 380;

/** A pointer that moved further than this between down and up was a drag, not a tap (WCAG 2.5.2). */
const TAP_THRESHOLD = 6;

interface InfiniteCanvasProps {
  people: PersonListItem[];
  hrefFor: (slug: string) => string;
  /** Person whose biography is open. */
  activeSlug?: string;
  /** The list view: the equivalent alternative for screen reader users. */
  listHref: string;
  search: SearchState;
  /** People matching the search (highlighted, the rest is dimmed), or null without a search. */
  hits: PersonListItem[] | null;
  facetLabels: FacetLabels;
}

/**
 * The portrait wall as an endless, pannable and zoomable canvas.
 *
 * - Pointer: drag to pan (with inertia), pinch or Ctrl/⌘ + wheel to zoom, wheel/trackpad to pan.
 * - Keyboard: one tile is in the tab order (roving tabindex); arrow keys move between
 *   portraits and the camera follows, + and − zoom.
 * - Without dragging: zoom buttons and a direction pad (WCAG 2.5.7).
 * - Only visible tiles are rendered; every person is exposed once to assistive tech.
 */
export function InfiniteCanvas({
  people,
  hrefFor,
  activeSlug,
  listHref,
  search,
  hits,
  facetLabels,
}: InfiniteCanvasProps) {
  const m = useMessages();
  const location = useLocation();
  const navigate = useNavigate();
  const hintId = useId();

  // Mixed, but the same on every visit.
  const ordered = useMemo(() => seededShuffle(people, "canvas"), [people]);
  const indexBySlug = useMemo(() => new Map(ordered.map((p, i) => [p.slug, i])), [ordered]);
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

  // Roving tabindex: the tile that is (or was last) focused. null = the tile in the centre.
  const [current, setCurrent] = useState<Cell | null>(null);
  const currentRef = useRef(current);
  useLayoutEffect(() => {
    currentRef.current = current;
  });

  const onViewChange = useCallback((view: CanvasView) => {
    // Panned away from the remembered tile while focus is elsewhere: the next Tab should land
    // on a visible tile, not jump back.
    const remembered = currentRef.current;
    const focusInside = document.activeElement?.closest("[data-cell]") != null;
    if (remembered && !focusInside && !inRange(view.range, remembered)) setCurrent(null);
  }, []);

  // Tiles must not end up under the search results bar.
  const summaryRef = useRef<HTMLDivElement>(null);
  const topInset = useCallback(() => {
    const summary = summaryRef.current?.getBoundingClientRect();
    const viewport = summaryRef.current?.parentElement?.getBoundingClientRect();
    return summary && viewport ? summary.bottom - viewport.top + 12 : 0;
  }, []);

  const initialView = useMemo(() => staticView(layout, limits), [layout]);
  const camera = useCamera({
    layout,
    limits,
    storageKey: `${STORAGE_PREFIX}${location.key}`,
    canContinue: true,
    onViewChange,
    topInset,
    initialView,
  });
  const { viewportRef, worldRef, view } = camera;

  // Opening a biography (also via search or a link) selects its tile, so focus can return there.
  const [syncedSlug, setSyncedSlug] = useState(activeSlug);
  if (activeSlug !== syncedSlug) {
    setSyncedSlug(activeSlug);
    const index = activeSlug ? indexBySlug.get(activeSlug) : undefined;
    if (index !== undefined && view && (!current || personAt(layout, current) !== index)) {
      const center = cellCenter(layout, view.center);
      setCurrent(nearestInstance(layout, index, center.x, center.y));
    }
  }

  // …and brings it into view. Re-measure right in the commit (the viewport may have changed
  // size meanwhile), so the portraits keep their place on screen (also in the snapshot a
  // view transition takes right after).
  useLayoutEffect(() => {
    camera.sync();
    const cell = currentRef.current;
    const index = activeSlug ? indexBySlug.get(activeSlug) : undefined;
    if (!cell || index === undefined || personAt(layout, cell) !== index) return;
    // Pan only after the view transition (biography sliding in), else the moving wall
    // shows up twice in its cross-fade.
    const timer = setTimeout(
      () => camera.reveal(cell),
      "startViewTransition" in document ? VIEW_TRANSITION_MS : 0,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when another person opens
  }, [activeSlug]);

  // ---- Search ----
  const hitSet = useMemo(() => (hits ? new Set(hits.map((p) => p.slug)) : null), [hits]);
  const hitsKey = hits ? hits.map((p) => p.slug).join(",") : "";
  /** Position in `hits` of the match last jumped to with previous/next. */
  const [hitIndex, setHitIndex] = useState(-1);

  /** The copy of a matching person nearest to a world point. */
  const nearestHit = (x: number, y: number): Cell | null => {
    let best: { cell: Cell; distance: number } | null = null;
    for (const hit of hits ?? []) {
      const index = indexBySlug.get(hit.slug);
      const cell = index === undefined ? null : nearestInstance(layout, index, x, y);
      if (!cell) continue;
      const c = cellCenter(layout, cell);
      const distance = (c.x - x) ** 2 + (c.y - y) ** 2;
      if (!best || distance < best.distance) best = { cell, distance };
    }
    return best?.cell ?? null;
  };

  const centerOn = (cell: Cell) => {
    const { x, y } = cellCenter(layout, cell);
    camera.animateTo({ x, y, scale: camera.camera.current.scale }, 420);
  };
  // (also used by the random biography below)

  // A new search selects the nearest match (Tab lands there) …
  const [syncedHits, setSyncedHits] = useState(hitsKey);
  if (hitsKey !== syncedHits) {
    setSyncedHits(hitsKey);
    setHitIndex(-1);
    if (hitsKey && view) {
      const center = cellCenter(layout, view.center);
      const cell = nearestHit(center.x, center.y);
      if (cell) setCurrent(cell);
    }
  }

  // … and the camera flies to it.
  useEffect(() => {
    const cell = currentRef.current;
    const person = cell ? personAt(layout, cell) : undefined;
    if (hitsKey && cell && person !== undefined && hitSet?.has(ordered[person]!.slug)) centerOn(cell);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the search changes
  }, [hitsKey]);

  const goToHit = (step: 1 | -1) => {
    if (!hits?.length) return;
    const next =
      hitIndex < 0 ? (step === 1 ? 0 : hits.length - 1) : (hitIndex + step + hits.length) % hits.length;
    const index = indexBySlug.get(hits[next]!.slug);
    const { x, y } = camera.camera.current;
    const cell = index === undefined ? null : nearestInstance(layout, index, x, y);
    if (!cell) return;
    setHitIndex(next);
    setCurrent(cell);
    centerOn(cell);
  };

  // ---- Random biography: fly to the person, let the tile pulse, then open it ----
  const randomBusy = useRef(false);
  const showRandom = () => {
    if (randomBusy.current) return;
    const person = pickRandom(hits ?? people, { seen: readSeen(), exclude: activeSlug });
    const index = person ? indexBySlug.get(person.slug) : undefined;
    const { x, y } = camera.camera.current;
    const cell = index === undefined ? null : nearestInstance(layout, index, x, y);
    if (!person || !cell) return;

    randomBusy.current = true;
    setCurrent(cell);
    centerOn(cell);
    const tile = () => viewportRef.current?.querySelector(`[data-cell="${cellId(cell)}"]`);
    const open = () => {
      randomBusy.current = false;
      tile()?.removeAttribute("data-pulse");
      markPortraitSourceElement(tile());
      navigate(hrefFor(person.slug), { preventScrollReset: true, viewTransition: true });
    };
    // Reduced motion: the camera jumps and nothing pulses.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTimeout(open, 50);
      return;
    }
    setTimeout(() => {
      tile()?.setAttribute("data-pulse", "");
      setTimeout(open, 550);
    }, 450);
  };

  // Keyboard navigation moves `current`; focus follows once the tile is rendered.
  const pendingFocus = useRef(false);
  const goalX = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!pendingFocus.current || !current) return;
    pendingFocus.current = false;
    viewportRef.current
      ?.querySelector<HTMLElement>(`[data-cell="${cellId(current)}"]`)
      ?.focus({ preventScroll: true });
  }, [current, viewportRef]);

  // ---- Pointer gestures ----
  const dragged = useRef(false);
  useGesture(
    {
      onDragStart: () => camera.stop(),
      onDrag: ({
        delta: [dx, dy],
        movement: [mx, my],
        pinching,
        cancel,
        last,
        velocity: [vx, vy],
        direction: [dirX, dirY],
      }) => {
        if (pinching) {
          cancel();
          return;
        }
        if (Math.hypot(mx, my) > TAP_THRESHOLD) dragged.current = true;
        camera.panBy(dx, dy);
        if (last && dragged.current) camera.glide(vx * dirX, vy * dirY);
      },
      onPinchStart: () => camera.stop(),
      onPinch: ({ origin: [ox, oy], offset: [scale] }) => {
        const rect = viewportRef.current!.getBoundingClientRect();
        camera.zoomTo(scale, ox - rect.left, oy - rect.top);
      },
      onWheel: ({ event, delta: [dx, dy] }) => {
        if (event.ctrlKey || event.metaKey) return; // handled as pinch
        camera.stop();
        camera.panBy(-dx, -dy);
      },
    },
    {
      target: viewportRef,
      eventOptions: { passive: false },
      // No pointer capture: with it, the click after a tap would target the viewport, not the tile.
      // No keys: arrow keys move the focus between tiles (see onKeyDown), not the camera.
      drag: { filterTaps: true, pointer: { buttons: 1, capture: false, keys: false } },
      pinch: {
        from: () => [camera.camera.current.scale, 0],
        scaleBounds: { min: limits.minZoom, max: limits.maxZoom },
        rubberband: false,
      },
    },
  );

  // The page must neither scroll nor zoom while the canvas handles wheel and pinch.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const prevent = (event: Event) => event.preventDefault();
    viewport.addEventListener("wheel", prevent, { passive: false });
    viewport.addEventListener("gesturestart", prevent);
    viewport.addEventListener("gesturechange", prevent);
    // iOS only applies :active (long-press shows hidden names) with a touch listener present.
    const noop = () => {};
    viewport.addEventListener("touchstart", noop, { passive: true });
    return () => {
      viewport.removeEventListener("touchstart", noop);
      viewport.removeEventListener("wheel", prevent);
      viewport.removeEventListener("gesturestart", prevent);
      viewport.removeEventListener("gesturechange", prevent);
    };
  }, [viewportRef]);

  // A drag that ends over a tile must not open it. A tap while the wall is still gliding
  // only stops it, like native scrolling.
  const onPointerDownCapture = () => {
    dragged.current = camera.stop();
  };

  const onClickCapture = (event: MouseEvent) => {
    if (dragged.current) {
      event.preventDefault();
      event.stopPropagation();
      dragged.current = false;
      return;
    }
    const cell = parseCell(event.target);
    if (cell && !sameCell(cell, current)) setCurrent(cell);
  };

  const onFocus = (event: FocusEvent) => {
    const cell = parseCell(event.target);
    if (!cell) return;
    if (!sameCell(cell, current)) setCurrent(cell);
    // Keyboard focus (Tab, focus return): keep the tile clear of the nav and controls.
    if (event.target instanceof HTMLElement && event.target.matches(":focus-visible")) camera.reveal(cell);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const cell = parseCell(event.target);
    if (!cell) return;
    const direction = ARROWS[event.key];
    if (direction) {
      event.preventDefault();
      if (direction === "up" || direction === "down") goalX.current ??= cellCenter(layout, cell).x;
      else goalX.current = undefined;
      const next = neighbor(layout, cell, direction, goalX.current);
      if (!next) return;
      pendingFocus.current = true;
      setCurrent(next);
      camera.reveal(next);
    } else if (event.key === "+" || event.key === "=" || event.key === "-") {
      event.preventDefault();
      const target = event.target as HTMLElement;
      const rect = target.getBoundingClientRect();
      const box = viewportRef.current!.getBoundingClientRect();
      // Zoom around the focused tile, so it stays in view.
      const point = { x: rect.left + rect.width / 2 - box.left, y: rect.top + rect.height / 2 - box.top };
      camera.zoomBy(event.key === "-" ? 1 / 1.25 : 1.25, point);
    }
  };

  // ---- Tiles ----
  const tiles = useMemo(() => {
    if (!view || layout.count === 0) return [];
    const { range } = view;
    const cells: Cell[] = [];
    for (let row = range.row0; row <= range.row1; row++) {
      for (let col = range.col0; col <= range.col1; col++) cells.push({ col, row });
    }
    // The focused tile stays rendered even when panned out of view (focus must not get lost).
    if (current && !inRange(range, current)) cells.push(current);

    // One instance per person for assistive tech: the current tile, else the one nearest the centre.
    const center = cellCenter(layout, view.center);
    const primary = new Map<number, { cell: Cell; distance: number }>();
    for (const cell of cells) {
      const person = personAt(layout, cell);
      if (person === undefined) continue;
      const c = cellCenter(layout, cell);
      const distance = sameCell(cell, current) ? -1 : (c.x - center.x) ** 2 + (c.y - center.y) ** 2;
      const best = primary.get(person);
      if (!best || distance < best.distance) primary.set(person, { cell, distance });
    }

    const tabbable = current ?? view.center;
    return cells.flatMap((cell) => {
      const index = personAt(layout, cell);
      if (index === undefined) return [];
      return [
        {
          cell,
          person: ordered[index]!,
          origin: cellOrigin(layout, cell),
          primary: sameCell(primary.get(index)!.cell, cell),
          tabbable: sameCell(cell, tabbable),
        },
      ];
    });
  }, [view, layout, current, ordered]);

  const sizes = sizesFor(view?.lod ?? 0);

  return (
    <section aria-label={m.canvas.label} aria-describedby={hintId} className="relative h-full overflow-clip">
      <p id={hintId} className="sr-only">
        {m.canvas.hint}
      </p>
      <Link to={listHref} className="skip-link">
        {m.canvas.toList}
      </Link>

      {/* Handlers are delegated from the tile links (native, focusable); the div itself isn't interactive. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        ref={viewportRef}
        onPointerDownCapture={onPointerDownCapture}
        onClickCapture={onClickCapture}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        className="canvas-viewport absolute inset-0 cursor-grab touch-none overflow-clip select-none active:cursor-grabbing"
      >
        <div
          ref={worldRef}
          // The transform is written outside React (camera, and the script below before hydration).
          suppressHydrationWarning
          className="canvas-world absolute top-1/2 left-1/2 origin-top-left will-change-transform"
        >
          <ul>
            {tiles.map(({ cell, person, origin, primary, tabbable }) => (
              <CanvasTile
                key={cellId(cell)}
                cellId={cellId(cell)}
                person={person}
                x={origin.x}
                y={origin.y}
                size={layout.tile}
                href={hrefFor(person.slug)}
                primary={primary}
                tabbable={tabbable}
                active={person.slug === activeSlug}
                match={hitSet ? hitSet.has(person.slug) : undefined}
                variation={tileVariation(layout, cell, config.sizeVariance)}
                sizes={sizes}
                edgeClass={tornEdges ? `torn-edge-${tornVariant(cell.col, cell.row)}` : undefined}
              />
            ))}
          </ul>
        </div>
      </div>
      {/* Pre-rendered HTML: zoom for this screen before the first paint (no jump at hydration). */}
      <script dangerouslySetInnerHTML={{ __html: firstPaintScript(layout, limits, STORAGE_PREFIX) }} />

      {hits && (
        <div ref={summaryRef} className="absolute inset-x-3 top-24 z-20 mx-auto max-w-xl lg:top-28">
          <SearchSummary
            state={search}
            count={hits.length}
            labels={facetLabels}
            collapsible
            actions={
              hits.length > 0 && (
                <div className="flex gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={m.search.previousHit}
                    title={m.search.previousHit}
                    onClick={() => goToHit(-1)}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={m.search.nextHit}
                    title={m.search.nextHit}
                    onClick={() => goToHit(1)}
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              )
            }
          />
          <p role="status" className="sr-only">
            {hits[hitIndex] ? m.search.hitStatus(hitIndex + 1, hits.length, hits[hitIndex].name.display) : ""}
          </p>
        </div>
      )}

      <CanvasControls onZoomIn={() => camera.zoomBy(1.4)} onZoomOut={() => camera.zoomBy(1 / 1.4)} />

      {siteConfig.features.randomBio && (hits === null || hits.length > 0) && (
        <div
          className={`pointer-events-none absolute inset-x-0 z-20 flex justify-center ${RANDOM_BUTTON_BOTTOM}`}
        >
          <RandomButton onClick={showRandom} />
        </div>
      )}
    </section>
  );
}
