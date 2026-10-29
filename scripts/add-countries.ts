/**
 * One-off: adds the countries of birth and death places to the place facet of the already
 * imported people (and taxonomy.json), without re-running the whole import.
 *
 *   WIKIMEDIA_CONTACT=... npx tsx scripts/add-countries.ts
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { slugify } from "../app/lib/content/format";
import type { Person, Taxonomy } from "../app/lib/content/schema";
import { countriesOf, entityIds, getEntities, label } from "./import/wikidata";

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
for (const [file, person] of people) {
  const entity = entities.get(qidOf(person) ?? "");
  if (!entity) continue;
  const keys: string[] = [];
  for (const prop of ["P19", "P20"]) {
    const country = countries.get(entityIds(entity, prop)[0] ?? "");
    const en = label(country, "en");
    if (!country || !en) continue;
    const key = slugify(en);
    taxonomy.place[key] ??= { de: label(country, "de") ?? en, en };
    keys.push(key);
  }
  const place = [...new Set([...(person.facets.place ?? []), ...keys])];
  if (place.length === (person.facets.place ?? []).length) continue;
  person.facets.place = place;
  await writeFile(file, `${JSON.stringify(person, null, 2)}\n`);
  updated++;
}
await writeFile(taxonomyFile, `${JSON.stringify(taxonomy, null, 2)}\n`);
console.log(`${updated} people updated, ${Object.keys(taxonomy.place).length} place entries.`);
