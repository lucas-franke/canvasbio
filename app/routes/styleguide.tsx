import { Search, X } from "lucide-react";

import type { Route } from "./+types/styleguide";
import { Button, closeButtonClass } from "~/components/ui/button";
import { segmentedItem, segmentedTrack } from "~/components/ui/segmented";
import { siteConfig } from "~/lib/config";
import type { ColorTokens } from "~/lib/config/schema";
import { checkContrast } from "~/lib/theme/contrast";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Styleguide" }, { name: "robots", content: "noindex" }];
}

const typeScale = [
  ["text-display font-heading font-semibold", "Display – Titel der Startseite"],
  ["text-h1 font-heading font-semibold", "Überschrift h1"],
  ["text-h2 font-heading font-semibold", "Überschrift h2"],
  ["text-subline font-heading", "Subline"],
  ["text-h3 font-heading font-semibold", "Überschrift h3"],
  ["text-quote font-quote italic", "Zitat – „Die Menschenrechte haben kein Geschlecht.“"],
  ["text-body", "Fließtext body – Die Menschenrechte haben kein Geschlecht."],
  ["text-body-sm", "Fließtext body-sm – Bildnachweis und Quellen"],
  ["text-body-xs", "Fließtext body-xs – Kleingedrucktes"],
  ["text-label font-medium", "Label / Button"],
  ["text-eyebrow", "Eyebrow – kleine Überschrift über einer Gruppe („Sprache“, „An diesem Tag“)"],
] as const;

/** Elevation: the three levels (app.css, --shadow-*). */
const elevations = [
  ["shadow-float ring-1 ring-line", "float", "Steuerung über dem Inhalt: Navigation, Zoom, Ergebnisleiste"],
  ["shadow-panel", "panel", "Aufklappendes: Ansichtsauswahl, Ortsliste, Vorschau der Startseite"],
  ["shadow-dialog", "dialog", "Die Biografie als Karte ab 1024 px"],
] as const;

/** Corner radius by role. */
const radii = [
  ["rounded-full", "full", "Alles, was handelt: Buttons, Chips, Umschalter"],
  ["rounded-card", "card", "Panels, Sheets, Karten"],
  ["rounded-xl", "xl", "Zeilen und Eingabefelder"],
  ["rounded-md", "md", "Vorschaubilder und feste Schlagworte"],
] as const;

/** The project-wide standards (visual proposal, docs/ux-review.md). */
function Standards() {
  return (
    <div className="flex flex-col gap-8">
      <h3 className="text-h3">Standards</h3>

      <div className="flex flex-col gap-3">
        <h4 className="text-eyebrow">Ebenen</h4>
        <ul className="grid gap-4 sm:grid-cols-3">
          {elevations.map(([cls, name, use]) => (
            <li
              key={name}
              className={`flex min-h-24 flex-col justify-end gap-1 rounded-card bg-surface p-4 ${cls}`}
            >
              <span className="font-semibold text-emphasis">{name}</span>
              <span className="text-body-xs text-muted-text">{use}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="text-eyebrow">Radien</h4>
        <ul className="grid gap-4 sm:grid-cols-4">
          {radii.map(([cls, name, use]) => (
            <li key={name} className="flex flex-col gap-2">
              <span aria-hidden="true" className={`block h-20 border border-control bg-surface ${cls}`} />
              <span className="text-body-sm font-semibold text-emphasis">{name}</span>
              <span className="text-body-xs text-muted-text">{use}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-end gap-8">
        <div className="flex flex-col gap-3">
          <h4 className="text-eyebrow">Segmentierte Auswahl</h4>
          {/* The same look for links (aria-current), radios (data-state) and toggles (aria-pressed). */}
          <div className={segmentedTrack}>
            <span className={segmentedItem} data-state="checked">
              Geburtsorte
            </span>
            <span className={segmentedItem}>Sterbeorte</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h4 className="text-eyebrow">Schließen</h4>
          <button type="button" aria-label="Schließen" className={closeButtonClass}>
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Swatches({ mode }: { mode: "light" | "dark" }) {
  const tokens = siteConfig.theme.colors[mode];
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {(Object.keys(tokens) as (keyof ColorTokens)[]).map((name) => (
        <li key={name} className="flex items-center gap-3 text-body-sm">
          <span
            aria-hidden="true"
            className="size-10 shrink-0 rounded-md border border-control"
            style={{ background: tokens[name] }}
          />
          <span>
            {name}
            <br />
            <code className="text-body-xs text-muted-text">{tokens[name]}</code>
          </span>
        </li>
      ))}
    </ul>
  );
}

function ThemePanel({ mode }: { mode: "light" | "dark" }) {
  const results = checkContrast(siteConfig.theme.colors[mode]);
  const failed = results.filter((r) => !r.pass).length;

  return (
    <section
      data-theme={mode}
      aria-labelledby={`theme-${mode}`}
      className="flex flex-col gap-10 bg-page p-6 text-text sm:p-10"
    >
      <h2 id={`theme-${mode}`} className="text-h2">
        Theme: {mode === "light" ? "Hell" : "Dunkel"}
      </h2>

      <div className="flex flex-col gap-4">
        <h3 className="text-h3">Farben</h3>
        <Swatches mode={mode} />
        <p className="text-body-sm">
          Kontrastprüfung: {results.length - failed} von {results.length} Paaren erfüllen WCAG 2.2 AA.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Typografie</h3>
        {typeScale.map(([cls, label]) => (
          <p key={cls} className={cls === "text-eyebrow" ? cls : `${cls} text-emphasis`}>
            {label}
          </p>
        ))}
      </div>

      <Standards />

      <div className="flex flex-col gap-4 rounded-card bg-surface p-6">
        <h3 className="text-h3">Buttons auf Karte</h3>
        <div className="flex flex-wrap gap-3">
          <Button>Ergebnisse anzeigen</Button>
          <Button variant="secondary">Suche ändern</Button>
          <Button variant="outline">Zurücksetzen</Button>
          <Button variant="inverse">Suche zurücksetzen</Button>
          <Button variant="control" aria-pressed="false">
            CDU
          </Button>
          <Button variant="control" aria-pressed="true">
            SPD
          </Button>
          <Button variant="ghost">
            Schließen <X />
          </Button>
          <Button variant="link">Textlink</Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-card bg-stage p-6 text-stage-foreground">
        <h3 className="text-h3 text-stage-foreground">Navigation auf Bühne</h3>
        <p className="wordmark text-h1 text-brand-on-stage">{siteConfig.brand.wordmark.de}</p>
        <div className="flex w-fit items-center gap-2 rounded-full bg-nav p-2">
          <Button variant="nav">Biografien</Button>
          <Button variant="nav" size="icon" aria-label="Suche">
            <Search />
          </Button>
        </div>
      </div>
    </section>
  );
}

export default function Styleguide() {
  return (
    <main id="main">
      <h1 className="sr-only">Styleguide</h1>
      <ThemePanel mode="light" />
      <ThemePanel mode="dark" />
    </main>
  );
}
