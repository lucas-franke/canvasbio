import { describe, expect, it } from "vitest";

import {
  cellCenter,
  cellNear,
  cellOrigin,
  createLayout,
  inRange,
  nearestInstance,
  neighbor,
  personAt,
  seededShuffle,
  tileVariation,
  visibleRange,
  type CanvasLayout,
  type Cell,
} from "./layout";

const options = { tileSize: 100, gap: 20, rowOffset: 0.5, wrap: true };

/** Cells around `cell` (brick neighbours: same row ±1, rows above/below overlapping). */
function neighbours(layout: CanvasLayout, { col, row }: Cell): Cell[] {
  const shifted = ((row % 2) + 2) % 2 === 1;
  const vertical = shifted ? [col, col + 1] : [col - 1, col];
  return [
    { col: col - 1, row },
    { col: col + 1, row },
    ...vertical.flatMap((c) => [
      { col: c, row: row - 1 },
      { col: c, row: row + 1 },
    ]),
  ];
}

describe("createLayout", () => {
  it.each([1, 2, 5, 7, 97, 200, 499])("places every one of %i people at least once", (count) => {
    const layout = createLayout(count, options);
    expect(layout.cells).toHaveLength(layout.cols * layout.rows);
    expect(new Set(layout.cells).size).toBe(count);
    expect(layout.cells.every((p) => p >= 0 && p < count)).toBe(true);
  });

  it("uses an even number of rows when wrapping, so the brick offset continues", () => {
    for (const count of [3, 7, 51, 200, 333]) {
      expect(createLayout(count, options).rows % 2).toBe(0);
    }
  });

  it("keeps filler cells few and the pattern roughly landscape", () => {
    const layout = createLayout(200, options);
    expect(layout.cols * layout.rows - 200).toBeLessThan(layout.cols);
    expect(layout.cols / layout.rows).toBeGreaterThan(1);
    expect(layout.cols / layout.rows).toBeLessThan(2.2);
  });

  it("never puts the same person next to itself, also across the wrap seam", () => {
    for (const count of [37, 200, 499]) {
      const layout = createLayout(count, options);
      for (let row = -1; row <= layout.rows; row++) {
        for (let col = -1; col <= layout.cols; col++) {
          const person = personAt(layout, { col, row });
          for (const other of neighbours(layout, { col, row })) {
            expect(personAt(layout, other)).not.toBe(person);
          }
        }
      }
    }
  });
});

describe("personAt", () => {
  it("repeats the pattern endlessly with wrap", () => {
    const layout = createLayout(50, options);
    const cell = { col: 3, row: 4 };
    const copy = { col: 3 - 5 * layout.cols, row: 4 + 3 * layout.rows };
    expect(personAt(layout, copy)).toBe(personAt(layout, cell));
  });

  it("is empty outside the pattern without wrap", () => {
    const layout = createLayout(50, { ...options, wrap: false });
    expect(personAt(layout, { col: -1, row: 0 })).toBeUndefined();
    expect(personAt(layout, { col: 0, row: layout.rows })).toBeUndefined();
    expect(personAt(layout, { col: 0, row: 0 })).toBe(0);
  });
});

describe("geometry", () => {
  const layout = createLayout(200, options);

  it("shifts odd rows (also negative ones) by the row offset", () => {
    expect(cellOrigin(layout, { col: 2, row: 0 })).toEqual({ x: 240, y: 0 });
    expect(cellOrigin(layout, { col: 2, row: 1 })).toEqual({ x: 300, y: 120 });
    expect(cellOrigin(layout, { col: 2, row: -1 })).toEqual({ x: 300, y: -120 });
  });

  it("finds the cell nearest to a point", () => {
    for (const cell of [
      { col: 0, row: 0 },
      { col: -3, row: 5 },
      { col: 7, row: -2 },
    ]) {
      const { x, y } = cellCenter(layout, cell);
      expect(cellNear(layout, x + 10, y - 10)).toEqual(cell);
    }
  });
});

describe("visibleRange", () => {
  const layout = createLayout(200, options);
  const viewport = { width: 1000, height: 600 };

  it("covers every cell that intersects the viewport", () => {
    const camera = { x: 333, y: -77, scale: 0.8 };
    const range = visibleRange(layout, camera, viewport, 0);
    const halfW = viewport.width / 2 / camera.scale;
    const halfH = viewport.height / 2 / camera.scale;
    for (let row = range.row0 - 3; row <= range.row1 + 3; row++) {
      for (let col = range.col0 - 3; col <= range.col1 + 3; col++) {
        const { x, y } = cellOrigin(layout, { col, row });
        const intersects =
          x + layout.tile > camera.x - halfW &&
          x < camera.x + halfW &&
          y + layout.tile > camera.y - halfH &&
          y < camera.y + halfH;
        if (intersects) expect(inRange(range, { col, row })).toBe(true);
      }
    }
  });

  it("adds overscan and grows when zooming out", () => {
    const camera = { x: 0, y: 0, scale: 1 };
    const tight = visibleRange(layout, camera, viewport, 0);
    const loose = visibleRange(layout, camera, viewport, 1);
    expect(loose.col0).toBe(tight.col0 - 1);
    expect(loose.row1).toBe(tight.row1 + 1);
    const out = visibleRange(layout, { ...camera, scale: 0.5 }, viewport, 0);
    expect(out.col1 - out.col0).toBeGreaterThan(tight.col1 - tight.col0);
  });

  it("is limited to the pattern without wrap", () => {
    const bounded = createLayout(20, { ...options, wrap: false });
    const range = visibleRange(bounded, { x: 0, y: 0, scale: 0.4 }, viewport, 2);
    expect(range.col0).toBe(0);
    expect(range.row0).toBe(0);
    expect(range.col1).toBeLessThan(bounded.cols);
  });
});

describe("neighbor", () => {
  const layout = createLayout(200, options);

  it("moves sideways within a row", () => {
    expect(neighbor(layout, { col: 4, row: 3 }, "left")).toEqual({ col: 3, row: 3 });
    expect(neighbor(layout, { col: 4, row: 3 }, "right")).toEqual({ col: 5, row: 3 });
  });

  it("zig-zags up and down without drifting", () => {
    const start = { col: 4, row: 2 };
    const goalX = cellCenter(layout, start).x;
    let cell: Cell = start;
    for (let i = 0; i < 6; i++) cell = neighbor(layout, cell, "down", goalX)!;
    expect(cell).toEqual({ col: 4, row: 8 });
    for (let i = 0; i < 6; i++) cell = neighbor(layout, cell, "up", goalX)!;
    expect(cell).toEqual(start);
  });

  it("stops at the edge without wrap", () => {
    const bounded = createLayout(20, { ...options, wrap: false });
    expect(neighbor(bounded, { col: 0, row: 0 }, "left")).toBeNull();
    expect(neighbor(bounded, { col: 0, row: 0 }, "up")).toBeNull();
    expect(neighbor(bounded, { col: 0, row: 0 }, "right")).toEqual({ col: 1, row: 0 });
  });
});

describe("nearestInstance", () => {
  const layout = createLayout(200, options);

  it("finds the copy of a person closest to a point", () => {
    const far = { col: 3 + 4 * layout.cols, row: 2 - 6 * layout.rows };
    const person = personAt(layout, far)!;
    const { x, y } = cellCenter(layout, far);
    const found = nearestInstance(layout, person, x + 30, y + 30)!;
    expect(personAt(layout, found)).toBe(person);
    expect(found).toEqual(far);
  });
});

describe("seededShuffle", () => {
  it("is deterministic and a permutation", () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const a = seededShuffle(items, "canvas");
    expect(seededShuffle(items, "canvas")).toEqual(a);
    expect(seededShuffle(items, "other")).not.toEqual(a);
    expect([...a].sort((x, y) => x - y)).toEqual(items);
  });
});

describe("tileVariation", () => {
  const layout = createLayout(40, { tileSize: 200, gap: 40, rowOffset: 0.5, wrap: true });

  it("varies size and position slightly, staying inside the cell", () => {
    const variations = Array.from({ length: layout.cols * layout.rows }, (_, i) =>
      tileVariation(layout, { col: i % layout.cols, row: Math.floor(i / layout.cols) }, 0.2),
    );
    expect(new Set(variations.map((v) => v.scale)).size).toBeGreaterThan(10);
    for (const { scale, dx, dy } of variations) {
      expect(scale).toBeGreaterThanOrEqual(0.8);
      expect(scale).toBeLessThanOrEqual(1);
      const margin = ((1 - scale) / 2) * 200;
      expect(Math.abs(dx)).toBeLessThanOrEqual(margin + 0.5);
      expect(Math.abs(dy)).toBeLessThanOrEqual(margin + 0.5);
    }
  });

  it("is the same for copies of the pattern and off without variance", () => {
    const cell = { col: 3, row: 2 };
    const copy = { col: 3 + layout.cols, row: 2 - layout.rows };
    expect(tileVariation(layout, copy, 0.2)).toEqual(tileVariation(layout, cell, 0.2));
    expect(tileVariation(layout, cell, 0)).toEqual({ scale: 1, dx: 0, dy: 0 });
  });
});
