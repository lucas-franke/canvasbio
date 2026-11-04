/**
 * Place keys are made from the place's name ("hamburg"), but different places share names:
 * Hamburg in Germany and in South Carolina, Cambridge in England and in Massachusetts. These
 * helpers tell them apart, so each place gets a key, a label and coordinates of its own.
 */
import { entityIds, getEntities, label, type Entity } from "./wikidata";

/** Distance in km between two [longitude, latitude] points (good enough at this scale). */
export function kmBetween(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const x = (b[0] - a[0]) * rad * Math.cos(((a[1] + b[1]) / 2) * rad);
  const y = (b[1] - a[1]) * rad;
  return Math.sqrt(x * x + y * y) * 6371;
}

/**
 * Whether two places are one for the map and the search: the same entity, or less than
 * 100 km apart (a district and its city, e.g. an arrondissement and Paris).
 */
export function samePlace(
  a: { id: string; coords?: [number, number] },
  b: { id: string; coords?: [number, number] },
): boolean {
  if (a.id === b.id) return true;
  return Boolean(a.coords && b.coords && kmBetween(a.coords, b.coords) < 100);
}

/** The region directly below the country a place lies in (a state, province or county). */
async function regionOf(place: Entity, country: string | undefined): Promise<Entity | undefined> {
  let current = place;
  for (let level = 0; level < 6; level++) {
    const parentId = entityIds(current, "P131")[0];
    if (!parentId || parentId === country) return level === 0 ? undefined : current;
    const parent = (await getEntities([parentId])).get(parentId);
    if (!parent) return level === 0 ? undefined : current;
    current = parent;
  }
  return current;
}

/**
 * What tells `place` apart from `other` with the same name: the country if they lie in
 * different ones, else the region. Returns German and English labels, e.g.
 * { de: "Vereinigte Staaten", en: "United States" } or { de: "Maine", en: "Maine" }.
 */
export async function qualifierOf(
  place: Entity,
  other: Entity,
): Promise<{ de: string; en: string } | undefined> {
  const country = entityIds(place, "P17")[0];
  const otherCountry = entityIds(other, "P17")[0];
  const by =
    country && country !== otherCountry
      ? (await getEntities([country])).get(country)
      : await regionOf(place, country);
  const en = label(by, "en");
  return by && en ? { de: label(by, "de") ?? en, en } : undefined;
}
