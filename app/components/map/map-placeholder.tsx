import { withBase } from "~/lib/base-path";

/** The map's first view (people-map.tsx): the placeholder shows the world exactly as it does. */
export const INITIAL_VIEW = { center: [12, 30] as [number, number], zoom: 1.2 };

/** Copies of the world on each side: enough for screens up to ~5000 px wide. */
const COPIES = 2;

/** Width (= height) of the Mercator world in CSS pixels at a zoom, as MapLibre draws it (512 px tiles). */
const worldSize = (zoom: number) => 512 * 2 ** zoom;

/** Position of a point in the Mercator world, 0…1 from the top left. */
function mercator([lng, lat]: [number, number]): [number, number] {
  const rad = (lat * Math.PI) / 180;
  return [(lng + 180) / 360, (1 - Math.log(Math.tan(Math.PI / 4 + rad / 2)) / Math.PI) / 2];
}

/**
 * The land of the basemap, in the theme's colours, until MapLibre and the basemap (~700 KB)
 * have loaded: phones on a slow connection see the world at once instead of a loading line.
 * A mask (public/map/preview.svg, scripts/build-map-preview.ts) filled with the land colour,
 * so light and dark follow the theme without script; placed like the map's first view, so
 * the map appears exactly over it. Water and land as in readMapColors (map-style.ts).
 */
export function MapPlaceholder({ status }: { status: string }) {
  const size = worldSize(INITIAL_VIEW.zoom);
  const [x, y] = mercator(INITIAL_VIEW.center);
  const mask = `url("${withBase("/map/preview.svg")}")`;
  return (
    <div className="absolute inset-0 overflow-hidden bg-[color-mix(in_srgb,var(--c-page)_55%,var(--c-border))]">
      {/* The world and COPIES of it east and west, as on the map; positioned by left/top
          (a percentage in mask-position refers to the box minus the mask, not the box). */}
      <div
        aria-hidden="true"
        className="absolute bg-surface"
        style={{
          width: size * (2 * COPIES + 1),
          height: size,
          left: `calc(50% - ${(x * size + COPIES * size).toFixed(1)}px)`,
          top: `calc(50% - ${(y * size).toFixed(1)}px)`,
          maskImage: mask,
          WebkitMaskImage: mask,
          maskSize: `${size}px ${size}px`,
          WebkitMaskSize: `${size}px ${size}px`,
          maskRepeat: "repeat-x",
          WebkitMaskRepeat: "repeat-x",
        }}
      />
      <p role="status" className="absolute inset-0 grid place-items-center text-muted-text">
        <span className="rounded-full bg-page/80 px-4 py-2 backdrop-blur-sm">{status}</span>
      </p>
    </div>
  );
}
