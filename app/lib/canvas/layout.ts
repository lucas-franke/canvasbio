/**
 * Geometry of the portrait canvas (pure functions, no DOM).
 *
 * People are laid out in a brick pattern of `cols × rows` cells (odd rows shifted by
 * `rowOffset` of a cell). With `wrap` the pattern repeats endlessly in every direction,
 * like a torus; otherwise the canvas ends at the pattern's edges.
 *
 * World coordinates are CSS pixels at zoom 1. A cell (col, row) may lie outside the pattern
 * (negative or ≥ cols/rows); `personAt` maps it back via modulo.
 */

export interface LayoutOptions {
  tileSize: number;
  gap: number;
  /** Shift of every odd row as a fraction of the cell pitch (0–1). */
  rowOffset: number;
  wrap: boolean;
  /** Preferred width/height ratio of the pattern. */
  aspect?: number;
}

export interface CanvasLayout {
  tile: number;
  pitch: number;
  rowOffset: number;
  wrap: boolean;
  cols: number;
  rows: number;
  /** Person index for every pattern cell, row by row (length cols × rows). */
  cells: number[];
  count: number;
}

export interface Cell {
  col: number;
  row: number;
}

export interface Camera {
  /** World point shown at the center of the viewport. */
  x: number;
  y: number;
  scale: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CellRange {
  col0: number;
  col1: number;
  row0: number;
  row1: number;
}

export const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Math.round without negative zero (cells are used as keys and compared deeply). */
const roundInt = (value: number) => Math.round(value) || 0;

/**
 * Pattern size for `count` people: close to the preferred aspect ratio, few filler cells,
 * and an even row count when wrapping (so the brick offset continues across the seam).
 */
function patternSize(count: number, aspect: number, wrap: boolean): { cols: number; rows: number } {
  const ideal = Math.max(1, Math.round(Math.sqrt(count * aspect)));
  let best = { cols: 1, rows: 1, score: Infinity };
  for (let cols = Math.max(1, ideal - 4); cols <= ideal + 4; cols++) {
    let rows = Math.max(1, Math.ceil(count / cols));
    if (wrap && rows % 2 === 1 && count > 1) rows += 1;
    const fillers = cols * rows - count;
    const aspectError = Math.abs(Math.log(cols / rows / aspect));
    const score = fillers / count + aspectError;
    if (score < best.score) best = { cols, rows, score };
  }
  return { cols: best.cols, rows: best.rows };
}

export function createLayout(count: number, options: LayoutOptions): CanvasLayout {
  const { tileSize, gap, rowOffset, wrap, aspect = 1.5 } = options;
  const { cols, rows } = count > 0 ? patternSize(count, aspect, wrap) : { cols: 1, rows: 1 };
  const total = cols * rows;
  const cells = Array.from({ length: total }, (_, i) => i);
  if (count > 0) {
    // Filler cells (the end of the last rows) repeat people from the middle of the pattern:
    // half the pattern height away, so a person and their duplicate are never neighbours.
    const shift = Math.floor(rows / 2) * cols;
    for (let i = count; i < total; i++) cells[i] = mod(i - shift, count);
  }
  return {
    tile: tileSize,
    pitch: tileSize + gap,
    rowOffset,
    wrap,
    cols,
    rows,
    cells: count > 0 ? cells : [],
    count,
  };
}

const rowShift = (layout: CanvasLayout, row: number) =>
  mod(row, 2) === 1 ? layout.rowOffset * layout.pitch : 0;

/** Top-left corner of a cell in world coordinates. */
export function cellOrigin(layout: CanvasLayout, { col, row }: Cell) {
  return { x: col * layout.pitch + rowShift(layout, row), y: row * layout.pitch };
}

export function cellCenter(layout: CanvasLayout, cell: Cell) {
  const { x, y } = cellOrigin(layout, cell);
  return { x: x + layout.tile / 2, y: y + layout.tile / 2 };
}

export function inPattern(layout: CanvasLayout, { col, row }: Cell): boolean {
  return col >= 0 && col < layout.cols && row >= 0 && row < layout.rows;
}

/** Person index shown in a cell, or undefined outside a non-wrapping canvas. */
export function personAt(layout: CanvasLayout, cell: Cell): number | undefined {
  if (layout.count === 0) return undefined;
  if (!layout.wrap && !inPattern(layout, cell)) return undefined;
  return layout.cells[mod(cell.row, layout.rows) * layout.cols + mod(cell.col, layout.cols)];
}

/** World rectangle covered by the viewport. */
export function visibleWorld(camera: Camera, viewport: Size) {
  const halfW = viewport.width / 2 / camera.scale;
  const halfH = viewport.height / 2 / camera.scale;
  return { left: camera.x - halfW, right: camera.x + halfW, top: camera.y - halfH, bottom: camera.y + halfH };
}

/** Cells that intersect the viewport, plus `overscan` cells on every side. */
export function visibleRange(layout: CanvasLayout, camera: Camera, viewport: Size, overscan = 1): CellRange {
  const { left, right, top, bottom } = visibleWorld(camera, viewport);
  const { pitch, tile } = layout;
  const maxShift = layout.rowOffset * pitch;
  let range: CellRange = {
    col0: Math.floor((left - tile - maxShift) / pitch) + 1 - overscan,
    col1: Math.ceil(right / pitch) - 1 + overscan,
    row0: Math.floor((top - tile) / pitch) + 1 - overscan,
    row1: Math.ceil(bottom / pitch) - 1 + overscan,
  };
  if (!layout.wrap) {
    range = {
      col0: Math.max(range.col0, 0),
      col1: Math.min(range.col1, layout.cols - 1),
      row0: Math.max(range.row0, 0),
      row1: Math.min(range.row1, layout.rows - 1),
    };
  }
  return range;
}

export const sameRange = (a: CellRange, b: CellRange) =>
  a.col0 === b.col0 && a.col1 === b.col1 && a.row0 === b.row0 && a.row1 === b.row1;

export const inRange = (range: CellRange, { col, row }: Cell) =>
  col >= range.col0 && col <= range.col1 && row >= range.row0 && row <= range.row1;

/** Cell whose center is closest to a world point. */
export function cellNear(layout: CanvasLayout, x: number, y: number): Cell {
  const { pitch, tile } = layout;
  let row = roundInt((y - tile / 2) / pitch);
  if (!layout.wrap) row = clamp(row, 0, layout.rows - 1);
  let col = roundInt((x - tile / 2 - rowShift(layout, row)) / pitch);
  if (!layout.wrap) col = clamp(col, 0, layout.cols - 1);
  return { col, row };
}

export type Direction = "left" | "right" | "up" | "down";

/**
 * Neighbouring cell for keyboard navigation. Moving up/down keeps a goal x (like a text
 * cursor keeps its column), so zig-zagging through the brick rows doesn't drift sideways.
 * Returns null at the edge of a non-wrapping canvas.
 */
export function neighbor(
  layout: CanvasLayout,
  cell: Cell,
  direction: Direction,
  goalX?: number,
): Cell | null {
  let next: Cell;
  if (direction === "left" || direction === "right") {
    next = { col: cell.col + (direction === "left" ? -1 : 1), row: cell.row };
  } else {
    const row = cell.row + (direction === "up" ? -1 : 1);
    const x = goalX ?? cellCenter(layout, cell).x;
    const col = roundInt((x - layout.tile / 2 - rowShift(layout, row)) / layout.pitch);
    next = { col, row };
  }
  if (!layout.wrap && !inPattern(layout, next)) return null;
  return next;
}

/** The instance of a person closest to a world point (with wrap there are infinitely many). */
export function nearestInstance(layout: CanvasLayout, person: number, x: number, y: number): Cell | null {
  const near = cellNear(layout, x, y);
  let best: Cell | null = null;
  let bestDistance = Infinity;
  for (let index = 0; index < layout.cells.length; index++) {
    if (layout.cells[index] !== person) continue;
    const baseCol = index % layout.cols;
    const baseRow = Math.floor(index / layout.cols);
    // Candidate copies of this pattern cell around the reference point.
    const rowCopies = layout.wrap ? copiesNear(baseRow, near.row, layout.rows) : [baseRow];
    const colCopies = layout.wrap ? copiesNear(baseCol, near.col, layout.cols) : [baseCol];
    for (const row of rowCopies) {
      for (const col of colCopies) {
        const center = cellCenter(layout, { col, row });
        const distance = (center.x - x) ** 2 + (center.y - y) ** 2;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { col, row };
        }
      }
    }
  }
  return best;
}

/** Copies of `base` (period `n`) on either side of `target`. */
function copiesNear(base: number, target: number, n: number): number[] {
  const k = Math.floor((target - base) / n);
  return [base + (k - 1) * n, base + k * n, base + (k + 1) * n, base + (k + 2) * n];
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Deterministic shuffle (mulberry32), so pre-rendering and the browser agree on the order
 * and the canvas looks the same on every visit.
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
