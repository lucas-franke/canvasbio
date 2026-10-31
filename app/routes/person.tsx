import { useOutletContext } from "react-router";

import type { Route } from "./+types/person";
import { PERSON_HEADING_ID } from "~/components/detail/ids";
import { PersonDetail, type RelatedPerson } from "~/components/detail/person-detail";
import { NotFoundContent } from "~/components/not-found-content";
import { requestPath } from "~/lib/base-path";
import { content } from "~/lib/content/index.server";
import { renderMarkdown, type Heading } from "~/lib/content/markdown.server";
import { loadPeopleIndex } from "~/lib/content/people-index.server";
import { relatedPeople } from "~/lib/content/related";
import { messagesFor } from "~/lib/i18n";
import { localeFromPathname } from "~/lib/i18n/locale";
import { portraitUrl } from "~/lib/content/images";
import { pageMeta } from "~/lib/meta";
import type { PeopleLayoutContext } from "./people-layout";

/** Average silent reading speed (German and English prose). */
const WORDS_PER_MINUTE = 200;

export async function loader({ request, params }: Route.LoaderArgs) {
  const locale = localeFromPathname(requestPath(request));
  const detail = await content.getPerson(params.slug, locale);
  if (!detail) throw new Response("Not found", { status: 404 });

  const m = messagesFor(locale);
  const { story, ...person } = detail;
  const headings: Heading[] = [];
  const storyHtml = await renderMarkdown(story, {
    // Story headings start at ##; inside the life story tab (h2) they become h3.
    headingOffset: 1,
    headingIdPrefix: "story-",
    headings,
    footnoteLabel: m.detail.footnotes,
    footnoteBackLabel: m.detail.footnoteBack,
  });

  const { people, tagFacet, facetLabels } = await loadPeopleIndex(locale);
  const tags = (tagFacet ? (person.facets[tagFacet] ?? []) : [])
    .map((value) => facetLabels[tagFacet!]?.[value])
    .filter((label): label is string => Boolean(label));

  // Computed while pre-rendering: the links are in the HTML, the browser gets only four entries.
  const related: RelatedPerson[] = relatedPeople(person, people).map(({ person: p, reasons }) => ({
    slug: p.slug,
    name: p.name,
    born: p.born,
    died: p.died,
    image: p.image,
    reasons: reasons
      .slice(0, 2)
      .map((r) => (r.kind === "era" ? m.detail.sameEra : (facetLabels[r.facet]?.[r.value] ?? r.value))),
  }));

  // A table of contents only pays off for longer stories with several sections.
  const topLevel = Math.min(...headings.map((h) => h.level));
  const outline = headings.filter((h) => h.level === topLevel);
  const storyInfo = {
    outline: outline.length >= 3 ? outline.map(({ id, text }) => ({ id, text })) : [],
    readingMinutes: Math.max(1, Math.round(story.split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE)),
  };

  return { person, storyHtml, storyInfo, tags, related, locale };
}

export function meta({ loaderData, location }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { person, locale } = loaderData;
  const width = Math.min(1280, person.image.width);
  return pageMeta({
    title: person.name.display,
    description: person.text.summary.join(" · "),
    locale,
    path: location.pathname,
    image: {
      path: portraitUrl(person.slug, "full", 1280, "webp", person.image.hash),
      alt: person.text.portraitAlt,
      width,
      height: Math.round((width * person.image.height) / person.image.width),
    },
  });
}

/**
 * Unknown slugs aren't pre-rendered, so the browser can't load their data. Whatever the
 * cause, show "not found" in the detail panel — the overview next to it stays usable.
 */
export function ErrorBoundary() {
  return (
    <div className="px-5 pt-16 pb-28 sm:px-10">
      <NotFoundContent headingId={PERSON_HEADING_ID} />
    </div>
  );
}

export default function Person({ loaderData }: Route.ComponentProps) {
  const { closeHref, close, sequence, hrefFor } = useOutletContext<PeopleLayoutContext>();
  return (
    <PersonDetail {...loaderData} closeHref={closeHref} onClose={close} sequence={sequence} hrefFor={hrefFor} />
  );
}
