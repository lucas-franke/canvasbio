import type { PortraitManifestEntry, PortraitThumb } from "./images";
import type { Person, PersonLocalized, PersonText, Taxonomy } from "./schema";

/** Lightweight entry for canvas, list and search: no life story, no timeline. */
export type PlaceCoords = Record<string, [number, number]>;

/** Place keys of the countries per continent key. */
export type Regions = Record<string, string[]>;

export interface PersonListItem {
  slug: string;
  name: Person["name"];
  born: Person["born"];
  died?: Person["died"];
  facets: Person["facets"];
  prominence: number;
  summary: PersonText["summary"];
  portraitAlt: string;
  /** Generated image variants (see scripts/build-images.ts). */
  image: PortraitThumb;
  /** Locale the texts are actually in (differs from the requested one if not translated). */
  textLocale: string;
}

export interface PersonDetail extends PersonLocalized {
  image: PortraitManifestEntry;
}

/**
 * Source of all biography content. The file-system adapter is the default;
 * a CMS adapter only has to implement this interface.
 */
export interface ContentAdapter {
  listPeople(locale: string): Promise<PersonListItem[]>;
  /**
   * Full person in the requested locale. If that locale has no text and it isn't required
   * (contentRequired: false), the default locale is returned with `locale` set accordingly.
   */
  getPerson(slug: string, locale: string): Promise<PersonDetail | null>;
  /** Locales a person has texts for. */
  getLocales(slug: string): Promise<string[]>;
  listSlugs(): Promise<string[]>;
  getTaxonomy(): Promise<Taxonomy>;
  /** [longitude, latitude] per place key, for the map view (places without are left out). */
  getPlaceCoords(): Promise<PlaceCoords>;
  /** Countries per continent (place keys), for the grouped place suggestions. */
  getRegions(): Promise<Regions>;
}
