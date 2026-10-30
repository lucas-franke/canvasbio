import { FAR_TILE_PX } from "~/lib/canvas/camera";
import {
  cellOrigin,
  personAt,
  tileVariation,
  visibleRange,
  type Camera,
  type CanvasLayout,
  type Cell,
  type Size,
} from "~/lib/canvas/layout";
import { imageWidthFor, TileImages } from "~/lib/canvas/tile-images";
import { TORN_PATH_SIZE, TORN_VARIANTS, tornEdgePath, tornVariantOf } from "~/lib/canvas/torn-edge";
import type { PersonListItem } from "~/lib/content/adapter";

/**
 * Draws the portrait wall into one <canvas>: the tiles in view, straight from the camera,
 * outside React. Replaces hundreds of <img> elements (and their layers, decoding and
 * repaints on zoom) with one bitmap. The DOM keeps a transparent link per tile on top, for
 * focus, keyboard, screen readers and taps; this only paints what they look like.
 */

export interface PainterOptions {
  layout: CanvasLayout;
  /** People in wall order (layout cells index into it). */
  people: readonly PersonListItem[];
  /** canvas.sizeVariance */
  variance: number;
  torn: boolean;
  /** Names on the tiles (not on the decorative backdrop seen from afar). */
  names: boolean;
}

export interface PainterState {
  /** Slugs of the search matches (the others are dimmed), or null without a search. */
  hits: ReadonlySet<string> | null;
  /** Tile under the mouse (its portrait zooms in slightly). */
  hover: Cell | null;
}

/** Device pixel ratio for drawing: beyond 2 the difference on a small tile isn't visible. */
const MAX_DPR = 2;
const PULSE_MS = 550;
/** The tile under the mouse grows a little (the torn edge is part of the image). */
const HOVER_ZOOM = 1.04;
const HIT_LIFT = 1.08;
const MISS_OPACITY = 0.18;

interface Theme {
  stage: string;
  stageForeground: string;
  tint: { color: string; blend: GlobalCompositeOperation; opacity: number } | null;
  font: string;
}

function readTheme(): Theme {
  const root = getComputedStyle(document.documentElement);
  const token = (name: string) => root.getPropertyValue(name).trim();
  const tinted = document.documentElement.hasAttribute("data-portrait-tint");
  return {
    stage: token("--c-stage") || "#101113",
    stageForeground: token("--c-stage-foreground") || "#ffffff",
    tint:
      tinted && token("--tint-color")
        ? {
            color: token("--tint-color"),
            blend: (token("--tint-blend") || "soft-light") as GlobalCompositeOperation,
            opacity: Number(token("--tint-opacity") || 1),
          }
        : null,
    font: getComputedStyle(document.body).fontFamily || "sans-serif",
  };
}

/** A CSS colour as [r, g, b] (via a canvas, which normalises any colour syntax). */
function rgbOf(ctx: CanvasRenderingContext2D, color: string): [number, number, number] {
  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  const value = ctx.fillStyle;
  if (value.startsWith("#")) {
    const n = parseInt(value.slice(1, 7), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  const [r = 0, g = 0, b = 0] = value.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
  return [r, g, b];
}

const rgba = ([r, g, b]: [number, number, number], a: number) => `rgba(${r},${g},${b},${a})`;

/** Breaks a name into at most `max` lines of `width` px, the last one ending in "…" if cut. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i]!;
    if (ctx.measureText(next).width <= width || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = words[i]!;
    if (lines.length === max - 1) {
      // Last line: the rest, shortened with an ellipsis if needed.
      let rest = words.slice(i).join(" ");
      if (ctx.measureText(rest).width > width) {
        while (rest.length > 1 && ctx.measureText(`${rest}…`).width > width) rest = rest.slice(0, -1);
        rest = `${rest.trimEnd()}…`;
      }
      lines.push(rest);
      return lines;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export class WallPainter {
  private ctx: CanvasRenderingContext2D;
  private images: TileImages;
  private camera: Camera = { x: 0, y: 0, scale: 1 };
  private size: Size = { width: 0, height: 0 };
  private state: PainterState = { hits: null, hover: null };
  private theme: Theme;
  private masks: Path2D[];
  private placeholders = new Map<string, string>();
  private names = new Map<string, string[]>();
  private pulse: { cell: Cell; start: number } | null = null;
  private frame = 0;
  private disposed = false;
  /** Called once the view is fully drawn with portraits (or after a while), then never again. */
  onComplete?: () => void;

  constructor(
    private canvas: HTMLCanvasElement,
    private options: PainterOptions,
  ) {
    this.ctx = canvas.getContext("2d", { alpha: true })!;
    this.theme = readTheme();
    this.masks = Array.from({ length: TORN_VARIANTS }, (_, i) => new Path2D(tornEdgePath(i)));
    this.images = new TileImages(
      (image, width, slug) => this.compose(image, width, slug),
      () => this.invalidate(),
    );
    // Names are measured in the page font: once it is there, measure and draw again.
    void document.fonts?.ready.then(() => {
      this.names.clear();
      this.invalidate();
    });
    setTimeout(() => this.complete(), 1500);
  }

  setCamera(camera: Camera, size: Size) {
    this.camera = camera;
    this.size = size;
    this.invalidate();
  }

  setState(state: Partial<PainterState>) {
    this.state = { ...this.state, ...state };
    this.invalidate();
  }

  /** "Random biography": the tile pulses once. */
  startPulse(cell: Cell) {
    this.pulse = { cell, start: performance.now() };
    this.invalidate();
  }

  /** Light/dark mode changed: new colours, and the tint is composed into the images anew. */
  refreshTheme() {
    this.theme = readTheme();
    this.placeholders.clear();
    this.images.clear();
    this.invalidate();
  }

  /**
   * The portrait of a tile as an element inside `host` (marked data-vt-portrait), for the
   * shared-element view transition to the biography. Drawn at once from the loaded image.
   */
  snapshotInto(host: HTMLElement, cell: Cell): HTMLCanvasElement | null {
    const index = personAt(this.options.layout, cell);
    const person = index === undefined ? undefined : this.options.people[index];
    if (!person) return null;
    const width = imageWidthFor(this.options.layout.tile * this.camera.scale * this.dpr());
    const image = this.images.get(person.slug, person.image.hash, width, 0);
    const snapshot = document.createElement("canvas");
    snapshot.width = snapshot.height = image?.width ?? 2;
    const ctx = snapshot.getContext("2d")!;
    if (image) ctx.drawImage(image, 0, 0);
    else {
      ctx.fillStyle = this.placeholder(person);
      ctx.fillRect(0, 0, 2, 2);
    }
    snapshot.setAttribute("data-vt-portrait", "");
    snapshot.setAttribute("aria-hidden", "true");
    snapshot.className = "canvas-snapshot";
    host.append(snapshot);
    return snapshot;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.images.dispose();
  }

  private dpr() {
    return Math.min(MAX_DPR, window.devicePixelRatio || 1);
  }

  private invalidate() {
    if (this.disposed || this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.draw();
    });
  }

  private complete() {
    const done = this.onComplete;
    this.onComplete = undefined;
    done?.();
  }

  /** The image file composed into a tile: crop (already square), tint, torn edge. */
  private compose(image: HTMLImageElement, width: number, slug: string): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = width;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0, width, width);
    const { tint } = this.theme;
    if (tint) {
      // Like the CSS: linear-gradient(160deg, tint 0 %, tint/35 % 45 %, transparent 85 %).
      const angle = (160 * Math.PI) / 180;
      const dx = Math.sin(angle);
      const dy = -Math.cos(angle);
      const half = ((Math.abs(dx) + Math.abs(dy)) * width) / 2;
      const c = width / 2;
      const gradient = ctx.createLinearGradient(c - dx * half, c - dy * half, c + dx * half, c + dy * half);
      const rgb = rgbOf(ctx, tint.color);
      gradient.addColorStop(0, rgba(rgb, 1));
      gradient.addColorStop(0.45, rgba(rgb, 0.35));
      gradient.addColorStop(0.85, rgba(rgb, 0));
      ctx.globalCompositeOperation = tint.blend;
      ctx.globalAlpha = tint.opacity;
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, width);
      ctx.globalAlpha = 1;
    }
    if (this.options.torn) {
      ctx.globalCompositeOperation = "destination-in";
      // Opaque fill: the mask keeps exactly the torn shape (not the tint gradient's alpha).
      ctx.fillStyle = "#000";
      ctx.scale(width / TORN_PATH_SIZE, width / TORN_PATH_SIZE);
      // Per person (each is on the finite wall once), as in the list and the biography.
      ctx.fill(this.masks[tornVariantOf(slug)]!);
    }
    return canvas;
  }

  /** Until the portrait is there: its main colour, darkened, so it reads as a tile. */
  private placeholder(person: PersonListItem) {
    let color = this.placeholders.get(person.slug);
    if (!color) {
      const [r, g, b] = rgbOf(this.ctx, person.image.color);
      const [sr, sg, sb] = rgbOf(this.ctx, this.theme.stage);
      const mix = (a: number, s: number) => Math.round(a * 0.7 + s * 0.3);
      color = `rgb(${mix(r, sr)},${mix(g, sg)},${mix(b, sb)})`;
      this.placeholders.set(person.slug, color);
    }
    return color;
  }

  private pulseScale(cell: Cell, now: number) {
    const pulse = this.pulse;
    if (!pulse || pulse.cell.col !== cell.col || pulse.cell.row !== cell.row) return 1;
    const t = (now - pulse.start) / PULSE_MS;
    if (t >= 1) return 1;
    const ease = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;
    return 1 + 0.12 * (t < 0.4 ? ease(t / 0.4) : ease((1 - t) / 0.6));
  }

  private draw() {
    const { ctx, canvas, camera, size, options, state, theme } = this;
    const { layout, people } = options;
    const dpr = this.dpr();
    const width = Math.round(size.width * dpr);
    const height = Math.round(size.height * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    if (size.width === 0 || layout.count === 0) return;

    const s = camera.scale;
    const ox = size.width / 2 - camera.x * s;
    const oy = size.height / 2 - camera.y * s;
    const tilePx = layout.tile * s;
    const far = tilePx < FAR_TILE_PX;
    const fileWidth = imageWidthFor(tilePx * dpr);
    const now = performance.now();
    const centerX = size.width / 2;
    const centerY = size.height / 2;

    // Name style as in the CSS (constant on screen, see .canvas-tile-name).
    const fontSize = Math.min(21, Math.max(12, 18 * s));
    const lineHeight = fontSize * 1.2;
    const showNames = options.names && !far;
    if (showNames) {
      ctx.font = `500 ${fontSize}px ${theme.font}`;
      ctx.textBaseline = "top";
    }
    const stageRgb = rgbOf(ctx, theme.stage);

    this.images.beginFrame();
    const range = visibleRange(layout, camera, size, 0);
    // One ring around the view is loaded ahead (low priority), not drawn.
    const ahead = visibleRange(layout, camera, size, 1);
    const pulsing = this.pulse !== null && now - this.pulse.start < PULSE_MS;
    if (!pulsing) this.pulse = null;

    for (let row = ahead.row0; row <= ahead.row1; row++) {
      for (let col = ahead.col0; col <= ahead.col1; col++) {
        const cell = { col, row };
        const index = personAt(layout, cell);
        if (index === undefined) continue;
        const person = people[index]!;
        const origin = cellOrigin(layout, cell);
        const inView = row >= range.row0 && row <= range.row1 && col >= range.col0 && col <= range.col1;
        const cx = ox + (origin.x + layout.tile / 2) * s;
        const cy = oy + (origin.y + layout.tile / 2) * s;
        const distance = Math.hypot(cx - centerX, cy - centerY);
        if (!inView) {
          this.images.want(person.slug, person.image.hash, fileWidth, 1e6 + distance);
          continue;
        }

        const variation = tileVariation(layout, cell, options.variance);
        const hit = state.hits?.has(person.slug) ?? false;
        const miss = state.hits !== null && !hit;
        const hover = !far && state.hover?.col === col && state.hover?.row === row;
        const scale =
          variation.scale * (hit ? HIT_LIFT : 1) * (hover ? HOVER_ZOOM : 1) * this.pulseScale(cell, now);
        const side = layout.tile * scale * s;
        const x = cx + variation.dx * s - side / 2;
        const y = cy + variation.dy * s - side / 2;

        const image = this.images.get(person.slug, person.image.hash, fileWidth, distance);
        ctx.globalAlpha = miss ? MISS_OPACITY : 1;
        if (hit && !far) {
          ctx.shadowColor = "rgba(0,0,0,0.35)";
          ctx.shadowOffsetY = 6;
          ctx.shadowBlur = 10;
        }
        if (image) {
          ctx.drawImage(image, x, y, side, side);
        } else {
          ctx.fillStyle = this.placeholder(person);
          ctx.fillRect(x, y, side, side);
        }
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        if (showNames && !miss) this.drawName(person, x, y, side, fontSize, lineHeight, stageRgb);
        ctx.globalAlpha = 1;
      }
    }
    this.images.endFrame();
    if (pulsing) this.invalidate();
    if (this.images.settled) this.complete();
  }

  /** Name on a dark gradient at the bottom of the tile (contrast regardless of the photo). */
  private drawName(
    person: PersonListItem,
    x: number,
    y: number,
    side: number,
    fontSize: number,
    lineHeight: number,
    stage: [number, number, number],
  ) {
    const { ctx } = this;
    const padX = 10;
    const maxWidth = side - 2 * padX;
    if (maxWidth < fontSize * 2) return;
    const key = `${person.slug}|${Math.round(fontSize * 10)}|${Math.round(maxWidth)}`;
    let lines = this.names.get(key);
    if (!lines) {
      lines = wrapText(ctx, person.name.display, maxWidth, 3);
      this.names.set(key, lines);
    }
    const boxHeight = Math.min(side, 20 + lines.length * lineHeight + 8);
    const top = y + side - boxHeight;
    const gradient = ctx.createLinearGradient(0, y + side, 0, top);
    gradient.addColorStop(0, rgba(stage, 1));
    gradient.addColorStop(0.5, rgba(stage, 0.8));
    gradient.addColorStop(1, rgba(stage, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(x, top, side, boxHeight);
    ctx.fillStyle = this.theme.stageForeground;
    lines.forEach((line, i) => ctx.fillText(line, x + padX, top + 20 + i * lineHeight, maxWidth));
  }
}
