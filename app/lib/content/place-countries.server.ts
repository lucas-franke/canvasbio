import { siteConfig } from "~/lib/config";
import type { PersonListItem, Regions } from "./adapter";
import { content } from "./index.server";
import type { Taxonomy } from "./schema";

/**
 * The country of every place someone was born or died in, for the grouped list of places next
 * to the map (continent → country → place). The content has no such field: the place facet of
 * a person lists her places, countries and continents together.
 *
 * 1. A place belongs to the country that every person linked to it has in her place facet.
 * 2. Where that leaves several (born in Germany, died in Russia), the key facts settle it:
 *    "5. Juli 1857 in Königshain-Wiederau, Deutschland" names the country after the place.
 *
 * Places that stay unclear are left out (the list shows them under "other places").
 * Computed once per build; it doesn't depend on the language.
 */
let cache: Promise<Record<string, string>> | undefined;

export function placeCountries(
  people: PersonListItem[],
  taxonomy: Taxonomy,
  regions: Regions,
): Promise<Record<string, string>> {
  cache ??= derive(people, taxonomy, regions);
  return cache;
}

async function derive(
  people: PersonListItem[],
  taxonomy: Taxonomy,
  regions: Regions,
): Promise<Record<string, string>> {
  const countries = new Set(Object.values(regions).flat());
  const labels = taxonomy.place ?? {};

  // Step 1: the countries all people linked to a place have in common.
  const shared = new Map<string, Set<string>>();
  const linked = new Map<string, string[]>();
  for (const person of people) {
    const own = (person.facets.place ?? []).filter((value) => countries.has(value));
    for (const place of [person.born.place, person.died?.place]) {
      if (!place) continue;
      linked.set(place, [...(linked.get(place) ?? []), person.slug]);
      const previous = shared.get(place);
      shared.set(place, new Set(previous ? own.filter((c) => previous.has(c)) : own));
    }
  }

  const result: Record<string, string> = {};
  const unclear: string[] = [];
  for (const [place, candidates] of shared) {
    if (countries.has(place)) result[place] = place;
    else if (candidates.size === 1) result[place] = [...candidates][0]!;
    else unclear.push(place);
  }
  if (unclear.length === 0) return result;

  // Step 2: the country named after the place in the key facts.
  const byLabel = new Map<string, string>();
  for (const country of countries) {
    for (const label of Object.values(labels[country] ?? {})) byLabel.set(label, country);
  }
  const locale = siteConfig.defaultLocale;
  const facts = new Map<string, string[]>();
  const factsOf = async (slug: string) => {
    if (!facts.has(slug)) {
      const person = await content.getPerson(slug, locale);
      facts.set(slug, person?.text.facts.map((fact) => fact.value) ?? []);
    }
    return facts.get(slug)!;
  };
  for (const place of unclear) {
    const label = labels[place]?.[locale];
    if (!label) continue;
    const named = new Set<string>();
    for (const slug of linked.get(place) ?? []) {
      for (const value of await factsOf(slug)) {
        if (!value.includes(label)) continue;
        const country = byLabel.get(value.split(",").at(-1)!.trim());
        if (country) named.add(country);
      }
    }
    if (named.size === 1) result[place] = [...named][0]!;
  }
  return result;
}
