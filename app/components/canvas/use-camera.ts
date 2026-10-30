import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  FAR_TILE_PX,
  constrainCamera,
  easeOutCubic,
  initialCamera,
  lerpCamera,
  revealRect,
  zoomAt,
  type Insets,
  type ZoomLimits,
} from "~/lib/canvas/camera";
import { SQUARE_WIDTHS } from "~/lib/content/images";
import {
  cellNear,
  cellOrigin,
  clamp,
  sameRange,
  visibleRange,
  type Camera,
  type CanvasLayout,
  type Cell,
  type CellRange,
  type Size,
} from "~/lib/canvas/layout";

/**
 * Tiles for pre-rendered HTML, before the viewport size is known: the world area around the
 * pattern centre that a phone or a desktop sees at the starting zoom (about 7 × 7 tiles).
 * `lod: 0` stands for "size unknown" (see `sizesFor`).
 */
export function staticView(layout: CanvasLayout, limits: ZoomLimits): CanvasView {
  const { x, y } = initialCamera(layout, { width: 1, height: 1 }, limits);
  const camera = { x, y, scale: 1 };
  return {
    range: visibleRange(layout, camera, { width: 1900, height: 1800 }, 0),
    center: cellNear(layout, x, y),
    lod: 0,
    far: false,
  };
}

/** Screen density for image choice; above 3 the difference isn't visible on a small tile. */
const density = () => (typeof window === "undefined" ? 1 : Math.min(3, window.devicePixelRatio || 1));

/**
 * `sizes` for tile images that makes the browser pick exactly the file width `lod` (it
 * multiplies `sizes` by the screen density), or the starting size by viewport width.
 */
export const sizesFor = (lod: number) =>
  lod > 0 ? `${Math.floor(lod / density())}px` : "(max-width: 780px) 130px, 280px";

/** What React renders from the camera: changes only when a cell boundary or the image size bucket is crossed. */
export interface CanvasView {
  range: CellRange;
  /** Cell at the viewport centre. */
  center: Cell;
  /** Image file width the tiles need at this zoom and screen density (see `sizesFor`). */
  lod: number;
  /** Seen from afar (names hidden): tiles render as bare portraits. */
  far: boolean;
}

/**
 * How long the camera has to rest before zoom-dependent details catch up: the constant-size
 * names and focus rings (--s) and the image size (lod). Updating them on every frame of a
 * zoom restyles or re-renders every tile and made zooming stutter.
 */
const SETTLE_MS = 140;
/**
 * The smallest portrait file that is sharp enough for a tile of `px` CSS pixels. Slightly
 * soft is fine (15 %): a sharper file is often four times the bytes.
 */
const lodFor = (px: number) => SQUARE_WIDTHS.find((w) => w >= px * density() * 0.85) ?? SQUARE_WIDTHS.at(-1)!;

const sameView = (a: CanvasView | null, b: CanvasView) =>
  a !== null &&
  sameRange(a.range, b.range) &&
  a.center.col === b.center.col &&
  a.center.row === b.center.row &&
  a.lod === b.lod &&
  a.far === b.far;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Screen areas covered by the navigation (top), the random biography button (bottom) and
 * the canvas controls (right).
 */
function insetsFor({ width }: Size): Insets {
  if (window.matchMedia("(min-width: 64rem)").matches) return { top: 112, right: 88, bottom: 104, left: 12 };
  return { top: 96, right: width < 640 ? 64 : 88, bottom: 104, left: 12 };
}

function readStoredCamera(key: string, limits: ZoomLimits): Camera | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? "null") as Camera | null;
    if (
      value &&
      [value.x, value.y, value.scale].every(Number.isFinite) &&
      value.scale >= limits.minZoom &&
      value.scale <= limits.maxZoom
    ) {
      return value;
    }
  } catch {
    // Storage blocked or corrupt: start fresh.
  }
  return null;
}

/**
 * The wall seen last, shared by the start page backdrop and the canvas: the backdrop starts
 * where the canvas was left, and its own drift is stored here as well.
 */
export const LAST_CAMERA_KEY = "canvas:last";
/** One-shot flag: the next canvas starts at LAST_CAMERA_KEY (set by the start page CTA). */
const CONTINUE_KEY = "canvas:continue";

/** Lets the next canvas continue at the wall's last position (start page → canvas). */
export function continueFromLastCamera() {
  try {
    sessionStorage.setItem(CONTINUE_KEY, "1");
  } catch {
    // Not critical: the canvas then starts in the middle.
  }
}

function takeContinuation(limits: ZoomLimits): Camera | null {
  try {
    if (sessionStorage.getItem(CONTINUE_KEY) !== "1") return null;
    sessionStorage.removeItem(CONTINUE_KEY);
  } catch {
    return null;
  }
  return readStoredCamera(LAST_CAMERA_KEY, limits);
}

interface UseCameraOptions {
  layout: CanvasLayout;
  limits: ZoomLimits;
  /** sessionStorage key for the position of this history entry (restored after reload/back). */
  storageKey: string;
  /** Without a stored position, continue where the start page backdrop was (see continueFromLastCamera). */
  canContinue?: boolean;
  /** Called after every view change, outside of rendering. */
  onViewChange?: (view: CanvasView) => void;
  /** Extra space covered at the top (e.g. the search results bar), in px from the viewport top. */
  topInset?: () => number;
  /** What to render before the viewport has been measured (pre-rendering, hydration). */
  initialView?: CanvasView;
}

/**
 * Camera of the infinite canvas. The camera itself lives in a ref and is written straight
 * to the world element's transform, so panning doesn't re-render React; only `view`
 * (visible cell range etc.) is state.
 */
export function useCamera({
  layout,
  limits,
  storageKey,
  canContinue = false,
  onViewChange,
  topInset,
  initialView,
}: UseCameraOptions) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const camera = useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const size = useRef<Size>({ width: 0, height: 0 });
  /** Viewport centre on screen at the last measurement. */
  const screenCenter = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef(0);
  /** Where the running zoom animation ends, so quick repeated zooms add up. */
  const zoomTarget = useRef<Camera | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const viewRef = useRef<CanvasView | null>(initialView ?? null);
  const [view, setView] = useState<CanvasView | null>(initialView ?? null);

  // Latest values for callbacks that are created once.
  const latest = useRef({ layout, limits, storageKey, canContinue, onViewChange, topInset });
  useLayoutEffect(() => {
    latest.current = { layout, limits, storageKey, canContinue, onViewChange, topInset };
  });

  /** Remembers the position for this history entry (restored after reload or back). */
  const save = () => {
    clearTimeout(saveTimer.current);
    try {
      sessionStorage.setItem(latest.current.storageKey, JSON.stringify(camera.current));
      sessionStorage.setItem(LAST_CAMERA_KEY, JSON.stringify(camera.current));
    } catch {
      // Not critical: the position just isn't restored.
    }
  };

  const apply = useCallback((next: Camera) => {
    const { layout, limits, onViewChange } = latest.current;
    const cam = constrainCamera(layout, {
      ...next,
      scale: clamp(next.scale, limits.minZoom, limits.maxZoom),
    });
    const zooming = cam.scale !== camera.current.scale;
    camera.current = cam;

    const world = worldRef.current;
    const settle = () => {
      if (world) {
        // At rest the browser paints the wall again at its real zoom, and only what's visible.
        // A permanent will-change keeps it at the resolution of the start: zoomed out, the
        // wall then needs more graphics memory than a phone has and parts stay unpainted.
        world.style.willChange = "";
        const scale = String(camera.current.scale);
        if (world.style.getPropertyValue("--s") !== scale) world.style.setProperty("--s", scale);
      }
      const px = latest.current.layout.tile * camera.current.scale;
      const lod = lodFor(px);
      const far = px < FAR_TILE_PX;
      const settled = viewRef.current;
      if (settled && (settled.lod !== lod || settled.far !== far)) {
        viewRef.current = { ...settled, lod, far };
        setView(viewRef.current);
      }
    };
    if (world) {
      // Zooming: one composited layer, so the wall isn't repainted at every scale. Panning
      // doesn't need the hint (the translate3d layer just moves), and setting or removing it
      // makes the browser repaint the whole wall, which stuttered at the start of every pan.
      if (zooming && viewRef.current && viewRef.current.lod !== 0 && world.style.willChange !== "transform")
        world.style.willChange = "transform";
      world.style.transform = `translate3d(${-cam.x * cam.scale}px, ${-cam.y * cam.scale}px, 0) scale(${cam.scale})`;
      // Seen from afar: names are hidden (app.css) and a tap zooms in instead of opening.
      world.toggleAttribute("data-far", layout.tile * cam.scale < FAR_TILE_PX);
    }

    // The first camera (and every one without a measured size yet) takes effect at once.
    const first = !viewRef.current || viewRef.current.lod === 0;
    // A smaller image size applies at once: tiles coming into view while zooming out load the
    // small file (loaded tiles keep their sharper one, see CanvasTile). Larger sizes wait.
    const lod = lodFor(layout.tile * cam.scale);
    const nextView: CanvasView = {
      range: visibleRange(layout, cam, size.current, 1),
      center: cellNear(layout, cam.x, cam.y),
      lod: first ? lod : Math.min(lod, viewRef.current!.lod),
      far: first ? layout.tile * cam.scale < FAR_TILE_PX : viewRef.current!.far,
    };
    if (!sameView(viewRef.current, nextView)) {
      viewRef.current = nextView;
      setView(nextView);
      onViewChange?.(nextView);
    }
    clearTimeout(settleTimer.current);
    if (first) settle();
    else settleTimer.current = setTimeout(settle, SETTLE_MS);

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, 250);
  }, []);

  /** Stops a running animation or glide; returns whether one was running. */
  const stop = useCallback(() => {
    const running = frame.current !== 0;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    zoomTarget.current = null;
    return running;
  }, []);

  /**
   * Reads the viewport size. When the viewport moves or changes size (e.g. the biography
   * column opens next to it), the camera is shifted so the portraits stay where they are on
   * screen instead of jumping to the new centre.
   */
  const measure = useCallback(() => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return size.current;
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const previous = screenCenter.current;
    if (previous && (previous.x !== center.x || previous.y !== center.y)) {
      const { x, y, scale } = camera.current;
      camera.current = {
        x: x + (center.x - previous.x) / scale,
        y: y + (center.y - previous.y) / scale,
        scale,
      };
    }
    screenCenter.current = center;
    size.current = { width: rect.width, height: rect.height };
    return size.current;
  }, []);

  /** Re-measures and redraws right away (e.g. inside a layout effect, before the next paint). */
  const sync = useCallback(() => {
    measure();
    apply(camera.current);
  }, [apply, measure]);

  /** Animated camera move (instant with reduced motion). */
  const animateTo = useCallback(
    (target: Camera, duration = 320) => {
      stop();
      if (prefersReducedMotion()) {
        apply(target);
        return;
      }
      const from = camera.current;
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        apply(lerpCamera(from, target, easeOutCubic(t)));
        frame.current = t < 1 ? requestAnimationFrame(step) : 0;
      };
      frame.current = requestAnimationFrame(step);
    },
    [apply, stop],
  );

  /** Pan by a distance in screen px (positive = content moves right/down). */
  const panBy = useCallback(
    (dx: number, dy: number) => {
      const { x, y, scale } = camera.current;
      apply({ x: x - dx / scale, y: y - dy / scale, scale });
    },
    [apply],
  );

  /** Keeps moving after a flick and slows down (no inertia with reduced motion). */
  const glide = useCallback(
    (vx: number, vy: number) => {
      stop();
      if (prefersReducedMotion()) return;
      let last = performance.now();
      const step = (now: number) => {
        const dt = Math.min(48, now - last);
        last = now;
        const decay = 0.95 ** (dt / 16);
        vx *= decay;
        vy *= decay;
        panBy(vx * dt, vy * dt);
        frame.current = Math.hypot(vx, vy) > 0.02 ? requestAnimationFrame(step) : 0;
      };
      frame.current = requestAnimationFrame(step);
    },
    [panBy, stop],
  );

  /** Zoom by a factor around a screen point (default: viewport centre). */
  const zoomBy = useCallback(
    (factor: number, point?: { x: number; y: number }, animate = true) => {
      const { width, height } = size.current;
      const cam = (frame.current !== 0 && zoomTarget.current) || camera.current;
      const target = zoomAt(
        cam,
        size.current,
        point?.x ?? width / 2,
        point?.y ?? height / 2,
        cam.scale * factor,
        latest.current.limits,
      );
      if (animate) {
        animateTo(target, 220);
        zoomTarget.current = target;
      } else apply(target);
    },
    [animateTo, apply],
  );

  /** Zoom to an absolute scale around a screen point (pinch). */
  const zoomTo = useCallback(
    (scale: number, x: number, y: number) => {
      apply(zoomAt(camera.current, size.current, x, y, scale, latest.current.limits));
    },
    [apply],
  );

  /** Pan (animated) so a cell is fully visible and not covered by floating UI (WCAG 2.4.11). */
  const reveal = useCallback(
    (cell: Cell, animate = true) => {
      const { layout } = latest.current;
      const viewport = measure();
      const origin = cellOrigin(layout, cell);
      const insets = insetsFor(viewport);
      insets.top = Math.max(insets.top, latest.current.topInset?.() ?? 0);
      const target = revealRect(camera.current, viewport, insets, {
        ...origin,
        width: layout.tile,
        height: layout.tile,
      });
      // apply() also when nothing moves: measure() may have shifted the camera.
      if (animate && target !== camera.current) animateTo(target, 260);
      else apply(target);
    },
    [animateTo, apply, measure],
  );

  // Initial position (restored for this history entry, else the pattern centre) and resizes.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const { layout, limits, storageKey, canContinue } = latest.current;
    const initialSize = measure();
    // The start page backdrop saves its last position in the same commit (unmount runs first).
    // The one-shot flag is consumed in any case, so it can't leak into a later visit.
    const continued = canContinue ? takeContinuation(limits) : null;
    apply(readStoredCamera(storageKey, limits) ?? continued ?? initialCamera(layout, initialSize, limits));

    const observer = new ResizeObserver(sync);
    observer.observe(viewport);
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pagehide", save);
      observer.disconnect();
      stop();
      clearTimeout(settleTimer.current);
      save();
    };
  }, [apply, measure, stop, sync]);

  // A new layout (other data) keeps the camera but needs a new visible range.
  useEffect(() => {
    if (viewRef.current) apply(camera.current);
  }, [layout, apply]);

  return {
    viewportRef,
    worldRef,
    view,
    camera,
    size,
    apply,
    stop,
    panBy,
    glide,
    zoomBy,
    zoomTo,
    reveal,
    sync,
    animateTo,
    measure,
  };
}
