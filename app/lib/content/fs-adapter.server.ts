import { readFile } from "node:fs/promises";
import path from "node:path";

import type { SiteConfig } from "~/lib/config/schema";
import type { ContentAdapter, PersonDetail, PersonListItem, PlaceCoords } from "./adapter";
import type { PortraitManifest } from "./images";
import { loadContent, type LoadedContent, type LoadedPerson } from "./load.server";

interface Loaded extends LoadedContent {
  images: PortraitManifest;
}

/**
 * Content adapter for the `content/` folder. Runs at build time (pre-rendering);
 * the whole folder is read once and kept in memory.
 *
 * @param manifestFile  image manifest written by scripts/build-images.ts
 */
export function createFsContentAdapter(
  root: string,
  config: SiteConfig,
  manifestFile: string,
): ContentAdapter {
  let loading: Promise<Loaded> | undefined;
  let placeCoords: Promise<PlaceCoords> | undefined;

  const load = () =>
    (loading ??= (async () => {
      const content = await loadContent(root, config);
      const errors = content.issues.filter((i) => i.level === "error");
      if (errors.length > 0) {
        const list = errors.map((e) => `  ${e.file}: ${e.message}`).join("\n");
        throw new Error(`Content is invalid (npm run validate:content):\n${list}`);
      }

      const images: PortraitManifest = JSON.parse(await readFile(manifestFile, "utf8").catch(() => "{}"));
      const missing = [...content.people.keys()].filter((slug) => !images[slug]);
      if (missing.length > 0) {
        throw new Error(
          `Portraits are missing for ${missing.length} people, e.g. ${missing.slice(0, 3).join(", ")}. ` +
            "Please run `npm run build:images`.",
        );
      }
      return { ...content, images };
    })());

  /** Text in the requested locale, else the default locale (marked via the returned locale). */
  const textFor = (entry: LoadedPerson, locale: string) => {
    const own = entry.texts.get(locale);
    if (own) return { locale, ...own };
    const fallback = entry.texts.get(config.defaultLocale)!;
    return { locale: config.defaultLocale, ...fallback };
  };

  return {
    async listPeople(locale) {
      const { people, images } = await load();
      return [...people.values()]
        .map((entry): PersonListItem => {
          const { person } = entry;
          const { locale: textLocale, text } = textFor(entry, locale);
          return {
            slug: person.slug,
            name: person.name,
            born: person.born,
            died: person.died,
            facets: person.facets,
            prominence: person.prominence,
            summary: text.summary,
            portraitAlt: text.portraitAlt,
            // No blurred placeholder in lists: it would bloat every overview page.
            image: (({ lqip: _lqip, ...thumb }) => thumb)(images[person.slug]),
            textLocale,
          };
        })
        .sort((a, b) => a.name.sort.localeCompare(b.name.sort, "de"));
    },

    async getPerson(slug, locale) {
      const { people, images } = await load();
      const entry = people.get(slug);
      if (!entry) return null;
      const { locale: textLocale, text, story } = textFor(entry, locale);
      const result: PersonDetail = { ...entry.person, locale: textLocale, text, story, image: images[slug] };
      return result;
    },

    async getLocales(slug) {
      const entry = (await load()).people.get(slug);
      return entry ? [...entry.texts.keys()] : [];
    },

    async listSlugs() {
      return [...(await load()).people.keys()];
    },

    async getTaxonomy() {
      return (await load()).taxonomy;
    },

    // content/places.json (scripts/add-coords.ts); optional, the map just stays empty without it.
    async getPlaceCoords() {
      return (placeCoords ??= readFile(path.join(root, "places.json"), "utf8").then(
        (json) => JSON.parse(json) as PlaceCoords,
        () => ({}),
      ));
    },
  };
}
