import { siteConfig } from "~/lib/config";
import type { FacetLabels } from "~/lib/search/search";
import { content } from "./index.server";

/**
 * Data for the people overview (canvas, list and search): all people plus the translated
 * labels of every facet value. The first "multi" facet is shown as tags.
 */
export async function loadPeopleIndex(locale: string) {
  const [people, taxonomy, coords] = await Promise.all([
    content.listPeople(locale),
    content.getTaxonomy(),
    content.getPlaceCoords(),
  ]);
  const facetLabels: FacetLabels = Object.fromEntries(
    siteConfig.facets.map((facet) => [
      facet.key,
      Object.fromEntries(
        Object.entries(taxonomy[facet.key] ?? {}).map(([value, labels]) => [
          value,
          labels[locale] ?? labels[siteConfig.defaultLocale] ?? value,
        ]),
      ),
    ]),
  );
  const tagFacet = siteConfig.facets.find((f) => f.type === "multi")?.key;
  // Only the places someone was born or died in (countries in the place facet have none).
  const placeCoords = Object.fromEntries(
    [...new Set(people.flatMap((p) => [p.born.place, p.died?.place]))]
      .filter((key): key is string => !!key && !!coords[key])
      .map((key) => [key, coords[key]!]),
  );
  return {
    people,
    tagFacet,
    tagLabels: tagFacet ? (facetLabels[tagFacet] ?? {}) : {},
    facetLabels,
    placeCoords,
  };
}
