/**
 * Coordinates of the birth and death places of the imported people (Wikidata P625), for the
 * map view. Writes content/places.json: { "<place key>": [longitude, latitude] }.
 * Existing entries are kept, so hand-made corrections survive a rerun.
 *
 *   WIKIMEDIA_CONTACT=... npx tsx scripts/add-coords.ts
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Person } from "../app/lib/content/schema";
import { coordsOf, entityIds, getEntities } from "./import/wikidata";

const CONTENT = path.resolve("content");
const placesFile = path.join(CONTENT, "places.json");
const places: Record<string, [number, number]> = await readFile(placesFile, "utf8")
  .then((json) => JSON.parse(json))
  .catch(() => ({}));

const people: Person[] = [];
for (const slug of await readdir(path.join(CONTENT, "people"))) {
  const json = await readFile(path.join(CONTENT, "people", slug, "person.json"), "utf8").catch(() => "");
  if (json) people.push(JSON.parse(json));
}

const qidOf = (person: Person) =>
  person.sources.map((s) => /wikidata\.org\/wiki\/(Q\d+)/.exec(s.url)?.[1]).find(Boolean);
const entities = await getEntities(people.flatMap((p) => qidOf(p) ?? []));
const placeIds = [...entities.values()].flatMap((e) =>
  ["P19", "P20"].flatMap((p) => entityIds(e, p).slice(0, 1)),
);
const placeEntities = await getEntities(placeIds);
// Places without coordinates of their own (some districts) take those of their parent.
const parents = await getEntities(
  [...placeEntities.values()].filter((e) => !coordsOf(e)).flatMap((e) => entityIds(e, "P131").slice(0, 1)),
);

let added = 0;
const missing: string[] = [];
for (const person of people) {
  const entity = entities.get(qidOf(person) ?? "");
  if (!entity) continue;
  for (const [kind, prop] of [
    ["born", "P19"],
    ["died", "P20"],
  ] as const) {
    const key = person[kind]?.place;
    if (!key || places[key]) continue;
    const place = placeEntities.get(entityIds(entity, prop)[0] ?? "");
    const coords = place && (coordsOf(place) ?? coordsOf(parents.get(entityIds(place, "P131")[0] ?? "")));
    if (coords) {
      places[key] = coords;
      added++;
    } else missing.push(`${person.slug}: ${key}`);
  }
}

const sorted = Object.fromEntries(Object.entries(places).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(placesFile, `${JSON.stringify(sorted)}\n`);
console.log(`${added} places added, ${Object.keys(sorted).length} in total.`);
if (missing.length > 0) console.log(`Without coordinates: ${[...new Set(missing)].join(", ")}`);
