/**
 * One-off: adds the continents of birth and death places to the place facet of the already
 * imported people (and taxonomy.json), so searching "Afrika" finds everyone from Africa.
 *
 *   WIKIMEDIA_CONTACT=... npx tsx scripts/add-continents.ts
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Person, Taxonomy } from "../app/lib/content/schema";
import { continentsOf, countriesOf, entityIds, getEntities } from "./import/wikidata";

const CONTENT = path.resolve("content");
const taxonomyFile = path.join(CONTENT, "taxonomy.json");
const taxonomy: Taxonomy = JSON.parse(await readFile(taxonomyFile, "utf8"));

const files = (await readdir(path.join(CONTENT, "people"))).map((slug) =>
  path.join(CONTENT, "people", slug, "person.json"),
);
const people = new Map<string, Person>();
for (const file of files) people.set(file, JSON.parse(await readFile(file, "utf8")));

const qidOf = (person: Person) =>
  person.sources.map((s) => /wikidata\.org\/wiki\/(Q\d+)/.exec(s.url)?.[1]).find(Boolean);
const entities = await getEntities([...people.values()].flatMap((p) => qidOf(p) ?? []));
const places = await getEntities(
  [...entities.values()].flatMap((e) => ["P19", "P20"].flatMap((prop) => entityIds(e, prop).slice(0, 1))),
);
const countries = await countriesOf([...places.values()]);

let updated = 0;
const counts: Record<string, number> = {};
for (const [file, person] of people) {
  const entity = entities.get(qidOf(person) ?? "");
  if (!entity) continue;
  const keys = ["P19", "P20"].flatMap((prop) =>
    continentsOf(countries.get(entityIds(entity, prop)[0] ?? "")).map((c) => {
      taxonomy.place[c.key] ??= { de: c.de, en: c.en };
      return c.key;
    }),
  );
  for (const key of new Set(keys)) counts[key] = (counts[key] ?? 0) + 1;
  const place = [...new Set([...(person.facets.place ?? []), ...keys])];
  if (place.length === (person.facets.place ?? []).length) continue;
  person.facets.place = place;
  await writeFile(file, `${JSON.stringify(person, null, 2)}\n`);
  updated++;
}
await writeFile(taxonomyFile, `${JSON.stringify(taxonomy, null, 2)}\n`);
console.log(`${updated} people updated. People per continent:`, counts);
