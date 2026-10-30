/**
 * Basemap of the map view: Natural Earth 1:50m land, lakes and country borders (public
 * domain), stripped to the geometry and rounded to ~1 km. Self-hosted, so the map loads
 * nothing from third parties (GDPR).
 *
 *   npx tsx scripts/build-basemap.ts
 *
 * A one-off generator like the import; the result in public/map/ is committed.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
const LAYERS = {
  land: "ne_50m_land",
  lakes: "ne_50m_lakes",
  borders: "ne_50m_admin_0_boundary_lines_land",
};
const OUT = path.resolve("public/map");

type Position = number[];
type Coordinates = Position | Coordinates[];

const round = (coords: Coordinates): Coordinates =>
  typeof coords[0] === "number"
    ? (coords as Position).slice(0, 2).map((n) => Math.round(n * 100) / 100)
    : (coords as Coordinates[]).map(round);

await mkdir(OUT, { recursive: true });
for (const [name, file] of Object.entries(LAYERS)) {
  const response = await fetch(`${SOURCE}/${file}.geojson`);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  const data = (await response.json()) as {
    features: { geometry: { type: string; coordinates: Coordinates } }[];
  };
  const features = data.features.map((f) => ({
    type: "Feature",
    properties: {},
    geometry: { type: f.geometry.type, coordinates: round(f.geometry.coordinates) },
  }));
  const json = JSON.stringify({ type: "FeatureCollection", features });
  await writeFile(path.join(OUT, `${name}.json`), json);
  console.log(`${name}: ${features.length} features, ${Math.round(json.length / 1024)} KB`);
}
