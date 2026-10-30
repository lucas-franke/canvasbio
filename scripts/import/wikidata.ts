import { chunk, fetchJson } from "./http";

const API = "https://www.wikidata.org/w/api.php";
const SPARQL = "https://query.wikidata.org/sparql";

/* Minimal typings for the parts of the Wikidata JSON we use. */
interface TimeValue {
  time: string;
  precision: number;
}
interface Snak {
  snaktype: string;
  datavalue?: { value: unknown };
}
export interface Statement {
  rank: "preferred" | "normal" | "deprecated";
  mainsnak: Snak;
  qualifiers?: Record<string, Snak[]>;
}
export interface Entity {
  id: string;
  labels: Record<string, { value: string }>;
  descriptions: Record<string, { value: string }>;
  claims: Record<string, Statement[]>;
  sitelinks: Record<string, { title: string }>;
}

export interface Candidate {
  qid: string;
  sitelinks: number;
}

/**
 * Women active in the women's movement, born from 1800 to `toYear`, with a portrait on Commons
 * and an English Wikipedia article (German is optional; the text falls back to English).
 */
export async function findCandidates(toYear = 1950): Promise<Candidate[]> {
  const query = `
    SELECT ?p (MAX(?links) AS ?sitelinks) WHERE {
      VALUES ?occ { wd:Q28692502 wd:Q27532437 wd:Q322170 wd:Q34074720 }
      ?p wdt:P106 ?occ; wdt:P21 wd:Q6581072; wdt:P18 ?img; wdt:P569 ?born; wikibase:sitelinks ?links.
      FILTER(YEAR(?born) >= 1800 && YEAR(?born) <= ${toYear})
      ?en schema:about ?p; schema:isPartOf <https://en.wikipedia.org/>.
    } GROUP BY ?p`;
  const data = await fetchJson<{
    results: { bindings: { p: { value: string }; sitelinks: { value: string } }[] };
  }>(`${SPARQL}?format=json&query=${encodeURIComponent(query)}`);
  return data.results.bindings.map((b) => ({
    qid: b.p.value.split("/").pop()!,
    sitelinks: Number(b.sitelinks.value),
  }));
}

/** Wikidata ids of the continents (P30) by their English name, for --focus. */
export const CONTINENT_IDS: Record<string, string> = {
  Africa: "Q15",
  Asia: "Q48",
  Europe: "Q46",
  "North America": "Q49",
  "South America": "Q18",
  Oceania: "Q538",
};

/** Occupations for the broader search in under-represented regions (see findRegionalCandidates). */
const BROAD_OCCUPATIONS = [
  "Q28692502", // women's rights activist
  "Q27532437", // suffragist
  "Q82955", // politician
  "Q15253558", // activist
  "Q11499147", // political activist
  "Q1476215", // human rights activist
  "Q1930187", // journalist
  "Q36180", // writer
  "Q49757", // poet
  "Q37226", // teacher
  "Q974144", // educator
  "Q39631", // physician
  "Q186360", // nurse
  "Q15627169", // trade unionist
];

type Bindings<K extends string> = { results: { bindings: Record<K, { value: string }>[] } };
const sparql = <K extends string>(query: string) =>
  fetchJson<Bindings<K>>(`${SPARQL}?format=json&query=${encodeURIComponent(query)}`);
const qidOf = (uri: string) => uri.split("/").pop()!;

/** Sovereign states on a continent. */
export async function countriesOn(continent: string): Promise<string[]> {
  const data = await sparql<"c">(`SELECT ?c WHERE { ?c wdt:P30 wd:${continent}; wdt:P31 wd:Q6256. }`);
  return data.results.bindings.map((b) => qidOf(b.c.value));
}

/**
 * Women with a citizenship of `country` and one of the broader occupations (politics,
 * activism, press, writing, education, medicine, unions), deceased, with a portrait. Ids only:
 * year of birth and the English article are checked on the loaded entities (much faster
 * queries). A country too large for one query is asked per occupation.
 */
export async function findRegionalCandidates(country: string): Promise<string[]> {
  const query = (occupations: string[]) => `
    SELECT DISTINCT ?p WHERE {
      VALUES ?occ { ${occupations.map((o) => `wd:${o}`).join(" ")} }
      ?p wdt:P27 wd:${country}; wdt:P106 ?occ.
      ?p wdt:P21 wd:Q6581072.
      ?p wdt:P570 ?died; wdt:P18 ?img.
    }`;
  try {
    return (await sparql<"p">(query(BROAD_OCCUPATIONS))).results.bindings.map((b) => qidOf(b.p.value));
  } catch {
    const ids = new Set<string>();
    for (const occupation of BROAD_OCCUPATIONS) {
      try {
        for (const b of (await sparql<"p">(query([occupation]))).results.bindings) ids.add(qidOf(b.p.value));
      } catch (error) {
        console.warn(`    skipped ${country}/${occupation}: ${(error as Error).message.slice(0, 80)}`);
      }
    }
    return [...ids];
  }
}

/**
 * Loads full entities in batches of 50 (API limit). Large entities (countries have thousands
 * of statements) can exceed the API's response limit: it then silently leaves entities out
 * and only warns, so such a batch is loaded again in halves.
 */
export async function getEntities(ids: string[]): Promise<Map<string, Entity>> {
  const result = new Map<string, Entity>();
  for (const batch of chunk([...new Set(ids)], 50)) {
    for (const [id, entity] of await getBatch(batch)) result.set(id, entity);
  }
  return result;
}

async function getBatch(ids: string[]): Promise<Map<string, Entity>> {
  const url = `${API}?action=wbgetentities&format=json&props=labels|descriptions|claims|sitelinks&languages=de|en&ids=${ids.join("|")}`;
  const data = await fetchJson<{
    entities?: Record<string, Entity>;
    warnings?: { result?: unknown };
    error?: { info?: string };
  }>(url);
  if (!data.entities) throw new Error(`Wikidata: ${data.error?.info ?? "no entities"} (${ids.slice(0, 3).join(", ")} …)`);
  if (data.warnings?.result && ids.length > 1) {
    const half = Math.ceil(ids.length / 2);
    const [a, b] = await Promise.all([getBatch(ids.slice(0, half)), getBatch(ids.slice(half))]);
    return new Map([...a, ...b]);
  }
  const result = new Map<string, Entity>();
  for (const [id, entity] of Object.entries(data.entities)) {
    if ("missing" in entity) continue;
    result.set(id, entity);
  }
  return result;
}

/** Statements of a property, best rank first, deprecated ones dropped. */
export function statements(entity: Entity, property: string): Statement[] {
  const all = (entity.claims[property] ?? []).filter((s) => s.rank !== "deprecated" && s.mainsnak.datavalue);
  const preferred = all.filter((s) => s.rank === "preferred");
  return preferred.length > 0 ? preferred : all;
}

export function entityIds(entity: Entity, property: string): string[] {
  return statements(entity, property).map((s) => (s.mainsnak.datavalue!.value as { id: string }).id);
}

export function stringValue(entity: Entity, property: string): string | undefined {
  const value = statements(entity, property)[0]?.mainsnak.datavalue?.value;
  return typeof value === "string" ? value : undefined;
}

/** Converts a Wikidata time value to a partial ISO date matching its precision. */
export function toPartialDate(value: TimeValue | undefined): string | undefined {
  if (!value || value.precision < 9) return undefined;
  const match = value.time.match(/^([+-])(\d{4,})-(\d{2})-(\d{2})/);
  if (!match) return undefined;
  const [, sign, year, month, day] = match;
  const y = `${sign === "-" ? "-" : ""}${year.slice(-4)}`;
  if (value.precision === 9 || month === "00") return y;
  if (value.precision === 10 || day === "00") return `${y}-${month}`;
  return `${y}-${month}-${day}`;
}

export function dateOf(entity: Entity, property: string): string | undefined {
  return toPartialDate(statements(entity, property)[0]?.mainsnak.datavalue?.value as TimeValue | undefined);
}

export function qualifierDate(statement: Statement, property: string): string | undefined {
  return toPartialDate(statement.qualifiers?.[property]?.[0]?.datavalue?.value as TimeValue | undefined);
}

export function label(entity: Entity | undefined, lang: "de" | "en"): string | undefined {
  return entity?.labels[lang]?.value ?? entity?.labels[lang === "de" ? "en" : "de"]?.value;
}

/** Female form of an occupation label (P2521), e.g. "Schriftstellerin" instead of "Schriftsteller". */
export function femaleLabel(entity: Entity | undefined, lang: "de" | "en"): string | undefined {
  const forms = (entity?.claims.P2521 ?? [])
    .map((s) => s.mainsnak.datavalue?.value as { text: string; language: string } | undefined)
    .filter((v): v is { text: string; language: string } => v?.language === lang);
  return forms[0]?.text ?? label(entity, lang);
}

/**
 * Country entity per place (P17, else up the administrative parents P131), for the places
 * given. Loads missing parents and countries; keys of the result are the place ids.
 */
export async function countriesOf(places: Entity[]): Promise<Map<string, Entity>> {
  const known = new Map<string, Entity>(places.map((p) => [p.id, p]));
  const countryId = new Map<string, string>();
  let pending = places;
  for (let level = 0; level < 4 && pending.length > 0; level++) {
    const parents: string[] = [];
    for (const place of pending) {
      const direct = entityIds(place, "P17")[0];
      if (direct) countryId.set(place.id, direct);
      else parents.push(...entityIds(place, "P131").slice(0, 1));
    }
    const missing = parents.filter((id) => !known.has(id));
    for (const [id, entity] of await getEntities(missing)) known.set(id, entity);
    // Places without a country of their own take the country of their parent in the next round.
    const next = pending.filter((p) => !countryId.has(p.id));
    pending = next.flatMap((p) => {
      const parent = known.get(entityIds(p, "P131")[0] ?? "");
      return parent ? [{ ...parent, id: p.id, claims: parent.claims }] : [];
    });
  }
  const countries = await getEntities([...new Set(countryId.values())]);
  const result = new Map<string, Entity>();
  for (const [placeId, id] of countryId) {
    const country = countries.get(id);
    if (country) result.set(placeId, country);
  }
  return result;
}

/** [longitude, latitude] of an entity's coordinate location (P625), rounded to ~100 m. */
export function coordsOf(entity: Entity | undefined): [number, number] | undefined {
  const value = entity && (statements(entity, "P625")[0]?.mainsnak.datavalue?.value as
    | { latitude: number; longitude: number }
    | undefined);
  if (!value) return undefined;
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return [round(value.longitude), round(value.latitude)];
}

/** The six continents of the place facet, with fixed labels (Wikidata has several variants). */
const CONTINENTS: Record<string, { key: string; de: string; en: string }[]> = {
  Q15: [{ key: "africa", de: "Afrika", en: "Africa" }],
  Q46: [{ key: "europe", de: "Europa", en: "Europe" }],
  Q48: [{ key: "asia", de: "Asien", en: "Asia" }],
  Q49: [{ key: "north-america", de: "Nordamerika", en: "North America" }],
  Q18: [{ key: "south-america", de: "Südamerika", en: "South America" }],
  Q538: [{ key: "oceania", de: "Ozeanien", en: "Oceania" }],
  // Insular Oceania, the Australian continent
  Q55643: [{ key: "oceania", de: "Ozeanien", en: "Oceania" }],
  Q3960: [{ key: "oceania", de: "Ozeanien", en: "Oceania" }],
  // Eurasia
  Q5401: [
    { key: "europe", de: "Europa", en: "Europe" },
    { key: "asia", de: "Asien", en: "Asia" },
  ],
};

/** Continents of a country (P30); a country on two (Turkey, Russia) has both. */
export function continentsOf(country: Entity | undefined): { key: string; de: string; en: string }[] {
  if (!country) return [];
  const all = entityIds(country, "P30").flatMap((id) => CONTINENTS[id] ?? []);
  return all.filter((c, i) => all.findIndex((other) => other.key === c.key) === i);
}
