import { ChevronRight, Quote, Shuffle } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router";

import type { Route } from "./+types/start";
import { SearchDrawer } from "~/components/search/search-drawer";
import { BottomNav, NavPill, NavTextLink } from "~/components/shell/nav";
import { BrandLink } from "~/components/shell/brand-link";
import { MenuDrawer } from "~/components/shell/menu-drawer";
import { CanvasBackdrop } from "~/components/canvas/canvas-backdrop";
import { continueFromLastCamera } from "~/components/canvas/use-camera";
import { Portrait } from "~/components/portrait";
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

  return (
    <div className="relative min-h-dvh bg-page">
      {/* The living wall: drifts slowly behind the card; "Biografien entdecken" continues right
          there on the canvas. A vignette in the page colour (light or dark) calms it down. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-70">
          <CanvasBackdrop people={loaderData.people} hrefFor={(slug) => pagePath(locale, "people", slug)} />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--c-page)_55%,transparent)_0%,var(--c-page)_90%)]" />
      </div>

      <main
        id="main"
        className="relative grid min-h-dvh place-items-center px-4 pt-6 pb-32 sm:px-8 lg:pt-28 lg:pb-12"
      >
        <section
          aria-labelledby="start-title"
          className="start-card flex w-full max-w-2xl flex-col gap-8 rounded-card bg-surface p-6 shadow-2xl sm:gap-12 sm:p-12 lg:p-16"
        >
          <header className="flex flex-col gap-4">
            <h1 id="start-title" className="wordmark text-[clamp(2.75rem,2rem+4vw,4.5rem)] text-brand">
              {t(start.title)}
            </h1>
            <p className="font-heading text-subline text-balance text-emphasis">{t(start.subtitle)}</p>
          </header>

          {start.quote && (
            <figure className="flex flex-col gap-3">
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

          <div className="flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="pr-2">
              <Link to={pagePath(locale, "people")} viewTransition onClick={continueFromLastCamera}>
                {t(start.cta)}
                <span
                  aria-hidden="true"
                  className="grid size-10 place-items-center rounded-full bg-brand-foreground text-brand"
                >
                  <ChevronRight />
                </span>
              </Link>
            </Button>
            {features.randomBio && <RandomStart />}
          </div>

          <OnThisDay />
        </section>
      </main>

      <BottomNav
        label={m.nav.label}
        // Same order as on every page: brand on the left; about, search and menu on the right.
        // "Biografien" needs no nav link here: the card's main button leads there.
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
      variant="secondary"
      size="lg"
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
function OnThisDay() {
  const locale = useLocale();
  const m = useMessages();
  const hydrated = useHydrated();
  const { index } = usePeopleIndex(locale);
  const { items, today } = useMemo(() => {
    const all = hydrated && index ? anniversaries(index.people, new Date(), 6) : [];
    const exact = all.filter((a) => a.inDays === 0);
    return { items: (exact.length > 0 ? exact : all).slice(0, 2), today: exact.length > 0 };
  }, [hydrated, index]);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="on-this-day" className="flex flex-col gap-3 border-t border-line pt-6">
      <h2 id="on-this-day" className="font-sans text-body-sm font-medium tracking-normal text-muted-text">
        {today ? m.start.onThisDay : m.start.comingUp}
      </h2>
      <ul className="flex flex-col gap-1">
        {items.map(({ person, kind, years, inDays }) => (
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
    </section>
  );
}
