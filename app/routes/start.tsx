import { ChevronRight, Quote } from "lucide-react";
import { Link } from "react-router";

import type { Route } from "./+types/start";
import { SearchDrawer } from "~/components/search/search-drawer";
import { BottomNav, NavPill, NavTextLink } from "~/components/shell/nav";
import { MenuDrawer } from "~/components/shell/menu-drawer";
import { StageMosaic, mosaicOrder } from "~/components/shell/stage-mosaic";
import { Button } from "~/components/ui/button";
import { siteConfig } from "~/lib/config";
import { content } from "~/lib/content/index.server";
import { useLocale, useMessages } from "~/lib/i18n";
import { localeConfig, localeFromPathname, pagePath, switchLocalePath } from "~/lib/i18n/locale";
import { localize } from "~/lib/i18n/localize";
import { pageMeta } from "~/lib/meta";

const EASY_LANGUAGE = "de-LS";

export async function loader({ request }: Route.LoaderArgs) {
  const locale = localeFromPathname(new URL(request.url).pathname);
  const people = await content.listPeople(locale);
  return {
    mosaic: mosaicOrder(people, 70).map(({ slug, image }) => ({ slug, image })),
  };
}

export function meta({ location }: Route.MetaArgs) {
  return pageMeta({ locale: localeFromPathname(location.pathname) });
}

export default function Start({ loaderData }: Route.ComponentProps) {
  const locale = useLocale();
  const m = useMessages();
  const { start, features } = siteConfig;
  const t = (record: Record<string, string>) => localize(record, locale);

  // "Leichte Sprache" shortcut as in the design; inside Leichte Sprache it leads back to the default language.
  const hasEasyLanguage = features.easyLanguage && siteConfig.locales.some((l) => l.code === EASY_LANGUAGE);
  const easyTarget = locale === EASY_LANGUAGE ? siteConfig.defaultLocale : EASY_LANGUAGE;
  const easyTargetConfig = localeConfig(easyTarget);

  return (
    <div className="relative min-h-dvh bg-stage">
      <StageMosaic items={loaderData.mosaic} />

      <main id="main" className="relative grid min-h-dvh place-items-center px-4 pt-6 pb-32 sm:px-8">
        <section
          aria-labelledby="start-title"
          className="flex w-full max-w-2xl flex-col gap-8 rounded-card bg-surface p-6 shadow-2xl sm:gap-12 sm:p-12 lg:p-16"
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
              <Link to={pagePath(locale, "people")}>
                {t(start.cta)}
                <span
                  aria-hidden="true"
                  className="grid size-10 place-items-center rounded-full bg-brand-foreground text-brand"
                >
                  <ChevronRight />
                </span>
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <BottomNav
        label={m.nav.label}
        start={
          <NavPill bare>
            <MenuDrawer />
            <div className="hidden items-center gap-3 lg:flex">
              {hasEasyLanguage && (
                <NavTextLink to={switchLocalePath("/", easyTarget)} lang={easyTargetConfig.htmlLang}>
                  {easyTargetConfig.label}
                </NavTextLink>
              )}
              <NavTextLink to={pagePath(locale, "about")}>{m.nav.about}</NavTextLink>
              <NavTextLink to={pagePath(locale, "people")}>{m.nav.people}</NavTextLink>
            </div>
          </NavPill>
        }
        end={
          <NavPill bare>
            <SearchDrawer />
          </NavPill>
        }
      />
    </div>
  );
}
