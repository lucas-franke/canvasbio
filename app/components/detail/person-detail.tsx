import { cn } from "cn";
import { ArrowLeft, ArrowRight, Clock, Quote, Shuffle, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";

import { Portrait } from "~/components/portrait";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { siteConfig } from "~/lib/config";
import type { PersonDetail as PersonDetailData, PersonListItem } from "~/lib/content/adapter";
import { lifeYears } from "~/lib/content/format";
import { useHydrated } from "~/lib/hooks";
import { useLocale, useMessages } from "~/lib/i18n";
import { localeConfig, pagePath } from "~/lib/i18n/locale";
import { htmlLangFor, localize } from "~/lib/i18n/localize";
import { tornEdgeClass } from "~/lib/canvas/torn-edge";
import { readSeen } from "~/lib/preferences";
import { pickRandom } from "~/lib/random";
import { PERSON_HEADING_ID } from "./ids";

type TabId = (typeof siteConfig.detail.tabs)[number]["id"];

/** A related person as shown at the end of a biography (see app/lib/content/related.ts). */
export type RelatedPerson = Pick<PersonListItem, "slug" | "name" | "born" | "died" | "image"> & {
  /** Translated reasons, strongest first (e.g. a shared place). */
  reasons: string[];
};

export interface StoryInfo {
  /** Sections of the life story (only for longer stories). */
  outline: { id: string; text: string }[];
  readingMinutes: number;
}

interface PersonDetailProps {
  person: Omit<PersonDetailData, "story">;
  storyHtml: string;
  storyInfo?: StoryInfo;
  tags: string[];
  related?: RelatedPerson[];
  /** Locale of the page (the text may be in another one if not translated). */
  locale: string;
  closeHref: string;
  /** Closes the biography in place of following `closeHref` (e.g. to animate the sheet away first). */
  onClose?: () => void;
  /** People in overview order, for previous/next and another random one (null while loading). */
  sequence?: PersonListItem[] | null;
  hrefFor?: (slug: string) => string;
}

/** Tab ↔ URL hash, e.g. "#lebenslauf". The first tab has no hash. */
function useTabFromHash(locale: string): [TabId, (tab: TabId) => void] {
  const tabs = siteConfig.detail.tabs;
  const location = useLocation();
  const navigate = useNavigate();
  const fromHash = (hash: string) =>
    tabs.find((t) => t.slug[locale] && `#${t.slug[locale]}` === hash)?.id ?? tabs[0].id;

  // Pre-rendered HTML shows the first tab; the hash is applied once hydrated (no mismatch).
  const hydrated = useHydrated();
  const tab = hydrated ? fromHash(location.hash) : tabs[0].id;

  const select = (next: TabId) => {
    const slug = tabs.find((t) => t.id === next)?.slug[locale];
    navigate({ hash: slug ? `#${slug}` : "" }, { replace: true, preventScrollReset: true });
  };
  return [tab, select];
}

export function PersonDetail({
  person,
  storyHtml,
  storyInfo,
  tags,
  related = [],
  locale,
  closeHref,
  onClose,
  sequence,
  hrefFor,
}: PersonDetailProps) {
  const m = useMessages();
  const [tab, setTab] = useTabFromHash(locale);
  const { text } = person;
  // Text not available in this locale (an optional language): say so and mark its real language.
  const fallback = person.locale !== locale;
  const textLang = fallback ? htmlLangFor(person.locale) : undefined;

  return (
    <article className="@container flex min-h-full flex-col gap-6 px-5 pb-28 sm:px-10 lg:pb-16">
      {/* Sticky bar without a background: the portrait reaches the top edge, and closing stays
          in reach while reading a long story, floating on its own round background. */}
      <div className="pointer-events-none sticky top-0 z-20 -mx-5 -mb-6 flex h-16 items-center justify-end px-5 sm:-mx-10 sm:px-10 print:hidden">
        {/* Grab handle: the sheet on phones can be swiped down to close (app/lib/swipe-to-close.ts). */}
        <span
          aria-hidden="true"
          // Light with a dark ring: visible on the portrait and on the page colour alike.
          className="absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-surface shadow-sm ring-1 ring-emphasis/25 lg:hidden"
        />
        <Link
          to={closeHref}
          preventScrollReset
          viewTransition
          onClick={(event) => {
            if (!onClose || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            onClose();
          }}
          aria-label={m.detail.close}
          title={m.detail.close}
          className="hit-44 pointer-events-auto -mr-1.5 grid size-10 shrink-0 place-items-center rounded-full bg-surface/85 text-emphasis shadow-[0_2px_8px_rgb(0_0_0/0.18)] ring-1 ring-line/60 backdrop-blur-sm transition-colors hover:bg-surface"
        >
          <X aria-hidden="true" className="size-5" />
        </Link>
      </div>

      {/* Phones: the biography opens with the portrait (desktop shows it next to the facts). */}
      <div data-tint className="relative -mx-5 -mt-16 sm:-mx-10 lg:hidden">
        <Portrait
          slug={person.slug}
          image={person.image}
          kind="full"
          alt={text.portraitAlt}
          sizes="100vw"
          loading="eager"
          className="block aspect-4/3 max-h-[45dvh] w-full object-cover object-[50%_25%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -bottom-px z-1 h-1/2 bg-linear-to-t from-surface from-15% via-surface/60 to-transparent"
        />
      </div>

      <header className="relative -mt-10 flex flex-col gap-3 lg:mt-0">
        <h1 id={PERSON_HEADING_ID} tabIndex={-1} className="text-h1 focus-target">
          {person.name.display}
        </h1>
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-lg border border-control px-2 py-0.5 text-body-xs text-emphasis"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </header>

      {fallback && (
        <p className="rounded-xl border-l-4 border-brand bg-brand/10 px-4 py-3 text-body-sm text-emphasis">
          {m.detail.notTranslated(localeConfig(locale).label)}
        </p>
      )}

      <Tabs value={tab} onValueChange={(value) => setTab(value as TabId)}>
        {/* Sticks in the top line once scrolled, next to the close button (room kept free on the
            right). No bar background: like the close button, the tabs float on their own. */}
        <div className="pointer-events-none sticky top-0 z-10 -mx-5 flex min-h-16 items-center py-2 pr-16 pl-5 sm:-mx-10 sm:pr-20 sm:pl-10 print:hidden">
          <TabsList
            aria-label={m.detail.sections}
            className="pointer-events-auto bg-surface/85 shadow-[0_2px_8px_rgb(0_0_0/0.18)] backdrop-blur-sm"
          >
            {siteConfig.detail.tabs.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="max-sm:px-2.5">
                {t.shortLabel ? (
                  <>
                    <span aria-hidden="true" className="sm:hidden">
                      {localize(t.shortLabel, locale)}
                    </span>
                    <span className="max-sm:sr-only">{localize(t.label, locale)}</span>
                  </>
                ) : (
                  localize(t.label, locale)
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {siteConfig.detail.tabs.map((t) => (
          // All panels stay in the HTML (search engines, no-JS); inactive ones are hidden.
          <TabsContent key={t.id} value={t.id} forceMount lang={textLang}>
            <h2 className="mb-5 text-h2">{localize(t.label, locale)}</h2>
            {t.id === "facts" && <FactsPanel person={person} />}
            {t.id === "story" && <StoryPanel person={person} storyHtml={storyHtml} info={storyInfo} />}
            {t.id === "timeline" && <TimelinePanel timeline={text.timeline} />}
          </TabsContent>
        ))}
      </Tabs>

      {related.length > 0 && (
        <RelatedPeople people={related} hrefFor={hrefFor ?? ((s) => pagePath(locale, "people", s))} />
      )}
      {sequence && hrefFor && <MoreBiographies slug={person.slug} sequence={sequence} hrefFor={hrefFor} />}
    </article>
  );
}

/** People connected by a shared field, place or era — a way to explore by content. */
function RelatedPeople({ people, hrefFor }: { people: RelatedPerson[]; hrefFor: (slug: string) => string }) {
  const m = useMessages();
  return (
    <section
      aria-labelledby="related-heading"
      className="mt-4 flex flex-col gap-4 border-t border-line pt-6 print:hidden"
    >
      <h2 id="related-heading" className="text-h3">
        {m.detail.related}
      </h2>
      <ul className="grid gap-3 @md:grid-cols-2">
        {people.map((p) => (
          <li key={p.slug}>
            <Link
              to={hrefFor(p.slug)}
              preventScrollReset
              viewTransition
              className="flex min-h-20 items-center gap-4 rounded-xl border border-line p-2 pr-4 hover:bg-emphasis/5"
            >
              <Portrait
                slug={p.slug}
                image={p.image}
                alt=""
                sizes="4rem"
                className="size-16 shrink-0 rounded-lg object-cover"
              />
              <span className="flex min-w-0 flex-col">
                <span className="font-heading text-body text-emphasis">{p.name.display}</span>
                <span className="text-body-xs text-muted-text">
                  {lifeYears(p.born, p.died)}
                  {p.reasons.length > 0 && <> · {p.reasons.join(" · ")}</>}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Keeps the exploration going at the end of a biography: previous and next in the order of
 * the overview (or of the search results), and another random biography.
 */
function MoreBiographies({
  slug,
  sequence,
  hrefFor,
}: {
  slug: string;
  sequence: PersonListItem[];
  hrefFor: (slug: string) => string;
}) {
  const m = useMessages();
  const navigate = useNavigate();
  const position = sequence.findIndex((p) => p.slug === slug);
  if (sequence.length < 2) return null;
  // Not in the current results (e.g. opened via a link): start from the beginning.
  const previous =
    position < 0 ? sequence.at(-1)! : sequence[(position - 1 + sequence.length) % sequence.length]!;
  const next = position < 0 ? sequence[0]! : sequence[(position + 1) % sequence.length]!;

  const linkClass =
    "group/more flex min-h-16 flex-col justify-center gap-0.5 rounded-xl border border-line px-4 py-3 hover:bg-emphasis/5";
  return (
    <nav
      aria-label={m.detail.more}
      className="mt-4 flex flex-col gap-3 border-t border-line pt-6 print:hidden"
    >
      <div className="grid gap-3 @md:grid-cols-2">
        <Link to={hrefFor(previous.slug)} preventScrollReset viewTransition className={linkClass}>
          <span className="flex items-center gap-1.5 text-body-sm text-muted-text">
            <ArrowLeft aria-hidden="true" className="size-4" />
            {m.detail.previous}
          </span>
          <span className="font-heading text-h3 text-emphasis">{previous.name.display}</span>
        </Link>
        <Link
          to={hrefFor(next.slug)}
          preventScrollReset
          viewTransition
          className={cn(linkClass, "@md:items-end @md:text-right")}
        >
          <span className="flex items-center gap-1.5 text-body-sm text-muted-text">
            {m.detail.next}
            <ArrowRight aria-hidden="true" className="size-4" />
          </span>
          <span className="font-heading text-h3 text-emphasis">{next.name.display}</span>
        </Link>
      </div>
      <Button
        variant="secondary"
        className="self-start"
        onClick={() => {
          const person = pickRandom(sequence, { seen: readSeen(), exclude: slug });
          if (person) navigate(hrefFor(person.slug), { preventScrollReset: true, viewTransition: true });
        }}
      >
        <Shuffle aria-hidden="true" />
        {m.random.label}
      </Button>
    </nav>
  );
}

function FactsPanel({ person }: { person: PersonDetailProps["person"] }) {
  const m = useMessages();
  const { text, portrait } = person;

  return (
    <div className="@container/facts flex flex-col gap-8">
      <div className="flex flex-col gap-8 @2xl/facts:flex-row @2xl/facts:items-start">
        <div className="flex flex-1 flex-col gap-6">
          <p className="font-heading text-subline text-emphasis">{text.summary[0]}</p>
          {text.facts.length > 0 && (
            <dl className="grid gap-x-4 gap-y-2 @sm/facts:grid-cols-[auto_1fr]">
              {text.facts.map((fact) => (
                <div key={fact.label} className="contents">
                  <dt className="font-medium text-emphasis">{fact.label}</dt>
                  <dd className="mb-2 @sm/facts:mb-0">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {text.quote && (
            <figure className="flex flex-col gap-3">
              <Quote aria-hidden="true" className="size-9 rotate-180 fill-brand stroke-none" />
              <blockquote lang={text.quote.lang} className="font-heading text-subline text-brand italic">
                <p>„{text.quote.text}“</p>
              </blockquote>
              <figcaption className="flex items-start gap-3 text-body-sm text-muted-text">
                <span aria-hidden="true" className="mt-[0.775em] h-px w-6 shrink-0 bg-muted-text" />
                {text.quote.source}
              </figcaption>
            </figure>
          )}
        </div>

        <figure className="flex w-full max-w-64 flex-col gap-2 @2xl/facts:w-72 @2xl/facts:max-w-none @2xl/facts:shrink-0">
          {/* Target of the portrait morph from the overview (app/lib/view-transition.ts).
              On phones the portrait is at the top of the biography; the credit stays here. */}
          <div
            data-vt-detail-portrait
            data-tint
            className={cn(
              "hidden lg:block",
              siteConfig.theme.tileEdge === "torn" && tornEdgeClass(person.slug),
            )}
          >
            <Portrait
              slug={person.slug}
              image={person.image}
              kind="full"
              alt={text.portraitAlt}
              sizes="(min-width: 1024px) 18rem, 24rem"
              loading="eager"
              className="h-auto w-full"
            />
          </div>
          <figcaption className="text-body-xs text-muted-text">
            {m.detail.portraitCredit}: {portrait.credit} ·{" "}
            <a href={portrait.sourceUrl} className="underline underline-offset-2 hover:decoration-2">
              {portrait.license.name}
            </a>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

function StoryPanel({
  person,
  storyHtml,
  info,
}: {
  person: PersonDetailProps["person"];
  storyHtml: string;
  info?: StoryInfo;
}) {
  const m = useMessages();
  const locale = useLocale();
  const storyLang = person.text.storyLang;
  const foreignStory = storyLang && storyLang !== locale ? storyLang : undefined;
  // In-page links must not touch the URL hash: it selects the tab.
  const jumpTo = (event: React.MouseEvent, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  };
  return (
    <div className="flex flex-col gap-10">
      {info && (
        <div className="-mt-2 flex flex-col gap-4 print:hidden">
          <p className="flex items-center gap-2 text-body-sm text-muted-text">
            <Clock aria-hidden="true" className="size-4" />
            {m.detail.readingTime(info.readingMinutes)}
          </p>
          {info.outline.length > 0 && (
            <nav aria-labelledby="outline-heading" className="rounded-xl border border-line p-4">
              <h3 id="outline-heading" className="mb-2 font-sans text-label font-semibold text-emphasis">
                {m.detail.outline}
              </h3>
              <ol className="flex flex-col">
                {info.outline.map((heading) => (
                  <li key={heading.id}>
                    <a
                      href={`#${heading.id}`}
                      onClick={(event) => jumpTo(event, heading.id)}
                      className="inline-flex min-h-11 items-center text-brand underline decoration-1 underline-offset-[0.2em] hover:decoration-2"
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </div>
      )}
      {foreignStory && (
        <p className="-mt-4 text-body-sm text-muted-text">
          {m.detail.storyOnlyIn(foreignStory === "en" ? (locale === "de" ? "Englisch" : "English") : foreignStory)}
        </p>
      )}
      <div className="prose-content" lang={foreignStory} dangerouslySetInnerHTML={{ __html: storyHtml }} />
      <section aria-labelledby="sources-heading" className="flex flex-col gap-3 border-t border-line pt-6">
        <h3 id="sources-heading" className="text-h3">
          {m.detail.sources}
        </h3>
        <ul className="print-urls flex flex-col gap-2 text-body-sm">
          {person.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} className="text-brand underline underline-offset-2 hover:decoration-2">
                {source.label}
              </a>
              {source.license && (
                <>
                  {" "}
                  · {m.detail.license}:{" "}
                  {source.license.url ? (
                    <a href={source.license.url} className="underline underline-offset-2 hover:decoration-2">
                      {source.license.name}
                    </a>
                  ) : (
                    source.license.name
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function TimelinePanel({ timeline }: { timeline: { date: string; event: string }[] }) {
  return (
    // A vertical line with a marker per entry: the order in time is visible at a glance.
    <ol className="ml-1.5 flex flex-col border-l-2 border-line">
      {timeline.map((entry, i) => (
        <li key={`${entry.date}-${i}`} className="relative flex flex-col gap-0.5 py-3 pl-6">
          <span
            aria-hidden="true"
            className="absolute top-[1.15rem] -left-[0.4375rem] size-3 rounded-full bg-brand ring-4 ring-surface"
          />
          <span className="font-medium text-brand">{entry.date}</span>
          <span>{entry.event}</span>
        </li>
      ))}
    </ol>
  );
}
