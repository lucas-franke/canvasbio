# CanvasBio

White-Label-Vorlage für Biografie-Sammlungen: Personen als endlose Porträtwand (Infinite Canvas) und als Liste, mit Suche und Filtern, zufälliger Biografie und Detailansicht. Ausgelegt auf Touch und Mobile, bedienbar mit Maus und Tastatur, barrierefrei nach **WCAG 2.2 AA** ([Prüfbericht](docs/accessibility-audit.md)).

Die Demo-Inhalte zeigen Pionierinnen der Frauenbewegung (1850–1950) aus Wikidata, Wikimedia Commons und Wikipedia, in Deutsch, Englisch und (teilweise) Leichter Sprache.

## Funktionen

- **Bildwand:** endlos in alle Richtungen, Ziehen mit Nachgleiten, Pinch- und Mausrad-Zoom; ohne Ziehen per Zoom-Knöpfe und Steuerkreuz; per Tastatur mit Pfeiltasten. Vorgerendert, damit sie sofort erscheint.
- **Liste:** alphabetisch mit A–Z-Sprungmarken.
- **Biografie:** als Spalte neben der Übersicht (ab 1024 px), sonst als Vollbild-Dialog; Tabs Biografie, Lebensgeschichte, Lebenslauf mit teilbaren Links (`#lebenslauf`).
- **Suche und Filter:** Name (tippfehlertolerant), Ort, Facetten aus der Konfiguration; Treffer werden in der Bildwand hervorgehoben, Zustand steht in der URL.
- **Zufällige Biografie:** bevorzugt weniger bekannte und noch nicht geöffnete Personen.
- **Namen ausblenden**, **hell/dunkel**, **Sprachen** inkl. Leichter Sprache, Übergänge mit der View Transitions API (abschaltbar über „Bewegung reduzieren“).

## Voraussetzungen

- Node.js ≥ 22.22 (siehe `.nvmrc`)
- `npm install`

## Befehle

| Befehl                | Zweck                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`         | Entwicklungsserver (erzeugt vorher fehlende Porträt-Varianten)                                                              |
| `npm run build`       | Kontrast- und Inhaltsprüfung, Porträts, statischer Build mit Prerendering nach `build/client`, Brotli/Gzip-Vorkomprimierung |
| `npm run preview`     | Statischen Build lokal ausliefern (mit Kompression)                                                                         |
| `npm run validate`    | Typecheck, Lint, Kontrast, Inhalte, Unit-Tests                                                                              |
| `npm run e2e`         | Playwright-Tests inkl. axe, Reflow, Textabstand, Fokus (Desktop, Android, iOS)                                              |
| `npm run import:demo` | Demo-Inhalte neu aus Wikidata importieren                                                                                   |

## Neues Projekt aus der Vorlage

### 1. Konfiguration – `site.config.ts`

Alles Projektspezifische steht in einer typisierten Datei. Sie wird beim Laden geprüft; Fehler (fehlende Übersetzung, zu geringer Kontrast, ungültige Werte) brechen den Build mit einer verständlichen Meldung ab.

| Abschnitt                  | Inhalt                                                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `brand`                    | Name, Wortmarke, Beschreibung (Meta-Tags)                                                                                         |
| `locales`, `defaultLocale` | Sprachen mit URL-Präfix; `contentRequired: false` für Sprachen, in denen nicht jede Biografie vorliegen muss (Leichte Sprache)    |
| `paths`                    | Übersetzte URL-Segmente (`/personen`, `/en/people` …)                                                                             |
| `operator`                 | Betreiber, Kontakt-E-Mail für Barrieren, Datum der Barrierefreiheitserklärung                                                     |
| `theme`                    | Farb-Tokens hell/dunkel, Schriften, Radius, Bildtönung (`sepia`, `grayscale`, `none`), Kachelrand                                 |
| `start`                    | Titel, Untertitel, Zitat und Button der Startseite                                                                                |
| `facets`                   | Filter der Suche: `multi` (Chips) oder `autocomplete` (Freitext mit Vorschlägen), jeweils mit Beschriftung und optionalem Hinweis |
| `detail.tabs`              | Tabs der Biografie und ihre URL-Namen                                                                                             |
| `canvas`                   | Kachelgröße, Abstand, Versatz, Endlos-Wiederholung, Zoom-Grenzen                                                                  |
| `features`                 | Zufällige Biografie, Namen ausblenden, Leichte Sprache, Theme-Umschalter                                                          |

Alle Texte sind pro Sprache anzugeben (`{ de: "…", en: "…" }`). UI-Texte, die nicht projektspezifisch sind, liegen in `app/lib/i18n/messages/`.

### 2. Schriften

Bei geänderten `theme.fonts` die Imports in `app/theme/fonts.ts` austauschen (selbst gehostet über Fontsource).

### 3. Inhalte

Biografien, Porträts und Filterwerte in `content/` ersetzen – Format in [content/README.md](content/README.md). Die Porträts werden beim Build in alle Größen und Formate umgerechnet.

Textseiten liegen in `content/pages/<seite>.<sprache>.md`: „Über das Projekt“ (`about`) und die Erklärung zur Barrierefreiheit (`accessibility`). Platzhalter wie `{{organisation}}`, `{{contactEmail}}` und `{{statementDate}}` werden aus `operator` befüllt.

### 4. Barrierefreiheit

1. `npm run validate` und `npm run e2e` – beide müssen grün sein.
2. Den [Prüfbericht](docs/accessibility-audit.md) mit den eigenen Inhalten aktualisieren, Screenreader-Tests nach der [Protokollvorlage](docs/screenreader-protokoll.md) durchführen.
3. Die Erklärung zur Barrierefreiheit anpassen: Rechtsgrundlage und Durchsetzungsverfahren (Hinweise als Kommentar in `content/pages/accessibility.de.md`), Stand der Vereinbarkeit, nicht barrierefreie Inhalte, Kontakt.

### 5. Vor dem Livegang

- [ ] `operator.contactEmail` auf eine echte, betreute Adresse setzen
- [ ] Erklärung zur Barrierefreiheit geprüft und datiert
- [ ] Bildrechte und Lizenzangaben aller Porträts geprüft
- [ ] Leichte-Sprache-Texte von einer Prüfgruppe geprüft
- [ ] Test auf echten Geräten (iPhone, Android): Gesten, Safe Areas, Bottom-Sheets

## Hosting

Der Build in `build/client` ist rein statisch (kein Server-Code) und läuft auf jedem Static Host (z. B. Netlify, Cloudflare Pages, nginx).

- **Unbekannte URLs** auf `__spa-fallback.html` leiten (Status 404), z. B. nginx `error_page 404 /__spa-fallback.html;`.
- **Caching:** `/assets/*` und `/portraits/*` tragen einen Inhalts-Hash bzw. Versionsparameter → `Cache-Control: public, max-age=31536000, immutable`. HTML und `/data/*.json` kurz oder ohne Cache.
- **Kompression:** Neben jeder Textdatei liegen `.br` und `.gz`. nginx: `brotli_static on; gzip_static on;`. Hosts mit eigener Kompression ignorieren sie.

## Demo-Import

`npm run import:demo -- --limit 200` lädt Personen aus Wikidata, Porträts von Wikimedia Commons (nur gemeinfrei/CC0) und Lebensgeschichten aus Wikipedia. Wikimedia erwartet eine Kontaktangabe im User-Agent: `WIKIMEDIA_CONTACT=name@example.org npm run import:demo`. Antworten werden in `.cache/import` zwischengespeichert; handgeschriebene Dateien wie `de-LS.md` werden nicht überschrieben.

## Aufbau

- `site.config.ts` – Projektkonfiguration
- `app/` – React-Router-App (Framework-Modus, vollständig vorgerendert, `ssr: false`)
  - `components/canvas` – Bildwand (Kamera, Gesten, Kacheln, Steuerung)
  - `components/search`, `components/people`, `components/detail`, `components/shell` – Suche, Übersicht, Biografie, Rahmen
  - `lib/canvas` – Layout- und Kamera-Mathematik (rein, getestet)
  - `lib/search` – Suche und Filter (rein, getestet)
  - `lib/content` – Inhaltsschema, Loader und Adapter (austauschbar gegen ein CMS)
  - `lib/config`, `lib/theme`, `lib/i18n` – Konfigurationsschema, Theme-Tokens und Kontrastprüfung, Sprachen
- `content/` – Biografien, Porträts, Textseiten
- `scripts/` – Import, Bild-Pipeline, Prüf- und Build-Skripte
- `e2e/` – Playwright-Tests
- `docs/` – Prüfbericht Barrierefreiheit, Screenreader-Protokoll
