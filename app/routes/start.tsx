import { cn } from "cn";
import { ArrowRight, ChevronDown, Quote, Shuffle } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

import type { Route } from "./+types/start";
import { SearchDrawer } from "~/components/search/search-drawer";
import { TopNav, NavPill, NavTextLink } from "~/components/shell/nav";
import { BrandLink } from "~/components/shell/brand-link";
import { MenuDrawer } from "~/components/shell/menu-drawer";
import { continueFromLastCamera } from "~/components/canvas/use-camera";
import { Portrait } from "~/components/portrait";
import { StartPreview, viewHref, type StartView } from "~/components/start/start-preview";
import { Button } from "~/components/ui/button";
import { requestPath } from "~/lib/base-path";
import { siteConfig } from "~/lib/config";
import { anniversaries } from "~/lib/content/anniversary";
import { formatPartialDate } from "~/lib/content/format";
import { loadPeopleIndex } from "~/lib/content/people-index.server";
import { usePeopleIndex } from "~/lib/content/people-index";
import { useHydrated } from "~/lib/hooks";
import { useLocale, useMessages } from "~/lib/i18n";
import { localeFromPathname, pagePath } from "~/lib/i18n/locale";
import { localize } from "~/lib/i18n/localize";
import { pageMeta } from "~/lib/meta";
import { readSeen } from "~/lib/preferences";
import { pickRandom } from "~/lib/random";

export async function loader({ request }: Route.LoaderArgs) {
  const locale = localeFromPathname(requestPath(request));
  // The wall behind the start page is the real canvas (same people, order and layout); the
  // full index also serves "On this day", the random entry and the search panel.
  return loadPeopleIndex(locale);
}

export function meta({ location }: Route.MetaArgs) {
  return pageMeta({ locale: localeFromPathname(location.pathname), path: location.pathname });
}

export default function Start({ loaderData }: Route.ComponentProps) {
  const locale = useLocale();
  const m = useMessages();
  const { start, features } = siteConfig;
  const t = (record: Record<string, string>) => localize(record, locale);

  // The chosen preview tab: the main button opens that view.
  const [view, setView] = useState<StartView>("canvas");

  return (
    <div className="relative min-h-dvh bg-page">
      {/* First in the DOM, as on screen: Tab and screen readers reach it before the content (WCAG 2.4.3). */}
      <TopNav
        label={m.nav.label}
        // Same order as on every page: brand on the left; about, search and menu on the right.
        // "Biografien" needs no nav link here: the main button leads there.
        start={
          <NavPill bare>
            <BrandLink />
          </NavPill>
        }
        end={
          <NavPill>
            <NavTextLink to={pagePath(locale, "about")} className="hidden sm:inline-flex">
              {m.nav.about}
            </NavTextLink>
            <SearchDrawer />
            <MenuDrawer />
          </NavPill>
        }
      />
      {/* Phones: title, the preview, the button that opens it, then quote and anniversaries.
          From lg two columns: title, quote, button and anniversaries on the left, the preview
          on the right (the DOM keeps the phone order, so the button follows its tabs). */}
      <main
        id="main"
        className="mx-auto grid min-h-dvh w-full max-w-7xl content-center gap-6 px-4 pt-20 pb-12 sm:gap-8 sm:px-8 sm:pt-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:grid-rows-[auto_auto_auto_1fr] lg:gap-x-16 lg:gap-y-10 lg:pt-28"
      >
        <header className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
          <h1 id="start-title" className="wordmark text-[clamp(2.75rem,2rem+4vw,5rem)] text-brand">
            {t(start.title)}
          </h1>
          <p className="font-heading text-subline text-balance text-emphasis">{t(start.subtitle)}</p>
          <p className="text-body-sm text-muted-text">
            {m.start.count(loaderData.people.length, loaderData.placeGroups.length)}
          </p>
        </header>

        <div className="min-w-0 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:self-center">
          <StartPreview
            people={loaderData.people}
            placeCoords={loaderData.placeCoords}
            view={view}
            onViewChange={setView}
          />
        </div>

        {/* The way in: the view chosen in the preview (the mosaic first). The list is the easier
            one with a screen reader. */}
        <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-3">
          <Button asChild size="lg" className="self-start">
            <Link
              to={viewHref(locale, view)}
              viewTransition
              onClick={view === "canvas" ? continueFromLastCamera : undefined}
              aria-describedby={view === "canvas" ? "start-list-hint" : undefined}
            >
              {m.start.open[view]}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <p id="start-list-hint" hidden>
            {m.start.listHint}
          </p>
          {features.randomBio && (
            <div className="-ml-4 flex flex-wrap items-center">
              <RandomStart />
            </div>
          )}
        </div>

        {start.quote && (
          <figure className="flex flex-col gap-3 lg:col-start-1 lg:row-start-2">
            {/* Lucide only ships the closing "99" mark; rotated it becomes the opening "66" from the design. */}
            <Quote aria-hidden="true" className="size-10 rotate-180 fill-brand stroke-none" />
            <blockquote className="font-heading text-[clamp(1.25rem,1.1rem+0.6vw,1.625rem)] leading-tight tracking-[-0.04em] text-brand italic">
              <p>„{t(start.quote.text)}“</p>
            </blockquote>
            <figcaption className="flex items-start gap-3 text-body-sm text-muted-text">
              <span aria-hidden="true" className="mt-[0.775em] h-px w-6 shrink-0 bg-muted-text" />
              {t(start.quote.source)}
            </figcaption>
          </figure>
        )}

        <div className="lg:col-start-1 lg:row-start-4 lg:self-start">
          <OnThisDay />
        </div>
      </main>
    </div>
  );
}

/** Secondary entry: straight into a (weighted) random biography. */
function RandomStart() {
  const locale = useLocale();
  const m = useMessages();
  const navigate = useNavigate();
  const { index } = usePeopleIndex(locale);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        const person = index && pickRandom(index.people, { seen: readSeen() });
        navigate(person ? pagePath(locale, "people", person.slug) : pagePath(locale, "people"));
      }}
    >
      {m.random.label}
      <Shuffle aria-hidden="true" />
    </Button>
  );
}

/**
 * Who was born or died on this day — or, if nobody, in the next days (with its own heading,
 * so it doesn't claim to be today). Computed in the browser: the pre-rendered page doesn't
 * know the date it is read on.
 */
/** Anniversaries shown before "show more". */
const ON_THIS_DAY_SHOWN = 2;

function OnThisDay() {
  const locale = useLocale();
  const m = useMessages();
  const hydrated = useHydrated();
  const { index } = usePeopleIndex(locale);
  const [expanded, setExpanded] = useState(false);
  const { items, today } = useMemo(() => {
    // Day by day; nobody is left out for being less known: the rest is one tap away.
    const all = hydrated && index ? anniversaries(index.people, new Date(), 6) : [];
    const exact = all.filter((a) => a.inDays === 0);
    return { items: exact.length > 0 ? exact : all, today: exact.length > 0 };
  }, [hydrated, index]);
  // Until the date is known: keep the room free (heading, two rows, "show more"), so the
  // page doesn't jump when the section appears.
  if (!hydrated || !index) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-3 border-t border-line pt-6">
        <span className="h-5 w-32 rounded-md bg-emphasis/5" />
        <span className="flex flex-col gap-1">
          {Array.from({ length: ON_THIS_DAY_SHOWN }, (_, i) => (
            <span key={i} className="flex min-h-14 items-center gap-3 py-1">
              <span className="size-12 shrink-0 rounded-md bg-emphasis/5" />
              <span className="h-9 w-48 rounded-md bg-emphasis/5" />
            </span>
          ))}
        </span>
        <span className="min-h-11" />
      </div>
    );
  }
  if (items.length === 0) return null;
  const shown = expanded ? items : items.slice(0, ON_THIS_DAY_SHOWN);
  const more = items.length - ON_THIS_DAY_SHOWN;

  return (
    <section aria-labelledby="on-this-day" className="flex flex-col gap-3 border-t border-line pt-6">
      <h2 id="on-this-day" className="font-sans text-body-sm font-medium tracking-normal text-muted-text">
        {today ? m.start.onThisDay : m.start.comingUp}
      </h2>
      <ul id="on-this-day-list" className="flex flex-col gap-1">
        {shown.map(({ person, kind, years, inDays }) => (
          <li key={`${person.slug}-${kind}`}>
            <Link
              to={pagePath(locale, "people", person.slug)}
              className="-mx-2 flex min-h-14 items-center gap-3 rounded-xl px-2 py-1 hover:bg-emphasis/5"
            >
              <span className="size-12 shrink-0 overflow-hidden rounded-md">
                <Portrait
                  slug={person.slug}
                  image={person.image}
                  alt=""
                  sizes="48px"
                  className="size-full object-cover"
                />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-medium text-emphasis">{person.name.display}</span>
                <span className="text-body-sm text-muted-text">
                  {inDays === 0
                    ? m.start.anniversaryToday(kind, years)
                    : m.start.anniversaryUpcoming(kind, formatPartialDate(person[kind]!.date!, locale))}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-4 self-start"
          aria-expanded={expanded}
          aria-controls="on-this-day-list"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? m.start.showFewer : m.start.showMore(more)}
          <ChevronDown aria-hidden="true" className={cn("transition-transform", expanded && "rotate-180")} />
        </Button>
      )}
    </section>
  );
}
