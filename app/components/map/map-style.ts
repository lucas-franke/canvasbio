import type { StyleSpecification } from "maplibre-gl";

import { withBase } from "~/lib/base-path";

/** Colors of the basemap, derived from the site's theme tokens (--c-*). */
export interface MapColors {
  land: string;
  water: string;
  coast: string;
  border: string;
}

/** Mixes two #rrggbb colors; anything else falls back to the first. */
function mix(a: string, b: string, amount: number): string {
  const hex = /^#([0-9a-f]{6})$/i;
  const ma = hex.exec(a.trim());
  const mb = hex.exec(b.trim());
  if (!ma || !mb) return a;
  const channel = (i: number) => {
    const ca = parseInt(ma[1]!.slice(i, i + 2), 16);
    const cb = parseInt(mb[1]!.slice(i, i + 2), 16);
    return Math.round(ca + (cb - ca) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

/** Reads the current theme (light or dark) from the CSS custom properties on <html>. */
export function readMapColors(): MapColors {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(`--c-${name}`).trim();
  const page = token("page");
  const border = token("border");
  return {
    // Land is the paper of the cards, the sea a little deeper than the page.
    land: token("surface"),
    water: mix(page, border, 0.45),
    coast: border,
    border: mix(border, token("border-control"), 0.35),
  };
}

/**
 * The basemap: Natural Earth land, lakes and country borders from /map (self-hosted, see
 * scripts/build-basemap.ts). No labels, no third-party tiles or fonts.
 */
export function mapStyle(colors: MapColors): StyleSpecification {
  const source = (name: string) => ({ type: "geojson" as const, data: withBase(`/map/${name}.json`) });
  return {
    version: 8,
    sources: { land: source("land"), lakes: source("lakes"), borders: source("borders") },
    layers: [
      { id: "water", type: "background", paint: { "background-color": colors.water } },
      { id: "land", type: "fill", source: "land", paint: { "fill-color": colors.land } },
      {
        id: "coast",
        type: "line",
        source: "land",
        paint: {
          "line-color": colors.coast,
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.5, 6, 1.25],
        },
      },
      { id: "lakes", type: "fill", source: "lakes", paint: { "fill-color": colors.water } },
      {
        id: "borders",
        type: "line",
        source: "borders",
        paint: {
          "line-color": colors.border,
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.5, 6, 1],
          "line-dasharray": [3, 2],
        },
      },
    ],
  };
}

/** Applies new theme colors to a loaded map without reloading its data. */
export const paintFor = (colors: MapColors): [layer: string, property: string, value: string][] => [
  ["water", "background-color", colors.water],
  ["land", "fill-color", colors.land],
  ["coast", "line-color", colors.coast],
  ["lakes", "fill-color", colors.water],
  ["borders", "line-color", colors.border],
];
