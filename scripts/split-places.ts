/**
 * Splits place keys that stand for several places with the same name (Hamburg in Germany and
 * in South Carolina). The best-known place (most Wikipedia articles) keeps the key; each
 * other one gets its own key, label and coordinates: "hamburg-united-states",
 * "Hamburg (Vereinigte Staaten)". People, their search facets, the taxonomy and
 * content/places.json follow. Also writes content/place-ids.json (key → Wikidata place), so
 * the import keeps the places apart from now on.
 *
 *   npx tsx scripts/split-places.ts            (report only)
 *   npx tsx scripts/split-places.ts --write
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { slugify } from "../app/lib/content/format";
import type { Person } from "../app/lib/content/schema";
import { qualifierOf, samePlace } from "./import/place-keys";
import { coordsOf, entityIds, getEntities, type Entity } from "./import/wikidata";

const WRITE = process.argv.includes("--write");
const CONTENT = path.resolve("content");
/**
 * Keys that look split but aren't: the import rolled a district up into its region on
 * purpose (the state of Rio de Janeiro with the city; districts of the Pune division).
 */
const KEEP = new Set(["rio-de-janeiro", "pune-division"]);

const readJson = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, "utf8")) as T;
const people = new Map<string, Person>();
for (const slug of await readdir(path.join(CONTENT, "people"))) {
  const json = await readFile(path.join(CONTENT, "people", slug, "person.json"), "utf8").catch(() => "");
  if (json) people.set(slug, JSON.parse(json) as Person);
}
const taxonomy = await readJson<{ place: Record<string, { de: string; en: string }> }>(
  path.join(CONTENT, "taxonomy.json"),
);
const coords = await readJson<Record<string, [number, number]>>(path.join(CONTENT, "places.json"));

const qidOf = (person: Person) =>
  person.sources.map((s) => /wikidata\.org\/wiki\/(Q\d+)/.exec(s.url)?.[1]).find(Boolean);
const entities = await getEntities([...people.values()].flatMap((p) => qidOf(p) ?? []));
const placeOf = (person: Person, prop: string) => entityIds(entities.get(qidOf(person) ?? "")!, prop)[0];
const placeIds = [...people.values()].flatMap((p) =>
  entities.has(qidOf(p) ?? "") ? ["P19", "P20"].flatMap((prop) => placeOf(p, prop) ?? []) : [],
);
const places = await getEntities(placeIds);
// Places without coordinates of their own take those of their parent (as in add-coords.ts).
const parents = await getEntities(
  [...places.values()].filter((e) => !coordsOf(e)).flatMap((e) => entityIds(e, "P131").slice(0, 1)),
);
const where = (place: Entity) => coordsOf(place) ?? coordsOf(parents.get(entityIds(place, "P131")[0] ?? ""));

// Which places stand behind each key: groups of the same place (an entity and its districts).
interface Use {
  slug: string;
  kind: "born" | "died";
}
interface Group {
  place: Entity;
  coords?: [number, number];
  uses: Use[];
}
const groups = new Map<string, Group[]>();
for (const person of people.values()) {
  if (!entities.has(qidOf(person) ?? "")) continue;
  for (const [kind, prop] of [
    ["born", "P19"],
    ["died", "P20"],
  ] as const) {
    const key = person[kind]?.place;
    const place = places.get(placeOf(person, prop) ?? "");
    if (!key || !place) continue;
    const list = groups.get(key) ?? [];
    const here = { id: place.id, coords: where(place) };
    const group = list.find((g) => samePlace({ id: g.place.id, coords: g.coords }, here));
    if (group) {
      group.uses.push({ slug: person.slug, kind });
      // The better-known entity represents the group (the city rather than its district).
      if (Object.keys(place.sitelinks).length > Object.keys(group.place.sitelinks).length) {
        group.place = place;
        group.coords = here.coords;
      }
    } else list.push({ place, coords: here.coords, uses: [{ slug: person.slug, kind }] });
    groups.set(key, list);
  }
}

const ids: Record<string, string> = {};
const touched = new Set<string>();
/** Keys that stood for several places. */
const split = new Set<string>();
for (const [key, list] of groups) {
  // The best-known place keeps the key.
  list.sort((a, b) => Object.keys(b.place.sitelinks).length - Object.keys(a.place.sitelinks).length);
  const [main, ...others] = list;
  ids[key] = main!.place.id;
  if (others.length === 0 || KEEP.has(key)) continue;
  split.add(key);
  if (main!.coords) coords[key] = main!.coords;
  console.log(`${key}: ${taxonomy.place[key]?.de} stays ${main!.place.id}`);
  for (const other of others) {
    const qualifier = await qualifierOf(other.place, main!.place);
    if (!qualifier) {
      console.log(`  ! no qualifier for ${other.place.id}, left as it is`);
      continue;
    }
    const newKey = `${key}-${slugify(qualifier.en)}`;
    const base = taxonomy.place[key] ?? { de: key, en: key };
    taxonomy.place[newKey] = { de: `${base.de} (${qualifier.de})`, en: `${base.en} (${qualifier.en})` };
    ids[newKey] = other.place.id;
    if (other.coords) coords[newKey] = other.coords;
    for (const use of other.uses) {
      const person = people.get(use.slug)!;
      person[use.kind]!.place = newKey;
      touched.add(use.slug);
    }
    console.log(
      `  → ${newKey} "${taxonomy.place[newKey]!.de}" ← ${other.uses.map((u) => `${u.slug} (${u.kind})`).join(", ")}`,
    );
  }
}

// Search facets: a split key is replaced by the person's own new key, in the same position;
// countries and continents stay.
for (const slug of touched) {
  const person = people.get(slug)!;
  const own = [person.born.place, person.died?.place].filter((k): k is string => Boolean(k));
  person.facets.place = [
    ...new Set(
      (person.facets.place ?? []).flatMap((k) =>
        // Born in one Boston, died in the other: both keys.
        split.has(k) ? [...(own.includes(k) ? [k] : []), ...own.filter((o) => o.startsWith(`${k}-`))] : [k],
      ),
    ),
  ];
}

console.log(`\n${touched.size} people with a separated place.`);
if (WRITE) {
  for (const slug of touched) {
    const file = path.join(CONTENT, "people", slug, "person.json");
    await writeFile(file, `${JSON.stringify(people.get(slug), null, 2)}\n`);
  }
  const sortedObject = <T>(o: Record<string, T>) =>
    Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(path.join(CONTENT, "taxonomy.json"), `${JSON.stringify(taxonomy, null, 2)}\n`);
  await writeFile(path.join(CONTENT, "places.json"), `${JSON.stringify(sortedObject(coords))}\n`);
  await writeFile(path.join(CONTENT, "place-ids.json"), `${JSON.stringify(sortedObject(ids), null, 2)}\n`);
  console.log("Written.");
}
