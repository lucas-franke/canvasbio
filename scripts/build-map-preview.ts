/**
 * The map view's placeholder: the land of public/map/land.json as one small SVG path in
 * Web Mercator (the map's projection), shown as a mask in the theme's land colour until
 * MapLibre and the basemap (~700 KB) have loaded. Simplified hard, since it is seen for
 * a moment and at world scale only.
 *
 *   npx tsx scripts/build-map-preview.ts
 *
 * A one-off generator like build-basemap.ts (run it after that one); the result is committed.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** Side of the square viewBox: the whole Mercator world (lat ±85.05°). */
const SIZE = 1024;
/** Douglas–Peucker tolerance in viewBox units (~1 px at the map's first zoom). */
const TOLERANCE = 0.9;
/** Rings smaller than this (square viewBox units) are left out: specks at world scale. */
const MIN_AREA = 1.5;
const MAX_LAT = 85.0511;

type Point = [number, number];

const project = ([lng, lat]: number[]): Point => {
  const clamped = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat!));
  const rad = (clamped * Math.PI) / 180;
  return [
    ((lng! + 180) / 360) * SIZE,
    ((1 - Math.log(Math.tan(Math.PI / 4 + rad / 2)) / Math.PI) / 2) * SIZE,
  ];
};

/** Ramer–Douglas–Peucker on an open polyline. */
function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    const [ax, ay] = points[first]!;
    const [bx, by] = points[last]!;
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy) || 1;
    let worst = -1;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const [px, py] = points[i]!;
      const distance = Math.abs(dy * px - dx * py + bx * ay - by * ax) / length;
      if (distance > worst) {
        worst = distance;
        index = i;
      }
    }
    if (worst > tolerance) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * A closed ring (first point = last) has no line to measure against: it is simplified as
 * two halves, split at the point farthest from the start.
 */
function simplifyRing(ring: Point[], tolerance: number): Point[] {
  const [sx, sy] = ring[0]!;
  let far = 0;
  ring.forEach(([x, y], i) => {
    if (Math.hypot(x - sx, y - sy) > Math.hypot(ring[far]![0] - sx, ring[far]![1] - sy)) far = i;
  });
  if (far === 0) return [];
  return [
    ...simplify(ring.slice(0, far + 1), tolerance).slice(0, -1),
    ...simplify(ring.slice(far), tolerance),
  ];
}

const area = (ring: Point[]) =>
  Math.abs(
    ring.reduce((sum, [x, y], i) => {
      const [nx, ny] = ring[(i + 1) % ring.length]!;
      return sum + x * ny - nx * y;
    }, 0),
  ) / 2;

/** A ring as relative path commands with integer steps (coordinates rounded first). */
function pathOf(ring: Point[]): string {
  const rounded = ring.map(([x, y]) => [Math.round(x), Math.round(y)] as Point);
  const steps: string[] = [];
  let [px, py] = rounded[0]!;
  for (const [x, y] of rounded.slice(1)) {
    if (x === px && y === py) continue;
    steps.push(`${x - px} ${y - py}`);
    [px, py] = [x, y];
  }
  return steps.length < 2 ? "" : `M${rounded[0]![0]} ${rounded[0]![1]}l${steps.join(" ")}z`;
}

const land = JSON.parse(await readFile(path.resolve("public/map/land.json"), "utf8")) as {
  features: { geometry: { type: string; coordinates: unknown } }[];
};
const rings = land.features.flatMap(({ geometry }) =>
  geometry.type === "Polygon"
    ? (geometry.coordinates as number[][][])
    : geometry.type === "MultiPolygon"
      ? (geometry.coordinates as number[][][][]).flat()
      : [],
);
let kept = 0;
const d = rings
  .map((ring) => ring.map(project))
  .filter((ring) => area(ring) >= MIN_AREA)
  .map((ring) => {
    const path = pathOf(simplifyRing(ring, TOLERANCE));
    if (path) kept++;
    return path;
  })
  .join("");

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">` +
  `<path fill-rule="evenodd" d="${d}"/></svg>\n`;
await writeFile(path.resolve("public/map/preview.svg"), svg);
console.log(`preview.svg: ${kept} of ${rings.length} rings, ${(svg.length / 1024).toFixed(1)} KB`);
