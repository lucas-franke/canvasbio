import { siteConfig } from "~/lib/config";
import type { FacetLabels } from "~/lib/search/search";
import { content } from "./index.server";

/**
 * Data for the people overview (canvas, list and search): all people plus the translated
 * labels of every facet value. The first "multi" facet is shown as tags.
 */
export async function loadPeopleIndex(locale: string) {
  const [people, taxonomy] = await Promise.all([content.listPeople(locale), content.getTaxonomy()]);
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
  return { people, tagFacet, tagLabels: tagFacet ? (facetLabels[tagFacet] ?? {}) : {}, facetLabels };
}
