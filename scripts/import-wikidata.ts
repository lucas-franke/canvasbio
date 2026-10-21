/**
 * Demo content import: pioneers of the women's movement from Wikidata,
 * public-domain portraits from Wikimedia Commons, life stories from Wikipedia.
 *
 *   npx tsx scripts/import-wikidata.ts [--limit 200]
 *
 * This is a one-off generator for demo data, not part of the build. It overwrites
 * person.json, de.md, en.md and portrait.jpg of imported people, but never touches
 * hand-written files such as de-LS.md. API responses are cached in .cache/import.
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
  entityIds,
  femaleLabel,
  findCandidates,
  getEntities,
  label,
  qualifierDate,
  statements,
  stringValue,
  type Entity,
} from "./import/wikidata";
import { articleUrl, getStory } from "./import/wikipedia";

const { values: args } = parseArgs({ options: { limit: { type: "string", default: "200" } } });
const LIMIT = Number(args.limit);
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
    label: { de: "Politik", en: "Politics", "de-LS": "Politik" },
  },
  {
    key: "writing",
    match: /writer|novelist|poet|journalist|editor|essayist|publisher|translator|author|playwright/,
    label: { de: "Literatur & Presse", en: "Writing & press", "de-LS": "Bücher und Zeitungen" },
  },
  {
    key: "education",
    match: /teacher|educator|pedagogue|headmistress|school/,
    label: { de: "Bildung", en: "Education", "de-LS": "Schule und Lernen" },
  },
  {
    key: "medicine",
    match: /physician|nurse|midwife|doctor|surgeon|psychiatrist/,
    label: { de: "Medizin & Pflege", en: "Medicine & care", "de-LS": "Medizin" },
  },
  {
    key: "science",
    match:
      /scientist|mathematician|economist|sociologist|historian|physicist|chemist|astronomer|philosopher|biologist|psychologist|lawyer|jurist/,
    label: { de: "Wissenschaft & Recht", en: "Science & law", "de-LS": "Wissenschaft" },
  },
  {
    key: "arts",
    match: /painter|artist|actress|actor|singer|composer|musician|photographer|sculptor|dancer/,
    label: { de: "Kunst & Kultur", en: "Arts & culture", "de-LS": "Kunst" },
  },
  {
    key: "social",
    match: /social worker|philanthropist|trade unionist|reformer|pacifist|charity/,
    label: { de: "Soziales & Gewerkschaft", en: "Social work & unions", "de-LS": "Hilfe für Menschen" },
  },
];
const ACTIVISM = {
  key: "activism",
  label: { de: "Frauenbewegung", en: "Women's movement", "de-LS": "Frauen-Rechte" },
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

function dateAndPlace(date: string | undefined, place: string | undefined, lang: Lang) {
  return [date && formatPartialDate(date, lang), place && `${T.in[lang]} ${place}`].filter(Boolean).join(" ");
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

/* ------------------------------------------------------------------ main */

async function main() {
  console.log("1/5 Candidates from Wikidata …");
  const candidates = (await findCandidates()).sort((a, b) => b.sitelinks - a.sitelinks);
  console.log(`    ${candidates.length} candidates found`);

  // Oversample: some portraits will turn out not to be public domain.
  const sample = spreadSample(candidates, Math.min(candidates.length, Math.round(LIMIT * 1.8)));
  const entities = await getEntities(sample.map((c) => c.qid));

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
  const selected = spreadSample(withFreeImage, LIMIT);
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
  const taxonomy: Taxonomy = {
    field: Object.fromEntries([...FIELDS, ACTIVISM].map((f) => [f.key, f.label])),
    place: {},
  };
  const usedSlugs = new Set<string>();
  const skipped: string[] = [];
  let downloaded = 0;

  console.log("4/5 Writing biographies …");
  const queue = [...selected];
  while (queue.length > 0 && usedSlugs.size < LIMIT) {
    const candidate = queue.shift()!;
    const e = entities.get(candidate.qid)!;
    const name = label(e, "de")!;
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

    const placeKey = (prop: string) => {
      const place = cityOf(refs.get(entityIds(e, prop)[0]));
      const en = label(place, "en");
      if (!place || !en) return undefined;
      const key = slugify(en);
      taxonomy.place[key] ??= { de: label(place, "de")!, en, "de-LS": label(place, "de")! };
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
        place: [...new Set([bornPlace, diedPlace].filter((p): p is string => !!p))],
      },
      prominence:
        maxLog === minLog
          ? 0.5
          : Math.round(((Math.log(candidate.sitelinks) - minLog) / (maxLog - minLog)) * 100) / 100,
      sources: [
        { label: "Wikidata", url: `https://www.wikidata.org/wiki/${e.id}`, license: WIKIDATA_LICENSE },
        ...LANGS.map((lang) => ({
          label: `Wikipedia (${lang}): ${e.sitelinks[`${lang}wiki`].title}`,
          url: articleUrl(lang, e.sitelinks[`${lang}wiki`].title),
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
            ? [{ label: T.born[lang], value: dateAndPlace(born, place(bornPlace), lang) }]
            : []),
          ...(died || diedPlace
            ? [{ label: T.died[lang], value: dateAndPlace(died, place(diedPlace), lang) }]
            : []),
          ...(occupationNames.length > 0
            ? [{ label: T.field[lang], value: occupationNames.slice(0, 4).map(capitalize).join(", ") }]
            : []),
        ],
        timeline: buildTimeline(e, refs, lang, { born: place(bornPlace), died: place(diedPlace) }),
      };
      const story = await getStory(lang, e.sitelinks[`${lang}wiki`].title);
      await writeFile(path.join(dir, `${lang}.md`), frontmatterDoc(text, story));
    }

    console.log(`    [${usedSlugs.size}/${LIMIT}] ${name}`);
  }

  console.log("5/5 Writing taxonomy and cleaning up …");
  await writeFile(path.join(CONTENT, "taxonomy.json"), `${JSON.stringify(taxonomy, null, 2)}\n`);
  const removed = await removeStaleFolders(usedSlugs);

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
