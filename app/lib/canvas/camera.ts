import { clamp, type Camera, type CanvasLayout, type Size } from "./layout";

/** Below this rendered tile size (px) the wall is seen from afar: names hidden, a tap zooms in. */
export const FAR_TILE_PX = 72;

/** Screen-space margins that floating UI (wordmark, nav, controls) covers. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ZoomLimits {
  minZoom: number;
  maxZoom: number;
}

/** Converts a point in the viewport (CSS px from its top-left) to world coordinates. */
export function screenToWorld(camera: Camera, viewport: Size, sx: number, sy: number) {
  return {
    x: camera.x + (sx - viewport.width / 2) / camera.scale,
    y: camera.y + (sy - viewport.height / 2) / camera.scale,
  };
}

export function worldToScreen(camera: Camera, viewport: Size, wx: number, wy: number) {
  return {
    x: viewport.width / 2 + (wx - camera.x) * camera.scale,
    y: viewport.height / 2 + (wy - camera.y) * camera.scale,
  };
}

/** Zoom to `scale` while the world point under the screen point (sx, sy) stays in place. */
export function zoomAt(
  camera: Camera,
  viewport: Size,
  sx: number,
  sy: number,
  scale: number,
  limits: ZoomLimits,
): Camera {
  const next = clamp(scale, limits.minZoom, limits.maxZoom);
  const anchor = screenToWorld(camera, viewport, sx, sy);
  return {
    x: anchor.x - (sx - viewport.width / 2) / next,
    y: anchor.y - (sy - viewport.height / 2) / next,
    scale: next,
  };
}

/**
 * Starting zoom: tiles about a sixth of the viewport width, but at least 130 and at most
 * 280 screen px — three columns on a phone, five to seven on a desktop.
 */
export function defaultScale(layout: CanvasLayout, viewport: Size, limits: ZoomLimits): number {
  const pitch = clamp(viewport.width / 6, 130, 280);
  return clamp(pitch / layout.pitch, limits.minZoom, limits.maxZoom);
}

/**
 * Inline script that sets the world transform before the first paint of pre-rendered HTML,
 * with the same formula as `defaultScale` (the viewport size is only known in the browser).
 * A position remembered for this history entry wins, like after hydration.
 * Placed right after the viewport element; the world (.canvas-world) is inside it.
 */
export function firstPaintScript(
  layout: CanvasLayout,
  limits: ZoomLimits,
  storagePrefix: string,
  /** Read this key as is (not per history entry). */
  fixedKey = false,
): string {
  const { x, y } = initialCamera(layout, { width: 1, height: 1 }, limits);
  return [
    "(function(){try{",
    "var v=document.currentScript.previousElementSibling,w=v.querySelector('.canvas-world'),r=v.getBoundingClientRect();",
    `var c={x:${x},y:${y},scale:Math.min(${limits.maxZoom},Math.max(${limits.minZoom},Math.min(280,Math.max(130,r.width/6))/${layout.pitch}))};`,
    "var h=history.state,k=h&&h.key?h.key:'default',s=JSON.parse(sessionStorage.getItem(" +
      JSON.stringify(storagePrefix) +
      (fixedKey ? "" : "+k") +
      ")||'null');",
    `if(s&&isFinite(s.x)&&isFinite(s.y)&&s.scale>=${limits.minZoom}&&s.scale<=${limits.maxZoom})c=s;`,
    "w.style.transform='translate3d('+(-c.x*c.scale)+'px,'+(-c.y*c.scale)+'px,0) scale('+c.scale+')';",
    "w.style.setProperty('--s',String(c.scale));",
    `w.toggleAttribute('data-far',c.scale*${layout.tile}<${FAR_TILE_PX});`,
    "}catch(e){}})();",
  ].join("");
}

/** World size of the pattern (all cells, including the brick offset). */
export function patternBounds(layout: CanvasLayout) {
  return {
    x: 0,
    y: 0,
    width: (layout.cols - 1) * layout.pitch + layout.tile + layout.rowOffset * layout.pitch,
    height: (layout.rows - 1) * layout.pitch + layout.tile,
  };
}

/**
 * Lowest zoom for a finite wall: whole on a laptop screen (about 1280 × 720 px), so it can be
 * seen at once there (on a phone, mostly). The endless wall keeps the configured limit.
 */
export function finiteMinZoom(layout: CanvasLayout, configured: number): number {
  if (layout.wrap) return configured;
  const { width, height } = patternBounds(layout);
  return Math.min(configured, 0.9 * Math.min(1280 / width, 720 / height));
}

/** Where a canvas starts without a remembered position: in the middle, at the reading zoom. */
export function initialCamera(layout: CanvasLayout, viewport: Size, limits: ZoomLimits): Camera {
  // Middle of the pattern, snapped to the centre of a cell so the view looks composed.
  const row = Math.floor(layout.rows / 2);
  const col = Math.floor((layout.cols - 1) / 2);
  const shift = row % 2 === 1 ? layout.rowOffset * layout.pitch : 0;
  return {
    x: col * layout.pitch + shift + layout.tile / 2,
    y: row * layout.pitch + layout.tile / 2,
    scale: defaultScale(layout, viewport, limits),
  };
}

/**
 * Without wrap, keep the camera centre within the pattern, so it can't be panned into the void.
 * With wrap every position is valid.
 */
export function constrainCamera(layout: CanvasLayout, camera: Camera): Camera {
  if (layout.wrap) return camera;
  const { width, height } = patternBounds(layout);
  return { ...camera, x: clamp(camera.x, 0, width), y: clamp(camera.y, 0, height) };
}

/**
 * Smallest pan that brings a world rectangle fully into the safe area of the viewport
 * (the part not covered by floating UI, WCAG 2.4.11). A rectangle larger than the safe
 * area is centred in it.
 */
export function revealRect(
  camera: Camera,
  viewport: Size,
  insets: Insets,
  rect: { x: number; y: number; width: number; height: number },
): Camera {
  const { scale } = camera;
  const topLeft = worldToScreen(camera, viewport, rect.x, rect.y);
  const width = rect.width * scale;
  const height = rect.height * scale;

  const axis = (start: number, size: number, min: number, max: number) => {
    if (size > max - min) return (min + max) / 2 - (start + size / 2);
    if (start < min) return min - start;
    if (start + size > max) return max - (start + size);
    return 0;
  };
  const dx = axis(topLeft.x, width, insets.left, viewport.width - insets.right);
  const dy = axis(topLeft.y, height, insets.top, viewport.height - insets.bottom);
  if (dx === 0 && dy === 0) return camera;
  return { ...camera, x: camera.x - dx / scale, y: camera.y - dy / scale };
}

export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Interpolates position linearly and zoom geometrically (feels even when zooming). */
export function lerpCamera(from: Camera, to: Camera, t: number): Camera {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    scale: from.scale * (to.scale / from.scale) ** t,
  };
}
