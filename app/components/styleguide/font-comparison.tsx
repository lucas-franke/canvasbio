/**
 * Font comparison for the style guide (app/routes/styleguide.tsx): candidate sans-serifs side by side with the same real
 * samples (title, list row, timeline, life story, controls) and the serif italic for quotes.
 * The candidate fonts load only on the style guide page (imported here, not in app/theme).
 */
import "@fontsource-variable/libre-franklin/wght.css";
import "@fontsource-variable/source-sans-3/wght.css";
import "@fontsource-variable/atkinson-hyperlegible-next/wght.css";

import { ArrowRight, Quote, Shuffle } from "lucide-react";

import { buttonVariants } from "~/components/ui/button";
import { portraitUrl } from "~/lib/content/images";

const CANDIDATES = [
  {
    name: "Libre Franklin",
    family: '"Libre Franklin Variable", sans-serif',
    note: "Franklin Gothic (1902), die Schrift der Zeitungen und Plakate der Wahlrechtsbewegung. Kräftig in den Überschriften, klar im Text.",
  },
  {
    name: "Source Sans 3",
    family: '"Source Sans 3 Variable", sans-serif',
    note: "Humanistisch und warm, sehr ruhig in langen Texten. In Überschriften zurückhaltend.",
  },
  {
    name: "Atkinson Hyperlegible Next",
    family: '"Atkinson Hyperlegible Next Variable", sans-serif',
    note: "Für Menschen mit Sehbehinderung entworfen: jeder Buchstabe eindeutig. Etwas eigenwillig.",
  },
  {
    name: "IBM Plex Sans (heute)",
    family: '"IBM Plex Sans Variable", sans-serif',
    note: "Die heutige Textschrift: neutral und technisch, ohne Bezug zum Thema.",
  },
] as const;

const ROWS = [
  {
    slug: "clara-zetkin",
    name: "Clara Zetkin",
    line: "Deutsche Politikerin (SPD, USPD, KPD), MdR und Frauenrechtlerin",
    years: "1857–1933",
  },
  {
    slug: "nadeschda-wassiljewna-stassowa",
    name: "Nadeschda Wassiljewna Stassowa",
    line: "Russische Frauenrechtlerin und Philanthropin",
    years: "1822–1895",
  },
  {
    slug: "halide-edip-adivar",
    name: "Halide Edip Adıvar",
    line: "Türkische Schriftstellerin und Politikerin",
    years: "1884–1964",
  },
];

function Sample({ family }: { family: string }) {
  return (
    <div className="flex flex-col gap-6" style={{ fontFamily: family }}>
      {/* Wordmark and the start page title */}
      <div className="flex flex-col gap-3">
        <p className="text-[1.375rem] font-bold tracking-[-0.03em] text-brand">Lauter Frauen</p>
        <p className="text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.025em] text-balance text-emphasis">
          Pionierinnen der Frauenbewegung aus aller Welt
        </p>
        <p className="text-body-sm text-muted-text">783 Biografien aus 6 Kontinenten</p>
      </div>

      {/* A chapter heading and list rows */}
      <div className="flex flex-col gap-2">
        <p className="border-b border-brand pb-1 text-h2 font-semibold tracking-[-0.02em] text-brand">
          1850er
        </p>
        {ROWS.map((row) => (
          <div key={row.slug} className="flex items-start gap-3 py-1">
            <img
              src={portraitUrl(row.slug, "sq", 160, "webp", "sample")}
              alt=""
              className="size-14 shrink-0 rounded-md bg-emphasis/5 object-cover"
            />
            <div className="flex min-w-0 flex-col">
              <span className="text-h3 font-semibold tracking-[-0.015em] text-emphasis">{row.name}</span>
              <span className="text-body-sm text-text">{row.line}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline rows: years should line up (tabular figures) */}
      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-body-sm">
        {ROWS.map((row) => (
          <div key={row.slug} className="contents">
            <span className="truncate font-medium text-emphasis">{row.name}</span>
            <span className="text-muted-text tabular-nums">{row.years}</span>
          </div>
        ))}
        <span className="font-medium text-emphasis">
          1848 Seneca Falls · 1906 Finnland · 1918 Deutschland
        </span>
        <span className="text-muted-text tabular-nums">1802–1990</span>
      </div>

      {/* A paragraph of a life story */}
      <p className="text-body text-text">
        Clara Zetkin war eine deutsche sozialistisch-kommunistische Politikerin, Friedensaktivistin und
        Frauenrechtlerin. In der Arbeit für die Internationale gilt sie als prägende Initiatorin des
        Internationalen Frauentags; von 1920 bis 1933 war sie Reichstagsabgeordnete.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3" style={{ fontFamily: family }}>
        <span className={buttonVariants({ size: "lg" })} style={{ fontFamily: family }}>
          Mosaik öffnen <ArrowRight aria-hidden="true" />
        </span>
        <span
          className="inline-flex min-h-10 items-center rounded-full bg-brand px-4 text-label font-medium text-brand-foreground"
          style={{ fontFamily: family }}
        >
          Zeitstrahl
        </span>
        <span className="inline-flex items-center gap-2 text-label font-medium text-emphasis">
          <Shuffle aria-hidden="true" className="size-4 text-brand" /> Zufällige Biografie
        </span>
      </div>

      {/* The quote stays serif italic: does it pair well? */}
      <figure className="flex flex-col gap-2">
        <Quote aria-hidden="true" className="size-7 rotate-180 fill-brand stroke-none" />
        <blockquote className="font-heading text-[1.375rem] leading-tight tracking-[-0.03em] text-emphasis italic">
          „Die Menschenrechte haben kein Geschlecht.“
        </blockquote>
        <figcaption className="text-body-sm text-muted-text">
          Hedwig Dohm, „Der Frauen Natur und Recht“, 1876
        </figcaption>
      </figure>
    </div>
  );
}

/** The comparison: one card per candidate, on the light page. */
export function FontComparison() {
  return (
    <section
      aria-labelledby="font-comparison"
      data-theme="light"
      className="flex flex-col gap-8 bg-page p-6 text-text sm:p-10"
    >
      <div className="flex flex-col gap-2">
        <h2 id="font-comparison" className="text-h2">
          Schriftvergleich
        </h2>
        <p className="max-w-2xl text-body-sm">
          Kandidaten für eine serifenlose Schrift für alles außer Zitaten. Alle mit denselben Inhalten; das
          Zitat bleibt in IBM Plex Serif kursiv.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {CANDIDATES.map((c) => (
          <article
            key={c.name}
            className="flex flex-col gap-6 rounded-card bg-surface p-6 shadow-sm ring-1 ring-line/70 sm:p-8"
          >
            <header className="flex flex-col gap-1 border-b border-line pb-4">
              <h3 className="font-sans text-label font-semibold tracking-normal text-emphasis">{c.name}</h3>
              <p className="text-body-sm text-muted-text">{c.note}</p>
            </header>
            <Sample family={c.family} />
          </article>
        ))}
      </div>
    </section>
  );
}
