/**
 * "Torn paper" edge for canvas tiles (theme.tileEdge = "torn"): an SVG mask whose outline
 * frays by a few pixels. A few variants are generated deterministically, so neighbouring
 * tiles don't look stamped from the same template.
 */

const SIZE = 1000;
const STEPS = 90;
/** Maximum inset in mask units (1000 = tile edge, so ≈ 1.6 % of the tile). */
const DEPTH = 16;

function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function edgePath(seed: number): string {
  const rnd = random(seed);
  const points: string[] = [];
  // Slowly wandering base depth plus fine jitter: fibres rather than a saw blade.
  let drift = rnd() * DEPTH * 0.5;
  const depth = () => {
    drift = Math.min(DEPTH * 0.6, Math.max(0, drift + (rnd() - 0.5) * DEPTH * 0.35));
    const jitter = rnd() ** 2 * DEPTH * 0.6;
    return Math.round(drift + jitter);
  };
  const side = (from: [number, number], to: [number, number], inward: [number, number]) => {
    for (let i = 0; i < STEPS; i++) {
      const t = i / STEPS;
      const d = depth();
      const x = from[0] + (to[0] - from[0]) * t + inward[0] * d;
      const y = from[1] + (to[1] - from[1]) * t + inward[1] * d;
      points.push(`${Math.round(x)} ${Math.round(y)}`);
    }
  };
  side([0, 0], [SIZE, 0], [0, 1]);
  side([SIZE, 0], [SIZE, SIZE], [-1, 0]);
  side([SIZE, SIZE], [0, SIZE], [0, -1]);
  side([0, SIZE], [0, 0], [1, 0]);
  return `M${points.join("L")}Z`;
}

const maskUrl = (path: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" preserveAspectRatio="none"><path d="${path}"/></svg>`,
  )}")`;

export const TORN_VARIANTS = 4;

/** CSS rules `.torn-edge-0` … `.torn-edge-3` with the mask images. */
export function tornEdgeCss(): string {
  return Array.from({ length: TORN_VARIANTS }, (_, i) => {
    const url = maskUrl(edgePath(1009 * (i + 1)));
    return `.torn-edge-${i}{-webkit-mask-image:${url};mask-image:${url};-webkit-mask-size:100% 100%;mask-size:100% 100%}`;
  }).join("\n");
}

/** Mask class for a portrait outside the canvas, stable per person. */
export function tornEdgeClass(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  return `torn-edge-${((hash % TORN_VARIANTS) + TORN_VARIANTS) % TORN_VARIANTS}`;
}

/** Variant for a cell: stable per position, varied between neighbours. */
export function tornVariant(col: number, row: number): number {
  return (((col * 7 + row * 3) % TORN_VARIANTS) + TORN_VARIANTS) % TORN_VARIANTS;
}
