# Content

All biographies live in this folder. The build validates the format (`npm run validate:content`); invalid content stops the build.

```
content/
  taxonomy.json              Translated labels of the filter values
  people/<slug>/
    person.json              Language-independent data
    de.md, en.md             Texts per language (required per site.config.ts)
    portrait.jpg             Original portrait
```

## person.json

| Field                        | Meaning                                                                                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slug`                       | URL name; must match the folder name (`a-z`, `0-9`, `-`)                                                                                                                     |
| `name.display` / `name.sort` | Display name and sort key ("Dohm, Hedwig")                                                                                                                                   |
| `born` / `died`              | `date` as `YYYY`, `YYYY-MM` or `YYYY-MM-DD`; `place` as a key from `taxonomy.place`                                                                                          |
| `portrait`                   | File, credit (`credit`), licence, source URL; optional `focus` (`x`/`y` from 0–1, `zoom` ≥ 1) for the square crop; `curated: true` keeps a hand-picked portrait on re-import |
| `facets`                     | Filter values per facet from `site.config.ts`, e.g. `{ "field": ["politics"], "place": ["berlin"] }`                                                                         |
| `prominence`                 | 0 (little known) to 1 (very well known); the random biography favours lesser-known people                                                                                    |
| `sources`                    | Sources with licence, shown in the detail view                                                                                                                               |

## Texts (`<locale>.md`)

YAML front matter, followed by the life story in Markdown (headings from `##`, footnotes with `[^1]`). The example uses German content.

```markdown
---
summary: # 1–3 short lines for the list and search results
  - Deutsche Frauenrechtlerin und Schriftstellerin
  - 1831–1919 · Berlin
portraitAlt: Porträt von Hedwig Dohm # required (alt text, WCAG 1.1.1)
facts: # key facts in the "Biography" tab
  - label: Geboren
    value: 20. September 1831 in Berlin
quote: # optional
  text: Die Menschenrechte haben kein Geschlecht.
  source: Hedwig Dohm, 1876
timeline: # "Timeline" tab
  - date: "1876"
    event: Veröffentlichung von „Der Frauen Natur und Recht“
---

Life story …
```

If a text in an optional language (`contentRequired: false`) is missing, the page shows a notice. It does not silently fall back to another language.

## Portraits

`npm run build:images` generates square and full-size variants (AVIF/WebP), a blurred preview and the tone from `site.config.ts` (`theme.imageTreatment`). Unchanged images are skipped.

## Demo data

The demo content comes from three sources:

- people from Wikidata (CC0)
- portraits from Wikimedia Commons (public domain/CC0 only)
- life stories from Wikipedia (CC BY-SA 4.0, sources in `sources`)

Regenerate it with `npm run import:demo -- --limit 200`. Hand-edited portraits (`portrait.curated`) are kept.
