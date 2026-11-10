import { cn } from "cn";
import { ArrowLeft, ArrowRight, Check, Quote, Share, Shuffle, X } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { Portrait } from "~/components/portrait";
import { Button, buttonVariants } from "~/components/ui/button";
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

/** A related person as shown at the end of a biography (see app/lib/content/related.ts). */
export type RelatedPerson = Pick<PersonListItem, "slug" | "name" | "born" | "died" | "image"> & {
  /** Translated reasons, strongest first (e.g. a shared place). */
  reasons: string[];
};

export interface StoryInfo {
  /** Sections of the life story (only for longer stories). */
  outline: { id: string; text: string }[];
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
  /** People in an order the reader chose or sees, for previous/next (null: none). */
  sequence?: PersonListItem[] | null;
  /** Name of that order ("Name A–Z"). */
  orderLabel?: string | null;
  /** Everyone the overview shows, for another random biography (null while loading). */
  pool?: PersonListItem[] | null;
  /** Number of search results, if a search is active. */
  resultCount?: number | null;
  /** Number of people in the collection (null while loading). */
  total?: number | null;
  hrefFor?: (slug: string) => string;
}

/** Height of the top bar (px): what sticks above the text while reading. */
const BAR = 56;
/** A "Lebenslauf" with fewer entries only repeats birth and death from the key facts. */
const MIN_TIMELINE_ENTRIES = 3;

/** Follows `href` as a plain link (new tab, no JavaScript); a plain click runs `action` instead. */
function plainClick(action: (() => void) | undefined) {
  return (event: MouseEvent) => {
    if (!action || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    action();
  };
}

/**
 * Passes the biography on: the system's share sheet where there is one (phones), else the
 * address is copied and a status says so.
 */
function ShareButton({ title }: { title: string }) {
  const m = useMessages();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (typeof navigator.share === "function") await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      // Cancelled, or the browser refused: nothing was shared, nothing to report.
    }
  };

  return (
    <span className="js-only relative flex">
      <button
        type="button"
        onClick={share}
        aria-label={m.detail.share}
        title={m.detail.share}
        className="detail-bar-button hit-44 grid size-10 shrink-0 place-items-center rounded-full text-emphasis"
      >
        {copied ? (
          <Check aria-hidden="true" className="size-5" />
        ) : (
          <Share aria-hidden="true" className="size-5" />
        )}
      </button>
      {copied && (
        <span
          aria-hidden="true"
          className="absolute top-full right-0 mt-1 rounded-full bg-emphasis px-3 py-1 text-body-xs font-medium whitespace-nowrap text-surface"
        >
          {m.detail.linkCopied}
        </span>
      )}
      <span role="status" className="sr-only">
        {copied ? m.detail.linkCopied : ""}
      </span>
    </span>
  );
}

interface DetailBarProps {
  closeHref: string;
  onClose?: () => void;
  /** Title to share the page under; without it there is no share button. */
  shareTitle?: string;
  /**
   * Opaque, with the section links showing. Phones start without (the portrait reaches the
   * top edge, share and close float on it); from `lg` the bar is always opaque.
   */
  solid?: boolean;
  /** Lies over the start of the content (the portrait on phones) instead of above it. */
  overlay?: boolean;
  children?: ReactNode;
}

/**
 * Top bar of the biography sheet or card: section links, share and close in one opaque line
 * that stays in reach while reading (styles: `.detail-bar` in app.css).
 */
export function DetailBar({
  closeHref,
  onClose,
  shareTitle,
  solid = false,
  overlay = false,
  children,
}: DetailBarProps) {
  const m = useMessages();
  return (
    <div
      data-solid={solid ? "" : undefined}
      className={cn(
        "detail-bar sticky top-0 z-20 -mx-5 flex h-14 shrink-0 items-center gap-1 pr-3 pl-3.5 sm:-mx-10 sm:gap-1.5 sm:pr-8 sm:pl-8 print:hidden",
        overlay && "max-lg:-mb-14",
      )}
    >
      {/* Grab handle: the sheet on phones can be swiped down to close (app/lib/swipe-to-close.ts). */}
      <span
        aria-hidden="true"
        // Light with a dark ring: visible on the portrait and on the page colour alike.
        className="absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-surface shadow-float ring-1 ring-emphasis/25 lg:hidden"
      />
      <div className="detail-bar-nav flex min-w-0 flex-1">{children}</div>
      {shareTitle && <ShareButton title={shareTitle} />}
      <Link
        to={closeHref}
        preventScrollReset
        viewTransition
        onClick={plainClick(onClose)}
        aria-label={m.detail.close}
        title={m.detail.close}
        className="detail-bar-button detail-bar-close hit-44 grid size-10 shrink-0 place-items-center rounded-full text-emphasis"
      >
        <X aria-hidden="true" className="size-5" />
      </Link>
    </div>
  );
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
  sequence = null,
  orderLabel = null,
  pool = null,
  resultCount = null,
  total = null,
  hrefFor,
}: PersonDetailProps) {
  const m = useMessages();
  const location = useLocation();
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const { text } = person;
  // Text not available in this locale (an optional language): say so and mark its real language.
  const fallback = person.locale !== locale;
  const textLang = fallback ? htmlLangFor(person.locale) : undefined;
  const years = lifeYears(person.born, person.died);

  // The sections this biography has, in the configured order. Each has its address
  // ("#lebenslauf"); the first one is the top of the page.
  const sections = siteConfig.detail.tabs
    .filter(
      (t) =>
        t.id === "facts" ||
        (t.id === "story" && storyHtml.trim() !== "") ||
        (t.id === "timeline" && text.timeline.length >= MIN_TIMELINE_ENTRIES),
    )
    .map((t) => ({ ...t, anchor: t.slug[locale] ?? "" }));
  const anchors = sections.map((s) => s.anchor).join(",");

  // While reading: the bar turns opaque once the name passes under it, and marks the section
  // being read.
  const root = useRef<HTMLElement>(null);
  const [solid, setSolid] = useState(false);
  const [current, setCurrent] = useState("");
  useEffect(() => {
    const scroller = root.current?.closest<HTMLElement>(".detail-scroller");
    if (!scroller) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = scroller.getBoundingClientRect().top;
      const offset = (el: Element | null) => (el ? el.getBoundingClientRect().top - top : Infinity);
      setSolid(offset(document.getElementById(PERSON_HEADING_ID)) < BAR);
      let found = "";
      for (const anchor of anchors.split(",")) {
        // A little past the bar, so a section that was jumped to counts as reached.
        if (anchor && offset(document.getElementById(anchor)) <= BAR + 32) found = anchor;
      }
      setCurrent(found);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [person.slug, anchors]);

  // Opened with a section's address: start there (the browser does this itself on a page
  // load; this covers links followed inside the app).
  useEffect(() => {
    const anchor = decodeURIComponent(window.location.hash.slice(1));
    if (anchor && anchors.split(",").includes(anchor)) {
      document.getElementById(anchor)?.scrollIntoView({ block: "start" });
    }
  }, [person.slug, anchors]);

  const jumpTo = (event: MouseEvent, anchor: string) => {
    event.preventDefault();
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = smooth ? "smooth" : "auto";
    if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior, block: "start" });
    else root.current?.closest(".detail-scroller")?.scrollTo({ top: 0, behavior });
    // The address names the section, so it can be shared; no new history entry.
    navigate(
      { search: location.search, hash: anchor ? `#${anchor}` : "" },
      { replace: true, preventScrollReset: true, state: location.state },
    );
    const heading = document.getElementById(anchor ? `${anchor}-heading` : PERSON_HEADING_ID);
    heading?.focus({ preventScroll: true });
  };

  // The first page of a visit (a shared link, a search engine): say where the reader is.
  const arrived = hydrated ? (window.history.state as { idx?: number } | null)?.idx === 0 : true;

  return (
    <article ref={root} className="@container flex min-h-full flex-col px-5 pb-28 sm:px-10 lg:pb-16">
      <DetailBar
        closeHref={closeHref}
        onClose={onClose}
        shareTitle={person.name.display}
        solid={solid}
        overlay
      >
        {sections.length > 1 && (
          <nav aria-label={m.detail.sections} className="no-scrollbar flex min-w-0 overflow-x-auto sm:gap-1">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.anchor || PERSON_HEADING_ID}`}
                onClick={(event) => jumpTo(event, section.anchor)}
                aria-current={current === section.anchor ? "true" : undefined}
                className="detail-bar-link inline-flex min-h-11 shrink-0 items-center rounded-sm px-1.5 text-body-xs font-medium whitespace-nowrap text-muted-text hover:text-emphasis sm:px-2 sm:text-body-sm"
              >
                {section.shortLabel ? (
                  <>
                    <span aria-hidden="true" className="sm:hidden">
                      {localize(section.shortLabel, locale)}
                    </span>
                    <span className="max-sm:sr-only">{localize(section.label, locale)}</span>
                  </>
                ) : (
                  localize(section.label, locale)
                )}
              </a>
            ))}
          </nav>
        )}
      </DetailBar>

      {/* Phones: the biography opens with the portrait (desktop shows it next to the facts). */}
      <div data-tint className="relative -mx-5 sm:-mx-10 lg:hidden">
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

      <header className="relative -mt-10 flex flex-col gap-3 lg:mt-6">
        <div className="flex flex-col gap-1">
          <h1 id={PERSON_HEADING_ID} tabIndex={-1} className="scroll-mt-16 text-h1 focus-target">
            {person.name.display}
          </h1>
          {years && <p className="text-body-sm text-muted-text tabular-nums">{years}</p>}
        </div>
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-md border border-control px-2 py-0.5 text-body-xs text-emphasis"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </header>

      {fallback && (
        <p className="mt-6 rounded-xl border-l-4 border-brand bg-brand/10 px-4 py-3 text-body-sm text-emphasis">
          {m.detail.notTranslated(localeConfig(locale).label)}
        </p>
      )}

      {/* One page, top to bottom: key facts, life story, dated entries. */}
      <div className="mt-6 flex flex-col gap-10">
        {sections.map((section) =>
          section.id === "facts" ? (
            <section key={section.id} aria-label={localize(section.label, locale)} lang={textLang}>
              <FactsPanel person={person} />
            </section>
          ) : (
            <section
              key={section.id}
              id={section.anchor}
              aria-labelledby={`${section.anchor}-heading`}
              lang={textLang}
              className="scroll-mt-14 border-t border-line pt-8"
            >
              <h2 id={`${section.anchor}-heading`} tabIndex={-1} className="mb-5 text-h2 focus-target">
                {localize(section.label, locale)}
              </h2>
              {section.id === "story" && (
                <StoryPanel person={person} storyHtml={storyHtml} info={storyInfo} />
              )}
              {section.id === "timeline" && <TimelinePanel timeline={text.timeline} />}
            </section>
          ),
        )}

        <Sources person={person} />

        {arrived && (
          <aside
            aria-label={localize(siteConfig.brand.name, locale)}
            className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card border border-line p-5 print:hidden"
          >
            <p className="mr-auto font-medium text-emphasis">
              {m.detail.partOf(total, localize(siteConfig.brand.name, locale))}
            </p>
            <Link
              to={closeHref}
              preventScrollReset
              viewTransition
              onClick={plainClick(onClose)}
              className={buttonVariants()}
            >
              {m.detail.discoverAll}
            </Link>
          </aside>
        )}

        {related.length > 0 && (
          <RelatedPeople people={related} hrefFor={hrefFor ?? ((s) => pagePath(locale, "people", s))} />
        )}
        {hrefFor && (
          <MoreBiographies
            slug={person.slug}
            sequence={sequence}
            orderLabel={orderLabel}
            pool={pool}
            resultCount={resultCount}
            hrefFor={hrefFor}
          />
        )}
      </div>
    </article>
  );
}

/** People connected by a shared field, place or era — a way to explore by content. */
function RelatedPeople({ people, hrefFor }: { people: RelatedPerson[]; hrefFor: (slug: string) => string }) {
  const m = useMessages();
  return (
    <section
      aria-labelledby="related-heading"
      className="flex flex-col gap-4 border-t border-line pt-8 print:hidden"
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
                className="size-16 shrink-0 rounded-md object-cover"
              />
              <span className="flex min-w-0 flex-col">
                <span className="font-heading text-body font-semibold text-emphasis">{p.name.display}</span>
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
 * Keeps the exploration going at the end of a biography: previous and next where the reader
 * chose or sees an order (list, timeline, search results), and another random biography.
 */
function MoreBiographies({
  slug,
  sequence,
  orderLabel,
  pool,
  resultCount,
  hrefFor,
}: {
  slug: string;
  sequence: PersonListItem[] | null;
  orderLabel: string | null;
  pool: PersonListItem[] | null;
  resultCount: number | null;
  hrefFor: (slug: string) => string;
}) {
  const m = useMessages();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const steps = sequence && sequence.length > 1 ? sequence : null;
  const random = siteConfig.features.randomBio && pool && pool.length > 1 ? pool : null;
  if (!steps && !random) return null;

  const position = steps ? steps.findIndex((p) => p.slug === slug) : -1;
  // Not in the current results (e.g. opened via a link): start from the beginning.
  const previous =
    steps && (position < 0 ? steps.at(-1)! : steps[(position - 1 + steps.length) % steps.length]!);
  const next = steps && (position < 0 ? steps[0]! : steps[(position + 1) % steps.length]!);

  const linkClass =
    "group/more flex min-h-16 flex-col justify-center gap-0.5 rounded-xl border border-line px-4 py-3 hover:bg-emphasis/5";
  return (
    <nav aria-label={m.detail.more} className="flex flex-col gap-3 border-t border-line pt-8 print:hidden">
      {/* Within a search the steps stay in the results: say so, and offer the way out. */}
      {steps && resultCount !== null && (
        <p className="text-body-sm text-text">
          {m.detail.withinResults(resultCount)}{" "}
          <Link
            to={pathname}
            preventScrollReset
            className="rounded-sm text-brand underline underline-offset-4 hover:decoration-2"
          >
            {m.detail.leaveResults}
          </Link>
        </p>
      )}
      {steps && orderLabel && <p className="text-eyebrow">{orderLabel}</p>}
      {previous && next && (
        <div className="grid gap-3 @md:grid-cols-2">
          <Link to={hrefFor(previous.slug)} preventScrollReset viewTransition className={linkClass}>
            <span className="flex items-center gap-1.5 text-body-sm text-muted-text">
              <ArrowLeft aria-hidden="true" className="size-4" />
              {m.detail.previous}
            </span>
            <span className="font-heading text-h3 font-semibold text-emphasis">{previous.name.display}</span>
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
            <span className="font-heading text-h3 font-semibold text-emphasis">{next.name.display}</span>
          </Link>
        </div>
      )}
      {random && (
        <Button
          variant="secondary"
          className="self-start"
          onClick={() => {
            const person = pickRandom(random, { seen: readSeen(), exclude: slug });
            if (person) navigate(hrefFor(person.slug), { preventScrollReset: true, viewTransition: true });
          }}
        >
          <Shuffle aria-hidden="true" />
          {resultCount !== null ? m.random.inResults : m.random.label}
        </Button>
      )}
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
              <blockquote lang={text.quote.lang} className="font-quote text-subline text-brand italic">
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
          {/* On phones the portrait is at the top of the biography; the credit stays here. */}
          <div
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

/** Name of a language in the page's language ("en" → "Englisch" on German pages). */
function languageName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([htmlLangFor(locale)], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
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
  // In-page links must not touch the URL hash: it names the section of the biography.
  const jumpTo = (event: MouseEvent, id: string) => {
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
      {info && info.outline.length > 0 && (
        <nav aria-labelledby="outline-heading" className="rounded-xl border border-line p-4 print:hidden">
          <h3 id="outline-heading" className="mb-2 text-eyebrow">
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
      {foreignStory && (
        <p className="-mt-4 text-body-sm text-muted-text">
          {m.detail.storyOnlyIn(languageName(foreignStory, locale))}
        </p>
      )}
      <div className="prose-content" lang={foreignStory} dangerouslySetInnerHTML={{ __html: storyHtml }} />
    </div>
  );
}

/** Where the texts and data come from, with their licences. */
function Sources({ person }: { person: PersonDetailProps["person"] }) {
  const m = useMessages();
  return (
    <section aria-labelledby="sources-heading" className="flex flex-col gap-3 border-t border-line pt-8">
      <h2 id="sources-heading" className="text-h3">
        {m.detail.sources}
      </h2>
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
