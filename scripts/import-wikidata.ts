/**
 * Demo content import: pioneers of the women's movement from Wikidata,
 * public-domain portraits from Wikimedia Commons, life stories from Wikipedia.
 *
 *   npx tsx scripts/import-wikidata.ts [--limit 200] [--to-year 1950] [--full]
 *     [--focus "Africa,Asia,South America,Oceania"]
 *
 * This is a one-off generator for demo data, not part of the build. It overwrites
 * person.json, de.md, en.md and portrait.jpg of imported people, but never touches
 * hand-written files. API responses are cached in .cache/import.
 */
import { access, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import sharp from "sharp";
import { stringify } from "yaml";

import { formatPartialDate, slugify, sortName, yearOf } from "../app/lib/content/format";
import { parseFrontmatter } from "../app/lib/content/frontmatter";
import type { Person, PersonText, Taxonomy } from "../app/lib/content/schema";
import { getFreeImages, type CommonsImage } from "./import/commons";
import { fetchBinary } from "./import/http";
import {
  dateOf,
  CONTINENT_IDS,
  continentsOf,
  countriesOf,
  countriesOn,
  findRegionalCandidates,
  entityIds,
  femaleLabel,
  findCandidates,
  getEntities,
  label,
  qualifierDate,
  statements,
  stringValue,
  type Candidate,
  type Entity,
} from "./import/wikidata";
import { articleUrl, getStory } from "./import/wikipedia";

const { values: args } = parseArgs({
  options: {
    limit: { type: "string", default: "200" },
    "to-year": { type: "string", default: "1950" },
    /** Continents (English, comma-separated) to add people from, with broader occupations. */
    focus: { type: "string" },
    full: { type: "boolean", default: false },
  },
});
/** Total number of people. By default the import only adds to the existing ones; --full starts over. */
const LIMIT = Number(args.limit);
const ADD = !args.full;
/** Latest year of birth. Only people who have died are imported (see "deceased" below). */
const TO_YEAR = Number(args["to-year"]);
/** In add mode: at least this many people per continent outside Europe (if enough candidates exist). */
const MIN_PER_CONTINENT = 25;
const CONTENT = path.resolve("content");
const LANGS = ["de", "en"] as const;
type Lang = (typeof LANGS)[number];

const WIKIPEDIA_LICENSE = { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" };
const WIKIDATA_LICENSE = { name: "CC0", url: "https://creativecommons.org/publicdomain/zero/1.0/" };

/* ---------------------------------------------------------------- fields */

/** Facet "field": derived from occupations via their English label. "activism" is the fallback. */
const FIELDS: { key: string; match: RegExp; label: Record<string, string> }[] = [
  {
    key: "politics",
    match: /politician|member of parliament|diplomat|mayor/,
    label: { de: "Politik", en: "Politics" },
  },
  {
    key: "writing",
    match: /writer|novelist|poet|journalist|editor|essayist|publisher|translator|author|playwright/,
    label: { de: "Literatur & Presse", en: "Writing & press" },
  },
  {
    key: "education",
    match: /teacher|educator|pedagogue|headmistress|school/,
    label: { de: "Bildung", en: "Education" },
  },
  {
    key: "medicine",
    match: /physician|nurse|midwife|doctor|surgeon|psychiatrist/,
    label: { de: "Medizin & Pflege", en: "Medicine & care" },
  },
  {
    key: "science",
    match:
      /scientist|mathematician|economist|sociologist|historian|physicist|chemist|astronomer|philosopher|biologist|psychologist|lawyer|jurist/,
    label: { de: "Wissenschaft & Recht", en: "Science & law" },
  },
  {
    key: "arts",
    match: /painter|artist|actress|actor|singer|composer|musician|photographer|sculptor|dancer/,
    label: { de: "Kunst & Kultur", en: "Arts & culture" },
  },
  {
    key: "social",
    match: /social worker|philanthropist|trade unionist|reformer|pacifist|charity/,
    label: { de: "Soziales & Gewerkschaft", en: "Social work & unions" },
  },
];
const ACTIVISM = {
  key: "activism",
  label: { de: "Frauenbewegung", en: "Women's movement" },
};

function fieldsOf(occupations: (Entity | undefined)[]): string[] {
  const labels = occupations.map((o) => label(o, "en")?.toLowerCase() ?? "");
  const keys = FIELDS.filter((f) => labels.some((l) => f.match.test(l))).map((f) => f.key);
  return keys.length > 0 ? keys : [ACTIVISM.key];
}

/* ------------------------------------------------------------- selection */

/**
 * Spreads the selection over the whole prominence range: the best-known 15 %
 * plus an even sample of the rest, so lesser-known biographies are well represented.
 */
function spreadSample<T>(sorted: T[], count: number): T[] {
  if (sorted.length <= count) return sorted;
  const top = Math.round(count * 0.15);
  const rest = sorted.slice(top);
  const step = rest.length / (count - top);
  return [
    ...sorted.slice(0, top),
    ...Array.from({ length: count - top }, (_, i) => rest[Math.floor(i * step)]),
  ];
}

/* ----------------------------------------------------------------- texts */

const T = {
  born: { de: "Geboren", en: "Born" },
  died: { de: "Gestorben", en: "Died" },
  field: { de: "Wirkungsfeld", en: "Field" },
  in: { de: "in", en: "in" },
  bornIn: {
    de: (p?: string) => (p ? `Geboren in ${p}` : "Geboren"),
    en: (p?: string) => (p ? `Born in ${p}` : "Born"),
  },
  diedIn: {
    de: (p?: string) => (p ? `Gestorben in ${p}` : "Gestorben"),
    en: (p?: string) => (p ? `Died in ${p}` : "Died"),
  },
  education: { de: (x: string) => `Ausbildung: ${x}`, en: (x: string) => `Education: ${x}` },
  party: { de: (x: string) => `Mitglied: ${x}`, en: (x: string) => `Member of ${x}` },
  award: { de: (x: string) => `Auszeichnung: ${x}`, en: (x: string) => `Award: ${x}` },
  nomination: { de: (x: string) => `Nominiert für: ${x}`, en: (x: string) => `Nominated for ${x}` },
  marriage: { de: (x: string) => `Heirat mit ${x}`, en: (x: string) => `Marriage to ${x}` },
  residence: { de: (x: string) => `Wohnort: ${x}`, en: (x: string) => `Residence: ${x}` },
  employer: { de: (x: string) => `Tätig bei: ${x}`, en: (x: string) => `Works at ${x}` },
  work: { de: (x: string) => `Veröffentlichung: „${x}“`, en: (x: string) => `Publication: “${x}”` },
  portraitAlt: { de: (n: string) => `Porträt von ${n}`, en: (n: string) => `Portrait of ${n}` },
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "15. Februar 1844 in Honfleur, Frankreich"; the country is left out when it is the place itself. */
function dateAndPlace(
  date: string | undefined,
  place: string | undefined,
  country: string | undefined,
  lang: Lang,
) {
  const where = place && (country && country !== place ? `${place}, ${country}` : place);
  return [date && formatPartialDate(date, lang), where && `${T.in[lang]} ${where}`]
    .filter(Boolean)
    .join(" ");
}

interface TimelineEntry {
  sort: string;
  date: string;
  event: string;
}

function buildTimeline(
  person: Entity,
  refs: Map<string, Entity>,
  lang: Lang,
  places: { born?: string; died?: string },
): { date: string; event: string }[] {
  const entries: TimelineEntry[] = [];
  const seen = new Set<string>();
  const add = (date: string | undefined, event: string | undefined) => {
    // The same fact can come from several statements (e.g. two ranks); list it once.
    if (!date || !event || seen.has(`${date} ${event}`)) return;
    seen.add(`${date} ${event}`);
    entries.push({ sort: date, date: formatPartialDate(date, lang), event });
  };
  const refEntity = (s: { mainsnak: { datavalue?: { value: unknown } } }) =>
    refs.get((s.mainsnak.datavalue?.value as { id: string }).id);
  const ref = (s: { mainsnak: { datavalue?: { value: unknown } } }) => label(refEntity(s), lang);
  /** Statements with a start date (or point in time): "from then on". */
  const started = (property: string, text: (name: string) => string) => {
    for (const s of statements(person, property)) {
      const name = ref(s);
      add(qualifierDate(s, "P580") ?? qualifierDate(s, "P585"), name && text(name));
    }
  };

  add(dateOf(person, "P569"), T.bornIn[lang](places.born));
  for (const s of statements(person, "P69")) {
    const name = ref(s);
    add(qualifierDate(s, "P580") ?? qualifierDate(s, "P582"), name && T.education[lang](name));
  }
  for (const s of statements(person, "P102")) {
    const name = ref(s);
    add(qualifierDate(s, "P580"), name && T.party[lang](name));
  }
  for (const s of statements(person, "P39")) {
    const name = ref(s);
    add(qualifierDate(s, "P580"), name && capitalize(name));
  }
  for (const s of statements(person, "P166")) {
    const name = ref(s);
    add(qualifierDate(s, "P585") ?? qualifierDate(s, "P580"), name && T.award[lang](name));
  }
  started("P1411", T.nomination[lang]);
  started("P26", T.marriage[lang]);
  started("P551", T.residence[lang]);
  started("P463", T.party[lang]);
  started("P108", T.employer[lang]);
  // Significant events are named by themselves ("Women's Social and Political Union founded" …).
  started("P793", capitalize);
  // Notable works: dated by the statement or by the work's own publication date.
  for (const s of statements(person, "P800")) {
    const work = refEntity(s);
    const name = label(work, lang);
    add(qualifierDate(s, "P577") ?? (work && dateOf(work, "P577")), name && T.work[lang](name));
  }
  add(dateOf(person, "P570"), T.diedIn[lang](places.died));

  return entries.sort((a, b) => a.sort.localeCompare(b.sort)).map(({ date, event }) => ({ date, event }));
}

/* ---------------------------------------------------------------- output */

const frontmatterDoc = (text: PersonText, story: string) =>
  `---\n${stringify(text, { lineWidth: 0 })}---\n\n${story.trim()}\n`;

/** Downloads the portrait unless the same source was already fetched. Returns true if downloaded. */
async function ensurePortrait(dir: string, image: CommonsImage): Promise<boolean> {
  const file = path.join(dir, "portrait.jpg");
  const previous = await readFile(path.join(dir, "person.json"), "utf8")
    .then((json) => (JSON.parse(json) as Person).portrait.sourceUrl)
    .catch(() => undefined);
  const hasFile = await access(file).then(
    () => true,
    () => false,
  );
  if (hasFile && previous === image.pageUrl) return false;

  const original = await fetchBinary(image.url);
  await mkdir(dir, { recursive: true });
  await sharp(original)
    .rotate()
    .resize({ width: 1280, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(file);
  return true;
}

/** Portrait and alt texts of a person whose portrait was curated by hand (else undefined). */
async function readCurated(dir: string) {
  const person = await readFile(path.join(dir, "person.json"), "utf8")
    .then((json) => JSON.parse(json) as Person)
    .catch(() => undefined);
  if (!person?.portrait.curated) return undefined;
  const portraitAlt: Record<string, string | undefined> = {};
  for (const lang of LANGS) {
    const doc = await readFile(path.join(dir, `${lang}.md`), "utf8").catch(() => "");
    portraitAlt[lang] = (parseFrontmatter(doc).data as Partial<PersonText>).portraitAlt;
  }
  return { portrait: person.portrait, portraitAlt };
}

/** Files the importer writes; folders containing anything else were edited by hand and are kept. */
const GENERATED_FILES = new Set(["person.json", "de.md", "en.md", "portrait.jpg"]);

async function removeStaleFolders(keep: Set<string>): Promise<string[]> {
  const removed: string[] = [];
  const peopleDir = path.join(CONTENT, "people");
  for (const entry of await readdir(peopleDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || keep.has(entry.name)) continue;
    const files = await readdir(path.join(peopleDir, entry.name));
    if (files.every((f) => GENERATED_FILES.has(f))) {
      await rm(path.join(peopleDir, entry.name), { recursive: true });
      removed.push(entry.name);
    }
  }
  return removed;
}

/* ---------------------------------------------------------------- regions */

/**
 * People already in content/: Wikidata ids and folder names. The ids in
 * content/import-exclude.json (removed by hand) count as present, so they never come back.
 */
async function readExisting() {
  const qids = new Set<string>(
    Object.keys(
      JSON.parse(await readFile(path.join(CONTENT, "import-exclude.json"), "utf8").catch(() => "{}")),
    ),
  );
  const slugs = new Set<string>();
  const peopleDir = path.join(CONTENT, "people");
  for (const entry of await readdir(peopleDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    slugs.add(entry.name);
    const person = await readFile(path.join(peopleDir, entry.name, "person.json"), "utf8")
      .then((json) => JSON.parse(json) as Person)
      .catch(() => undefined);
    const qid = person?.sources.map((s) => /wikidata\.org\/wiki\/(Q\d+)/.exec(s.url)?.[1]).find(Boolean);
    if (qid) qids.add(qid);
  }
  return { qids, slugs };
}

/** English continent name of each person's birth place (via its country), "Unknown" if not resolvable. */
async function continentsOfBirth(entities: Map<string, Entity>): Promise<Map<string, string>> {
  const placeOf = (e: Entity) => entityIds(e, "P19")[0] ?? entityIds(e, "P20")[0];
  const places = await getEntities([...entities.values()].flatMap((e) => placeOf(e) ?? []));
  const countries = await countriesOf([...places.values()]);
  const result = new Map<string, string>();
  for (const [qid, e] of entities) {
    // Same six continents as the place search (Wikidata's variants folded in).
    const continent = continentsOf(countries.get(placeOf(e) ?? ""))[0];
    result.set(qid, continent?.en ?? "Unknown");
  }
  return result;
}

/**
 * The best-known `perContinent` people of every continent outside Europe, then an even sample of
 * everyone else up to `count` (most prominent first).
 */
function regionalSample<T extends Candidate>(
  sorted: T[],
  continentOf: (c: T) => string,
  count: number,
  perContinent: number,
): T[] {
  const guaranteed = ["Africa", "Asia", "South America", "North America", "Oceania"].flatMap((continent) =>
    sorted.filter((c) => continentOf(c) === continent).slice(0, perContinent),
  );
  const rest = sorted.filter((c) => !guaranteed.includes(c));
  return [...guaranteed, ...spreadSample(rest, Math.max(0, count - guaranteed.length))].sort(
    (a, b) => b.sitelinks - a.sitelinks,
  );
}

/**
 * --focus: the people to add come only from these continents, in equal shares (a share a
 * continent can't fill goes to the others), each an even sample over its prominence range.
 */
function focusSample<T extends Candidate>(
  sorted: T[],
  continentOf: (c: T) => string,
  count: number,
  focus: string[],
): T[] {
  const pools = focus.map((continent) => sorted.filter((c) => continentOf(c) === continent));
  const shares = pools.map(() => 0);
  let left = count;
  // Hand out places one round at a time, so a small pool's rest goes to the others.
  while (left > 0 && pools.some((pool, i) => pool.length > shares[i]!)) {
    pools.forEach((pool, i) => {
      if (left > 0 && pool.length > shares[i]!) {
        shares[i]!++;
        left--;
      }
    });
  }
  return pools.flatMap((pool, i) => spreadSample(pool, shares[i]!)).sort((a, b) => b.sitelinks - a.sitelinks);
}

/** Candidates of the broader regional search, as entities checked like the main search. */
async function regionalCandidates(focus: string[], exclude: Set<string>) {
  const continentOf = new Map<string, string>();
  for (const continent of focus) {
    const countries = await countriesOn(CONTINENT_IDS[continent]!);
    console.log(`    ${continent}: ${countries.length} countries …`);
    for (const country of countries) {
      for (const qid of await findRegionalCandidates(country)) {
        if (!exclude.has(qid) && !continentOf.has(qid)) continentOf.set(qid, continent);
      }
    }
  }
  return continentOf;
}

/* ------------------------------------------------------------------ main */

async function main() {
  console.log("1/5 Candidates from Wikidata …");
  const existing = ADD ? await readExisting() : { qids: new Set<string>(), slugs: new Set<string>() };
  const candidates = (await findCandidates(TO_YEAR))
    .filter((c) => !existing.qids.has(c.qid))
    .sort((a, b) => b.sitelinks - a.sitelinks);
  const need = LIMIT - existing.slugs.size;
  console.log(`    ${candidates.length} candidates found, ${existing.slugs.size} people already present`);
  if (ADD && need <= 0) {
    console.log("Nothing to add (raise --limit).");
    return;
  }

  // --focus: also the broader search in those continents (by citizenship).
  const focus = args.focus ? args.focus.split(",").map((s) => s.trim()) : [];
  for (const continent of focus) if (!CONTINENT_IDS[continent]) throw new Error(`Unknown continent "${continent}"`);
  const regional = focus.length
    ? await regionalCandidates(focus, new Set([...existing.qids, ...candidates.map((c) => c.qid)]))
    : new Map<string, string>();
  if (focus.length) console.log(`    ${regional.size} more candidates from the broader regional search`);

  // Oversample: some portraits will turn out not to be public domain.
  let sample: Candidate[];
  let entities: Map<string, Entity>;
  let regionOf: (c: Candidate) => string = () => "Unknown";
  if (ADD) {
    entities = await getEntities([...candidates.map((c) => c.qid), ...regional.keys()]);
    // The regional ones: same rules as the main search (born in range, English article).
    for (const qid of regional.keys()) {
      const e = entities.get(qid);
      const born = e && Number(yearOf(dateOf(e, "P569") ?? ""));
      if (!e || !born || born < 1800 || born > TO_YEAR || !e.sitelinks.enwiki) continue;
      candidates.push({ qid, sitelinks: Object.keys(e.sitelinks).length });
    }
    candidates.sort((a, b) => b.sitelinks - a.sitelinks);
    // Only people who have died: without a death date, anyone born after 1925 may be alive
    // (personality rights, GDPR).
    const deceased = candidates.filter((c) => {
      const e = entities.get(c.qid);
      const born = e && Number(yearOf(dateOf(e, "P569") ?? ""));
      return e && (dateOf(e, "P570") || (born && born <= 1925));
    });
    const continents = await continentsOfBirth(entities);
    const counts: Record<string, number> = {};
    for (const c of deceased) counts[continents.get(c.qid)!] = (counts[continents.get(c.qid)!] ?? 0) + 1;
    console.log("    candidates by continent:", counts);
    // Birth continent; for the regional search, else the continent of the citizenship.
    regionOf = (c) => {
      const birth = continents.get(c.qid)!;
      return birth === "Unknown" ? (regional.get(c.qid) ?? birth) : birth;
    };
    sample = focus.length
      ? focusSample(deceased, regionOf, Math.round(need * 1.8), focus)
      : regionalSample(deceased, regionOf, Math.round(need * 1.8), MIN_PER_CONTINENT * 2);
  } else {
    sample = spreadSample(candidates, Math.min(candidates.length, Math.round(LIMIT * 1.8)));
    entities = await getEntities(sample.map((c) => c.qid));
  }

  console.log("2/5 Checking image licences on Commons …");
  const imageFile = (e: Entity) => stringValue(e, "P18");
  const images = await getFreeImages(
    [...entities.values()].map(imageFile).filter((f): f is string => !!f),
    1280,
  );
  const withFreeImage = sample.filter((c) => {
    const file = entities.get(c.qid) && imageFile(entities.get(c.qid)!);
    return file && images.has(file);
  });
  const selected = !ADD
    ? spreadSample(withFreeImage, LIMIT)
    : focus.length
      ? focusSample(withFreeImage, regionOf, need, focus)
      : regionalSample(withFreeImage, regionOf, need, MIN_PER_CONTINENT);
  // Stand-ins in case a portrait can't be downloaded, closest in prominence first.
  const reserves = withFreeImage.filter((c) => !selected.includes(c));
  console.log(`    ${withFreeImage.length} with a free portrait, ${selected.length} selected`);

  console.log("3/5 Resolving places, occupations and other references …");
  const refIds = withFreeImage.flatMap((c) => {
    const e = entities.get(c.qid)!;
    return [
      "P19",
      "P20",
      "P106",
      "P69",
      "P102",
      "P39",
      "P166",
      "P1411",
      "P26",
      "P551",
      "P463",
      "P108",
      "P793",
      "P800",
    ].flatMap((p) => entityIds(e, p));
  });
  const refs = await getEntities(refIds);

  // City districts ("2nd arrondissement of Paris") are replaced by their city for a useful place facet.
  // Wikidata may nest several levels ("2nd arrondissement" → "Paris Centre" → "Paris").
  const isDistrict = (place: Entity | undefined) =>
    /arrondissement|district|borough|quarter|neighbou?rhood|ward\b|ortsteil|stadtteil|\bcent(re|er)\b|-mitte\b/i.test(
      label(place, "en") ?? "",
    );
  const parentOf = (place: Entity) => refs.get(entityIds(place, "P131")[0]);
  for (let level = 0; level < 2; level++) {
    const parentIds = [...refs.values()]
      .filter(isDistrict)
      .flatMap((place) => entityIds(place, "P131").slice(0, 1));
    for (const [id, entity] of await getEntities(parentIds.filter((id) => !refs.has(id))))
      refs.set(id, entity);
  }
  const cityOf = (place: Entity | undefined) => {
    for (let level = 0; place && isDistrict(place) && level < 2; level++) place = parentOf(place) ?? place;
    return place;
  };

  const maxLog = Math.log(withFreeImage[0]?.sitelinks ?? 1);
  const minLog = Math.log(withFreeImage[withFreeImage.length - 1]?.sitelinks ?? 1);
  const previous: Taxonomy = ADD ? JSON.parse(await readFile(path.join(CONTENT, "taxonomy.json"), "utf8")) : {};
  const taxonomy: Taxonomy = {
    field: Object.fromEntries([...FIELDS, ACTIVISM].map((f) => [f.key, f.label])),
    place: { ...previous.place },
  };
  // Countries too, so searching "Deutschland" finds everyone born or died there.
  const cityEntities = withFreeImage.flatMap((c) =>
    ["P19", "P20"].flatMap((prop) => {
      const city = cityOf(refs.get(entityIds(entities.get(c.qid)!, prop)[0]));
      return city ? [city] : [];
    }),
  );
  const countries = await countriesOf(cityEntities);
  const countryKey = (place: Entity) => {
    const country = countries.get(place.id);
    const en = label(country, "en");
    if (!country || !en) return undefined;
    const key = slugify(en) || slugify(label(country, "de") ?? "") || country.id.toLowerCase();
    taxonomy.place[key] ??= { de: label(country, "de") ?? en, en };
    return key;
  };
  const usedSlugs = new Set<string>(existing.slugs);
  const skipped: string[] = [];
  let downloaded = 0;

  console.log("4/5 Writing biographies …");
  const queue = [...selected];
  while (queue.length > 0 && usedSlugs.size < LIMIT) {
    const candidate = queue.shift()!;
    const e = entities.get(candidate.qid)!;
    const name = label(e, "de") ?? e.sitelinks.enwiki?.title ?? e.id;
    let slug = slugify(name);
    for (let n = 2; usedSlugs.has(slug); n++) slug = `${slugify(name)}-${n}`;
    const dir = path.join(CONTENT, "people", slug);
    const image = images.get(imageFile(e)!)!;

    // A portrait chosen by hand (portrait.curated) is kept, with its alt texts.
    const curated = await readCurated(dir);

    // Portrait first: if it can't be downloaded, a reserve candidate takes the place.
    try {
      if (!curated && (await ensurePortrait(dir, image))) downloaded++;
    } catch (error) {
      skipped.push(`${name}: ${(error as Error).message}`);
      console.warn(`    skipped: ${name} (${(error as Error).message})`);
      const reserve = reserves.shift();
      if (reserve) queue.push(reserve);
      continue;
    }
    usedSlugs.add(slug);

    const countryKeys: string[] = [];
    const countryOfPlace: Record<string, string | undefined> = {};
    const placeKey = (prop: string) => {
      const place = cityOf(refs.get(entityIds(e, prop)[0]));
      const en = label(place, "en");
      if (!place || !en) return undefined;
      const key = slugify(en) || slugify(label(place, "de") ?? "") || place.id.toLowerCase();
      taxonomy.place[key] ??= { de: label(place, "de")!, en };
      const country = countryKey(place);
      if (country) countryKeys.push(country);
      // … and the continents, so "Afrika" finds everyone born or died in Africa.
      for (const continent of continentsOf(countries.get(place.id))) {
        taxonomy.place[continent.key] ??= { de: continent.de, en: continent.en };
        countryKeys.push(continent.key);
      }
      countryOfPlace[key] = country;
      return key;
    };
    const bornPlace = placeKey("P19");
    const diedPlace = placeKey("P20");
    const occupations = entityIds(e, "P106").map((id) => refs.get(id));
    const born = dateOf(e, "P569");
    const died = dateOf(e, "P570");

    const person: Person = {
      slug,
      name: { display: name, sort: sortName(name) },
      born: { date: born, place: bornPlace },
      died: died || diedPlace ? { date: died, place: diedPlace } : undefined,
      portrait: curated?.portrait ?? {
        file: "portrait.jpg",
        credit: [image.artist, image.year].filter(Boolean).join(", "),
        license: image.license,
        sourceUrl: image.pageUrl,
      },
      facets: {
        field: fieldsOf(occupations),
        place: [...new Set([bornPlace, diedPlace, ...countryKeys].filter((p): p is string => !!p))],
      },
      prominence:
        maxLog === minLog
          ? 0.5
          : Math.round(((Math.log(candidate.sitelinks) - minLog) / (maxLog - minLog)) * 100) / 100,
      sources: [
        { label: "Wikidata", url: `https://www.wikidata.org/wiki/${e.id}`, license: WIKIDATA_LICENSE },
        ...LANGS.filter((lang) => e.sitelinks[`${lang}wiki`]).map((lang) => ({
          label: `Wikipedia (${lang}): ${e.sitelinks[`${lang}wiki`]!.title}`,
          url: articleUrl(lang, e.sitelinks[`${lang}wiki`]!.title),
          license: WIKIPEDIA_LICENSE,
        })),
      ],
      externalId: e.id,
    };

    await writeFile(path.join(dir, "person.json"), `${JSON.stringify(person, null, 2)}\n`);

    for (const lang of LANGS) {
      const occupationNames = [
        ...new Set(occupations.map((o) => femaleLabel(o, lang)).filter(Boolean)),
      ] as string[];
      const place = (key?: string) => (key ? taxonomy.place[key][lang] : undefined);
      const countryOf = (key?: string) => (key ? countryOfPlace[key] : undefined);
      const lifespan = [born && yearOf(born), died && yearOf(died)].filter(Boolean).join("–");
      // Lifespan is shown on its own line, so "(1874-1939)" at the end of descriptions is redundant.
      const description = e.descriptions[lang]?.value.replace(/\s*\(\d{4}\s*[–-]\s*\d{4}\)\s*$/, "");

      const text: PersonText = {
        summary: [
          description ? capitalize(description) : occupationNames.slice(0, 3).join(", "),
          [lifespan, place(bornPlace)].filter(Boolean).join(" · "),
        ].filter((s) => s.length > 0),
        portraitAlt: curated?.portraitAlt[lang] ?? T.portraitAlt[lang](name),
        facts: [
          ...(born || bornPlace
            ? [{ label: T.born[lang], value: dateAndPlace(born, place(bornPlace), place(countryOf(bornPlace)), lang) }]
            : []),
          ...(died || diedPlace
            ? [{ label: T.died[lang], value: dateAndPlace(died, place(diedPlace), place(countryOf(diedPlace)), lang) }]
            : []),
          ...(occupationNames.length > 0
            ? [{ label: T.field[lang], value: occupationNames.slice(0, 4).map(capitalize).join(", ") }]
            : []),
        ],
        timeline: buildTimeline(e, refs, lang, { born: place(bornPlace), died: place(diedPlace) }),
      };
      // No article in this language: the English one is used and the page says so.
      const storyLang = e.sitelinks[`${lang}wiki`] ? lang : "en";
      const story = await getStory(storyLang, e.sitelinks[`${storyLang}wiki`]!.title);
      if (storyLang !== lang) text.storyLang = storyLang;
      await writeFile(path.join(dir, `${lang}.md`), frontmatterDoc(text, story));
    }

    console.log(`    [${usedSlugs.size}/${LIMIT}] ${name}`);
  }

  console.log("5/5 Writing taxonomy and cleaning up …");
  await writeFile(path.join(CONTENT, "taxonomy.json"), `${JSON.stringify(taxonomy, null, 2)}\n`);
  const removed = ADD ? [] : await removeStaleFolders(usedSlugs);

  console.log(
    `Done: ${usedSlugs.size} people, ${Object.keys(taxonomy.place).length} places, ` +
      `${downloaded} portraits downloaded, ${skipped.length} skipped, ${removed.length} stale folders removed.`,
  );
  if (removed.length > 0) console.log(`  removed: ${removed.join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
