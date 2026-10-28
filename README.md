| Translated URL segments (`/personen`, `/en/people`, list and timeline views …)# CanvasBio

White-label template for biography collections. People appear as a portrait mosaic (a zoomable canvas) and as a list. It includes search and filters, a random biography and a detail view. The template is designed for touch and mobile, works with mouse and keyboard, and is accessible to **WCAG 2.2 AA** ([audit report](docs/accessibility-audit.md), in German).

The demo content shows pioneers of the women's movement (1850–1950) from Wikidata, Wikimedia Commons and Wikipedia. It is available in German and English.

## Features

- **Mosaic:** the portraits in a brick pattern that ends at its edges, every person exactly once (`canvas.wrap: true` repeats it endlessly instead).
  - Opens in the middle at reading size. From the start page it continues right where the backdrop was.
  - Seen from afar the names are hidden and a tap zooms in instead of opening.
  - Screen readers get every person once, as a list with a name and an end, and a pointer to the list view first. During a search the shape stays: non-matches are dimmed and hidden from screen readers, and the arrow keys move between matches only.
  - Drag with momentum; zoom with pinch or the mouse wheel.
  - Only + and − on screen. Without dragging: arrow keys, and the list and timeline views show the same people.
  - Pre-rendered so it appears immediately.
  - Tiles vary slightly in size and position (`canvas.sizeVariance`) for a loose collage.
- **Navigation:** the brand on the left leads home; on the right always view switch, search, menu. The view switch shows the active view with a chevron and unfolds on click.
- **List:** sorted by name (A–Z, Z–A) or year of birth, in chapters (letters or decades). The chapters are in an index at the right edge, as in a phone's contacts app: tap a letter to jump, or slide along it to scroll with it.
- **Timeline ("Zeitstrahl"):** people by year of birth, grouped by decade, each with a bar for their life span on a shared scale. Grid lines and key dates from the configuration (e.g. when women got the vote) run through the list; pointing at a person or opening one highlights who lived at the same time. Sorted by birth, death or life span; the chapters (decades, life spans) are in the same index at the right edge. The order is part of the URL (`?sort=`) and decides previous/next in a biography.
- **Biography:**
  - Opens as a modal dialog over the overview: a centred card from 1024 px (a click outside, Escape or "Close" closes it), a full-screen sheet that starts with the portrait on smaller screens.
  - Name, close and the tabs stay visible while scrolling.
  - Tabs: biography, life story and timeline, each with a shareable link (`#lebenslauf` / `#timeline`).
  - Life story with reading time and, for longer texts, a table of contents.
  - At the end: related biographies (shared field, place or era), previous/next biography and "another random one".
  - On phones, swipe the sheet down to close it. Printing gives all sections without navigation.
- **Search and filters:**
  - Name search tolerates typos and suggests matching people directly while typing.
  - Filters for place (with suggestions and counts) and for the facets from the configuration.
  - Matches are highlighted in the mosaic, and the search state lives in the URL.
- **Random biography:** favours lesser-known people and people not opened yet. Floating on the mosaic; a quiet button at the top of list and timeline.
- **Start page:** a close-up of the mosaic drifts slowly behind the welcome card (no drift with reduced motion), two equal ways in, "Mosaic" (continues right there) and "List", a random entry point and "On this day" (people whose birthday or day of death is today; if there is nobody, those of the next few days under "Coming up").
- **Also:** light/dark theme, German and English. Transitions use the View Transitions API and are disabled with "reduce motion".

## Requirements

- Node.js ≥ 22.22 (see `.nvmrc`)
- `npm install`

## Commands

| Command               | Purpose                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`         | Development server (generates missing portrait variants first)                                                     |
| `npm run build`       | Contrast and content checks, portraits, static pre-rendered build into `build/client`, Brotli/Gzip pre-compression |
| `npm run build:pages` | Build for GitHub Pages into `build/pages` (see Hosting)                                                            |
| `npm run preview`     | Serve the static build locally (with compression)                                                                  |
| `npm run validate`    | Typecheck, lint, contrast, content, unit tests                                                                     |
| `npm run e2e`         | Playwright tests incl. axe, reflow, text spacing, focus (desktop, Android, iOS)                                    |
| `npm run import:demo` | Re-import the demo content from Wikidata                                                                           |

## New project from the template

### 1. Configuration – `site.config.ts`

Everything project-specific lives in one typed file. It is validated on load. Errors stop the build with a readable message, for example a missing translation, too little contrast or an invalid value.

| Section                    | Content                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `siteUrl`                  | Public address (optional). Enables canonical URLs and preview images when biographies are shared                                                                                |
| `brand`                    | Name, wordmark (top left in the navigation), `monogram` for the site icon (default: initials), optional logo (`logo` replaces the wordmark), description (meta tags)            |
| `locales`, `defaultLocale` | Languages with URL prefix; `contentRequired: false` for languages in which not every biography has to exist (e.g. an easy-to-read variant)                                      |
| `paths`                    | Translated URL segments (`/personen`, `/en/people` …)                                                                                                                           |
| `operator`                 | Operator with address, phone (optional), contact email and date of the accessibility statement; fills legal notice, privacy and statement                                       |
| `theme`                    | Colour tokens light/dark, fonts, radius, image tone (`sepia`, `grayscale`, `none`), tile edge, paper texture (`paperTexture`), portrait tint with a blend mode (`portraitTint`) |
| `start`                    | Title, subtitle, quote and button of the start page                                                                                                                             |
| `facets`                   | Search filters: `multi` (chips) or `autocomplete` (free text with suggestions), each with a label and an optional hint                                                          |
| `detail.tabs`              | Biography tabs and their URL names                                                                                                                                              |
| `timeline`                 | Key dates of the subject, marked on the timeline axis and listed above it (`events`: year + label per language)                                                                 |
| `canvas`                   | Tile size, gap, offset, endless repetition, zoom limits, size variation of the tiles (`sizeVariance`)                                                                           |
| `features`                 | Random biography, theme switch                                                                                                                                                  |

All texts are given per language (`{ de: "…", en: "…" }`). UI texts that are not project-specific live in `app/lib/i18n/messages/`.

### 2. Fonts

If you change `theme.fonts`, swap the imports in `app/theme/fonts.ts` (self-hosted via Fontsource).

### 3. Content

Replace the biographies, portraits and filter values in `content/`. The format is described in [content/README.md](content/README.md). The build converts the portraits into all sizes and formats.

Text pages live in `content/pages/<page>.<locale>.md`:

- about the project (`about`)
- accessibility statement (`accessibility`)
- legal notice (`imprint`)
- privacy policy (`privacy`)

Placeholders are filled from `operator`: `{{organisation}}`, `{{operatorBlock}}` (name, address, phone, email), `{{contactEmail}}` and `{{statementDate}}`. The legal notice and privacy policy are templates, not legal advice; notes are included as comments in the files.

### 4. Accessibility

1. Run `npm run validate` and `npm run e2e`; both must pass.
2. Update the [audit report](docs/accessibility-audit.md) with your own content.
3. Run screen reader tests using the [protocol template](docs/screenreader-protokoll.md). Both documents are in German.
4. Adapt the accessibility statement. Cover the legal basis and enforcement procedure (notes as comments in `content/pages/accessibility.de.md`), the compliance status, non-accessible content and the contact.

### 5. Before going live

- [ ] Fill `operator` with real details (address, monitored contact email); have the legal notice and privacy policy reviewed
- [ ] Accessibility statement reviewed and dated
- [ ] Image rights and licence details of all portraits checked
- [ ] Tested on real devices (iPhone, Android): gestures, safe areas, bottom sheets

## Hosting

The build in `build/client` is fully static (no server code) and runs on any static host (e.g. Netlify, Cloudflare Pages, nginx).

- **Unknown URLs:** serve `__spa-fallback.html` with status 404, e.g. nginx `error_page 404 /__spa-fallback.html;`.
- **Caching:**
  - `/assets/*` and `/portraits/*` carry a content hash or version parameter → `Cache-Control: public, max-age=31536000, immutable`.
  - HTML and `/data/*.json`: short or no cache.
- **Compression:** every text file has a `.br` and `.gz` next to it. For nginx: `brotli_static on; gzip_static on;`. Hosts with their own compression ignore them.
- **Base path:** to serve the site under a sub-path, build with `BASE_PATH`, e.g. `BASE_PATH=/canvasbio/ npm run build`. Router links handle it; plain URLs (portraits, data, icons, links in Markdown) go through `withBase()` in `app/lib/base-path.ts`.

### GitHub Pages

`.github/workflows/deploy.yml` builds and publishes every push to `main` at `https://<owner>.github.io/<repo>/`.

1. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main` (or run the workflow by hand under **Actions**).

The workflow sets `BASE_PATH=/<repo>/` and runs `npm run build:pages`. `scripts/prepare-pages.ts` moves the pages and assets to one level, adds the SPA fallback as `404.html` and a `.nojekyll`. With a custom domain the site lives at the root: set `BASE_PATH` to `/` in the workflow and put a `CNAME` file into `public/`.

## Demo import

`npm run import:demo -- --limit 200` loads:

- people from Wikidata
- portraits from Wikimedia Commons (public domain/CC0 only)
- life stories from Wikipedia

Wikimedia expects a contact in the User-Agent: `WIKIMEDIA_CONTACT=name@example.org npm run import:demo`. Responses are cached in `.cache/import`. Hand-edited portraits (`portrait.curated`) are kept.

## Structure

- `site.config.ts` – project configuration
- `app/` – React Router app (framework mode, fully pre-rendered, `ssr: false`)
  - `components/canvas` – mosaic (camera, gestures, tiles, controls)
  - `components/search`, `components/people`, `components/detail`, `components/shell` – search, overview, biography, shell
  - `lib/canvas` – layout and camera maths (pure, tested)
  - `lib/search` – search and filters (pure, tested)
  - `lib/content` – content schema, loader and adapter (replaceable by a CMS)
  - `lib/config`, `lib/theme`, `lib/i18n` – configuration schema, theme tokens and contrast check, languages
- `content/` – biographies, portraits, text pages
- `scripts/` – import, image pipeline, check and build scripts
- `e2e/` – Playwright tests
- `docs/` – accessibility audit report, screen reader protocol (German)
