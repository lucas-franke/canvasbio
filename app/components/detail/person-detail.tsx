import { Quote, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";

import { Portrait } from "~/components/portrait";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { siteConfig } from "~/lib/config";
import type { PersonDetail as PersonDetailData } from "~/lib/content/adapter";
import { useHydrated } from "~/lib/hooks";
import { useMessages } from "~/lib/i18n";
import { localeConfig } from "~/lib/i18n/locale";
import { htmlLangFor, localize } from "~/lib/i18n/localize";
import { PERSON_HEADING_ID } from "./ids";

type TabId = (typeof siteConfig.detail.tabs)[number]["id"];

interface PersonDetailProps {
  person: Omit<PersonDetailData, "story">;
  storyHtml: string;
  tags: string[];
  /** Locale of the page (the text may be in another one if not translated). */
  locale: string;
  closeHref: string;
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

export function PersonDetail({ person, storyHtml, tags, locale, closeHref }: PersonDetailProps) {
  const m = useMessages();
  const [tab, setTab] = useTabFromHash(locale);
  const { text } = person;
  // Text not available in this locale (e.g. Leichte Sprache): say so and mark its real language.
  const fallback = person.locale !== locale;
  const textLang = fallback ? htmlLangFor(person.locale) : undefined;

  return (
    <article className="flex min-h-full flex-col gap-6 px-5 pt-5 pb-28 sm:px-10 sm:pt-8 lg:pb-36">
      <div className="flex justify-end">
        <Link
          to={closeHref}
          preventScrollReset
          viewTransition
          className="group/close inline-flex items-center gap-3 rounded-full pl-4 text-label font-medium text-emphasis"
        >
          {m.detail.close}
          <span
            aria-hidden="true"
            className="grid size-12 place-items-center rounded-full border-2 border-emphasis group-hover/close:bg-emphasis group-hover/close:text-surface"
          >
            <X className="size-6" />
          </span>
        </Link>
      </div>

      <header className="flex flex-col gap-3">
        <h1 id={PERSON_HEADING_ID} tabIndex={-1} className="text-h1 focus-target">
          {person.name.display}
        </h1>
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-lg border border-control px-2.5 py-1 text-body-sm text-emphasis"
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
        <TabsList aria-label={m.detail.sections}>
          {siteConfig.detail.tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {localize(t.label, locale)}
            </TabsTrigger>
          ))}
        </TabsList>

        {siteConfig.detail.tabs.map((t) => (
          // All panels stay in the HTML (search engines, no-JS); inactive ones are hidden.
          <TabsContent key={t.id} value={t.id} forceMount lang={textLang}>
            <h2 className="mb-5 text-h2">{localize(t.label, locale)}</h2>
            {t.id === "facts" && <FactsPanel person={person} />}
            {t.id === "story" && <StoryPanel person={person} storyHtml={storyHtml} />}
            {t.id === "timeline" && <TimelinePanel timeline={text.timeline} />}
          </TabsContent>
        ))}
      </Tabs>
    </article>
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
          {/* Target of the portrait morph from the overview (app/lib/view-transition.ts). */}
          <div data-vt-detail-portrait>
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

function StoryPanel({ person, storyHtml }: { person: PersonDetailProps["person"]; storyHtml: string }) {
  const m = useMessages();
  return (
    <div className="flex flex-col gap-10">
      <div className="prose-content" dangerouslySetInnerHTML={{ __html: storyHtml }} />
      <section aria-labelledby="sources-heading" className="flex flex-col gap-3 border-t border-line pt-6">
        <h3 id="sources-heading" className="text-h3">
          {m.detail.sources}
        </h3>
        <ul className="flex flex-col gap-2 text-body-sm">
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
    <ol className="@container/timeline flex flex-col">
      {timeline.map((entry, i) => (
        <li
          key={`${entry.date}-${i}`}
          className="grid gap-1 border-b border-line py-3 @lg/timeline:grid-cols-[11rem_1fr] @lg/timeline:gap-6"
        >
          <span className="font-medium text-emphasis">{entry.date}</span>
          <span>{entry.event}</span>
        </li>
      ))}
    </ol>
  );
}
