import { Search, X } from "lucide-react";

import type { Route } from "./+types/styleguide";
import { Button } from "~/components/ui/button";
import { siteConfig } from "~/lib/config";
import type { ColorTokens } from "~/lib/config/schema";
import { checkContrast } from "~/lib/theme/contrast";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Styleguide" }, { name: "robots", content: "noindex" }];
}

const typeScale = [
  ["text-h1 font-heading", "Überschrift h1"],
  ["text-h2 font-heading", "Überschrift h2"],
  ["text-subline font-heading", "Subline"],
  ["text-h3 font-heading", "Überschrift h3"],
  ["text-body", "Fließtext body – Die Menschenrechte haben kein Geschlecht."],
  ["text-body-sm", "Fließtext body-sm – Bildnachweis und Quellen"],
  ["text-body-xs", "Fließtext body-xs – Kleingedrucktes"],
  ["text-label font-medium", "Label / Button"],
] as const;

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
          <p key={cls} className={`${cls} text-emphasis`}>
            {label}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-card bg-surface p-6">
        <h3 className="text-h3">Buttons auf Karte</h3>
        <div className="flex flex-wrap gap-3">
          <Button>Ergebnisse anzeigen</Button>
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
