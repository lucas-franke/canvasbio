import { useOutletContext } from "react-router";

import type { Route } from "./+types/person";
import { PERSON_HEADING_ID } from "~/components/detail/ids";
import { PersonDetail } from "~/components/detail/person-detail";
import { NotFoundContent } from "~/components/not-found-content";
import { siteConfig } from "~/lib/config";
import { content } from "~/lib/content/index.server";
import { renderMarkdown } from "~/lib/content/markdown.server";
import { messagesFor } from "~/lib/i18n";
import { localeFromPathname } from "~/lib/i18n/locale";
import { portraitUrl } from "~/lib/content/images";
import { pageMeta } from "~/lib/meta";
import type { PeopleLayoutContext } from "./people-layout";

export async function loader({ request, params }: Route.LoaderArgs) {
  const locale = localeFromPathname(new URL(request.url).pathname);
  const detail = await content.getPerson(params.slug, locale);
  if (!detail) throw new Response("Not found", { status: 404 });

  const m = messagesFor(locale);
  const { story, ...person } = detail;
  const storyHtml = await renderMarkdown(story, {
    // Story headings start at ##; inside the "Lebensgeschichte" tab (h2) they become h3.
    headingOffset: 1,
    footnoteLabel: m.detail.footnotes,
    footnoteBackLabel: m.detail.footnoteBack,
  });

  const taxonomy = await content.getTaxonomy();
  const tagFacet = siteConfig.facets.find((f) => f.type === "multi")?.key;
  const tags = (tagFacet ? (person.facets[tagFacet] ?? []) : [])
    .map((value) => taxonomy[tagFacet!]?.[value]?.[locale])
    .filter((label): label is string => Boolean(label));

  return { person, storyHtml, tags, locale };
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
  const { closeHref, sequence, hrefFor } = useOutletContext<PeopleLayoutContext>();
  return <PersonDetail {...loaderData} closeHref={closeHref} sequence={sequence} hrefFor={hrefFor} />;
}
