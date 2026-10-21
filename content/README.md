# Inhalte

Alle Biografien liegen in diesem Ordner. Das Format wird beim Build geprüft (`npm run validate:content`); fehlerhafte Inhalte brechen den Build ab.

```
content/
  taxonomy.json              Übersetzte Labels der Filterwerte
  people/<slug>/
    person.json              Sprachunabhängige Daten
    de.md, en.md             Texte pro Sprache (Pflicht laut site.config.ts)
    de-LS.md                 Leichte Sprache (optional)
    portrait.jpg             Original-Porträt
```

## person.json

| Feld                         | Bedeutung                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `slug`                       | URL-Name, muss dem Ordnernamen entsprechen (`a-z`, `0-9`, `-`)                                                         |
| `name.display` / `name.sort` | Anzeigename und Sortierschlüssel („Dohm, Hedwig“)                                                                      |
| `born` / `died`              | `date` als `JJJJ`, `JJJJ-MM` oder `JJJJ-MM-TT`, `place` als Schlüssel aus `taxonomy.place`                             |
| `portrait`                   | Datei, Bildnachweis (`credit`), Lizenz, Quell-URL; optional `focus` (`x`/`y` von 0–1) für den quadratischen Ausschnitt |
| `facets`                     | Filterwerte pro Facette aus `site.config.ts`, z. B. `{ "field": ["politics"], "place": ["berlin"] }`                   |
| `prominence`                 | 0 (wenig bekannt) bis 1 (sehr bekannt); „Zufällige Biografie“ bevorzugt wenig bekannte Personen                        |
| `sources`                    | Quellen mit Lizenz, werden in der Detailansicht angezeigt                                                              |

## Texte (`<locale>.md`)

YAML-Frontmatter, danach die Lebensgeschichte in Markdown (Überschriften ab `##`, Fußnoten mit `[^1]`).

```markdown
---
summary: # 1–3 kurze Zeilen für Liste und Suchergebnisse
  - Deutsche Frauenrechtlerin und Schriftstellerin
  - 1831–1919 · Berlin
portraitAlt: Porträt von Hedwig Dohm # Pflicht (Alternativtext, WCAG 1.1.1)
facts: # Eckdaten im Tab „Biografie“
  - label: Geboren
    value: 20. September 1831 in Berlin
quote: # optional
  text: Die Menschenrechte haben kein Geschlecht.
  source: Hedwig Dohm, 1876
timeline: # Tab „Lebenslauf“
  - date: "1876"
    event: Veröffentlichung von „Der Frauen Natur und Recht“
---

Lebensgeschichte …
```

Fehlt eine optionale Sprache wie Leichte Sprache, zeigt die Seite einen Hinweis statt still eine andere Sprache.

## Porträts

`npm run build:images` erzeugt daraus quadratische und vollformatige Varianten (AVIF/WebP), eine Unschärfe-Vorschau und die Tönung aus `site.config.ts` (`theme.imageTreatment`). Unveränderte Bilder werden übersprungen.

## Demo-Daten

Die mitgelieferten Personen stammen aus Wikidata (CC0), die Porträts aus Wikimedia Commons (nur gemeinfrei/CC0), die Lebensgeschichten aus Wikipedia (CC BY-SA 4.0, Quellen in `sources`). Neu erzeugen mit `npm run import:demo -- --limit 200`. Handgeschriebene Dateien wie `de-LS.md` werden dabei nicht überschrieben.
