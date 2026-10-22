# Prüfbericht Barrierefreiheit (WCAG 2.2 AA)

**Stand:** 21. Oktober 2026 · **Gegenstand:** Template „CanvasBio“ mit Demo-Inhalten („Ihre Stimme“) · **Art:** Selbstbewertung

Dieser Bericht ist die Grundlage der [Erklärung zur Barrierefreiheit](../content/pages/accessibility.de.md). Bei einem neuen Projekt aus dem Template wird er mit den eigenen Inhalten wiederholt – vor allem die inhaltlichen Punkte (Alternativtexte, Sprache von Textteilen, Leichte Sprache) hängen vom Projekt ab.

## Ergebnis

|                            | Anzahl    |
| -------------------------- | --------- |
| Erfüllt                    | 41        |
| Teilweise erfüllt (Inhalt) | 1 (3.1.2) |
| Nicht anwendbar            | 13        |
| Nicht erfüllt              | 0         |

**Gesamturteil: teilweise vereinbar.** Die Technik erfüllt WCAG 2.2 AA. Einschränkungen betreffen die Demo-Inhalte (fremdsprachige Wörter in den Wikipedia-Auszügen nicht ausgezeichnet). Die manuellen Screenreader-Tests stehen noch aus (siehe unten); bis dahin gilt das Urteil als vorläufig.

## Prüfmethode

| Verfahren                                      | Umfang                                                                                                                                                              | Wo                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| axe-core (Regeln wcag2a, 2aa, 21a, 21aa, 22aa) | Alle Seitentypen in DE, EN, Leichter Sprache, hell und dunkel; dazu offene Zustände: Menü, Suchpanel, Suchergebnisse, Leerzustand, Steuerkreuz, ausgeblendete Namen | `e2e/a11y.spec.ts`                                                      |
| Geräteprofile                                  | Desktop Chrome, Pixel 7 (Chrome Android), iPhone 15 (WebKit)                                                                                                        | `playwright.config.ts`                                                  |
| Kontrast der Design-Tokens                     | Alle Text-, UI- und Fokus-Paare in hell und dunkel; bricht den Build bei Unterschreitung ab                                                                         | `scripts/check-contrast.ts`                                             |
| Umbruch (Reflow)                               | 320 CSS-px Breite (entspricht 400 % Zoom bei 1280 px)                                                                                                               | `e2e/quality.spec.ts`                                                   |
| Textabstände                                   | WCAG-1.4.12-Werte per Stylesheet, Prüfung auf abgeschnittenen Text                                                                                                  | `e2e/quality.spec.ts`                                                   |
| Sichtbarer Fokus                               | Tab durch Startseite, Bildwand, Liste, Biografie; jedes Ziel braucht einen Fokusindikator                                                                           | `e2e/quality.spec.ts`                                                   |
| Erzwungene Farben                              | Windows-Kontrastmodus emuliert, Fokus bleibt sichtbar                                                                                                               | `e2e/quality.spec.ts`                                                   |
| Tastatur- und Fokusabläufe                     | Bildwand mit Pfeiltasten, Zoom, Fokus beim Öffnen/Schließen von Biografie und Panels                                                                                | `e2e/canvas.spec.ts`, `e2e/person-detail.spec.ts`, `e2e/search.spec.ts` |
| Bewegung reduzieren                            | Kamerafahrten, Nachgleiten, Puls und Übergänge entfallen                                                                                                            | `e2e/random.spec.ts`, CSS                                               |
| Lighthouse (Mobil)                             | Accessibility 100 auf Start, Bildwand, Liste, Biografie, Über                                                                                                       | lokal, siehe [Performance](#performance)                                |
| Screenreader                                   | VoiceOver (iOS), TalkBack (Android), NVDA (Windows)                                                                                                                 | **offen** – [Protokollvorlage](screenreader-protokoll.md)               |

## Erfolgskriterien

Legende: ✅ erfüllt · ◐ teilweise · — nicht anwendbar

### Wahrnehmbar

| SC                                   | Stufe | Status | Umsetzung / Nachweis                                                                                                                                                                                                                                                                                       |
| ------------------------------------ | ----- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.1 Nicht-Text-Inhalt              | A     | ✅     | Porträts mit Alternativtext (Pflichtfeld im Inhaltsschema); dekoratives Mosaik `alt=""`; Icons `aria-hidden`, Icon-Buttons mit Namen. Hinweis: Alternativtexte nennen die Person, beschreiben das Bild aber nicht – für die Funktion ausreichend, ausführlichere Beschreibungen sind redaktionell möglich. |
| 1.2.1–1.2.5 Zeitbasierte Medien      | A/AA  | —      | Keine Audio- oder Videoinhalte.                                                                                                                                                                                                                                                                            |
| 1.3.1 Info und Beziehungen           | A     | ✅     | Landmarks, Überschriftenhierarchie, Listen, `dl` für Eckdaten, `ol` für den Lebenslauf, Fußnoten mit Rücksprung, `fieldset`/`legend` im Suchpanel. axe.                                                                                                                                                    |
| 1.3.2 Bedeutungstragende Reihenfolge | A     | ✅     | DOM-Reihenfolge folgt der visuellen; das Steuerkreuz steht im DOM nach den Zoom-Knöpfen (Tab-Reihenfolge).                                                                                                                                                                                                 |
| 1.3.3 Sensorische Merkmale           | A     | ✅     | Hinweise nennen Tasten und Funktionen, nicht Form oder Position.                                                                                                                                                                                                                                           |
| 1.3.4 Ausrichtung                    | AA    | ✅     | Keine Sperre auf Hoch- oder Querformat.                                                                                                                                                                                                                                                                    |
| 1.3.5 Eingabezweck bestimmen         | AA    | —      | Keine Felder für Angaben zur Person der Nutzenden.                                                                                                                                                                                                                                                         |
| 1.4.1 Benutzung von Farbe            | A     | ✅     | Gewählte Filter-Chips mit Häkchen, Links im Fließtext unterstrichen, aktive Ansicht durch Füllung (Form) markiert.                                                                                                                                                                                         |
| 1.4.2 Audio-Steuerelement            | A     | —      | Kein Audio.                                                                                                                                                                                                                                                                                                |
| 1.4.3 Kontrast (Minimum)             | AA    | ✅     | Token-Kontrastprüfung im Build, axe. Namen auf Fotos stehen auf einem garantiert dunklen Verlauf; auf gedimmten Kacheln (Suche) werden Namen ausgeblendet statt kontrastarm gezeigt.                                                                                                                       |
| 1.4.4 Textgröße                      | AA    | ✅     | `rem`-basierte Typografie; siehe 1.4.10.                                                                                                                                                                                                                                                                   |
| 1.4.5 Bilder eines Textes            | AA    | ✅     | Wortmarke als Text; Texte in historischen Fotos (z. B. Briefmarke) sind Teil des Bildes.                                                                                                                                                                                                                   |
| 1.4.10 Umbruch                       | AA    | ✅     | Keine horizontale Scrollleiste bei 320 px (Test). Die Bildwand ist ein zweidimensionaler Inhalt (Ausnahme); die Liste ist die eindimensionale Alternative.                                                                                                                                                 |
| 1.4.11 Nicht-Text-Kontrast           | AA    | ✅     | Rahmen von Eingabefeldern, Chips und Fokusindikator ≥ 3:1 (Token-Prüfung).                                                                                                                                                                                                                                 |
| 1.4.12 Textabstand                   | AA    | ✅     | Test mit den WCAG-Werten auf allen Seitentypen, im Suchpanel und im Menü: kein abgeschnittener Text. Lange Namen auf Kacheln enden mit „…“; der Linkname bleibt vollständig.                                                                                                                               |
| 1.4.13 Eingeblendeter Inhalt         | AA    | ✅     | Keine eigenen Tooltips oder Popover bei Hover.                                                                                                                                                                                                                                                             |

### Bedienbar

| SC                                      | Stufe | Status | Umsetzung / Nachweis                                                                                                                                                  |
| --------------------------------------- | ----- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1.1 Tastatur                          | A     | ✅     | Alle Funktionen per Tastatur: Bildwand (Roving Tabindex, Pfeiltasten, + / −), Suche, Filter, Zufällige Biografie, Tabs, Menü. Tests.                                  |
| 2.1.2 Keine Tastaturfalle               | A     | ✅     | Modale Panels (Menü, Suche, Biografie auf kleinen Bildschirmen) schließen mit Escape, Fokus kehrt zurück.                                                             |
| 2.1.4 Tastaturkürzel                    | A     | ✅     | „+“ und „−“ wirken nur, solange eine Kachel den Fokus hat.                                                                                                            |
| 2.2.1 Zeitbegrenzung anpassbar          | A     | —      | Keine Zeitbegrenzungen.                                                                                                                                               |
| 2.2.2 Pausieren, beenden, ausblenden    | A     | ✅     | Nichts bewegt sich von selbst; Animationen nur auf Aktion und kürzer als 5 s.                                                                                         |
| 2.3.1 Grenzwert von dreimaligem Blitzen | A     | ✅     | Keine blinkenden Inhalte.                                                                                                                                             |
| 2.4.1 Blöcke umgehen                    | A     | ✅     | „Zum Inhalt springen“; in der Bildwand „Zur Listenansicht“.                                                                                                           |
| 2.4.2 Seite mit Titel                   | A     | ✅     | Eindeutiger Titel je Seite und Person („Clara Zetkin – Ihre Stimme“).                                                                                                 |
| 2.4.3 Fokus-Reihenfolge                 | A     | ✅     | Beim Öffnen einer Biografie Fokus auf ihren Namen, beim Schließen zurück auf Kachel bzw. Listeneintrag; erst nach dem Übergang. Tests.                                |
| 2.4.4 Linkzweck (im Kontext)            | A     | ✅     | Alle Links mit sprechendem Namen (axe).                                                                                                                               |
| 2.4.5 Verschiedene Methoden             | AA    | ✅     | Bildwand, Liste mit A–Z, Suche und Filter, Zufällige Biografie.                                                                                                       |
| 2.4.6 Überschriften und Beschriftungen  | AA    | ✅     | Beschreibende Überschriften, sichtbare Feldbeschriftungen.                                                                                                            |
| 2.4.7 Fokus sichtbar                    | AA    | ✅     | Ring plus Halo (≥ 3:1 auf allen Hintergründen), in der Bildwand gegen den Zoom skaliert. Test.                                                                        |
| 2.4.11 Fokus nicht verdeckt (Minimum)   | AA    | ✅     | `scroll-padding-bottom` für Navigation und Zufalls-Button; die Bildwand rückt fokussierte Kacheln aus dem Bereich von Navigation, Steuerung und Ergebnisleiste. Test. |
| 2.5.1 Zeigergesten                      | A     | ✅     | Pinch-Zoom auch per Knöpfe, Verschieben per Steuerkreuz.                                                                                                              |
| 2.5.2 Zeigerabbruch                     | A     | ✅     | Auslösen erst beim Loslassen; nach einer Ziehbewegung öffnet sich keine Biografie. Test.                                                                              |
| 2.5.3 Beschriftung im Namen             | A     | ✅     | Zugängliche Namen enthalten die sichtbare Beschriftung (z. B. „Zurück“ → „Zurück zur Startseite“).                                                                    |
| 2.5.4 Auslösung durch Bewegung          | A     | —      | Keine bewegungsgesteuerten Funktionen.                                                                                                                                |
| 2.5.7 Ziehbewegungen                    | AA    | ✅     | Bildwand ohne Ziehen per Steuerkreuz, Tastatur, Treffer-Navigation; Liste als Alternative. Test.                                                                      |
| 2.5.8 Zielgröße (Minimum)               | AA    | ✅     | Projektstandard ≥ 44 × 44 px (axe `target-size`).                                                                                                                     |

### Verständlich

| SC                                    | Stufe | Status | Umsetzung / Nachweis                                                                                                                                                                  |
| ------------------------------------- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1.1 Sprache der Seite               | A     | ✅     | `lang` je Sprachversion (Leichte Sprache: `de`). Test.                                                                                                                                |
| 3.1.2 Sprache von Teilen              | AA    | ◐      | Sprachlinks, nicht übersetzte Texte und Fallbacks sind ausgezeichnet. **Offen (Inhalt):** fremdsprachige Wörter und Zitate in den importierten Wikipedia-Auszügen tragen kein `lang`. |
| 3.2.1 Bei Fokus                       | A     | ✅     | Fokus löst keinen Kontextwechsel aus.                                                                                                                                                 |
| 3.2.2 Bei Eingabe                     | A     | ✅     | Die Suche wird erst mit „Ergebnisse anzeigen“ angewendet; die Zahl im Button aktualisiert sich live.                                                                                  |
| 3.2.3 Konsistente Navigation          | AA    | ✅     | Gleiche untere Navigation und gleiches Menü auf allen Seiten.                                                                                                                         |
| 3.2.4 Konsistente Erkennung           | AA    | ✅     | Gleiche Funktionen mit gleichen Namen und Symbolen.                                                                                                                                   |
| 3.2.6 Konsistente Hilfe               | A     | ✅     | Erklärung zur Barrierefreiheit mit Kontakt im Menü jeder Seite.                                                                                                                       |
| 3.3.1 Fehlererkennung                 | A     | —      | Keine Eingaben mit Fehlerzuständen.                                                                                                                                                   |
| 3.3.2 Beschriftungen oder Anweisungen | A     | ✅     | Sichtbare Beschriftungen; Ortsfeld mit Hinweistext (`aria-describedby`). Behebt den Fehler im Konzept (Ortsfeld mit „Nach Namen suchen“ beschriftet).                                 |
| 3.3.3 Fehlerempfehlung                | AA    | —      | Siehe 3.3.1.                                                                                                                                                                          |
| 3.3.4 Fehlervermeidung                | AA    | —      | Keine rechtlichen oder finanziellen Transaktionen.                                                                                                                                    |
| 3.3.7 Redundante Eingabe              | A     | ✅     | Das Suchpanel öffnet mit der aktuellen Suche vorbelegt.                                                                                                                               |
| 3.3.8 Barrierefreie Authentifizierung | AA    | —      | Keine Anmeldung.                                                                                                                                                                      |

### Robust

| SC                      | Stufe | Status | Umsetzung / Nachweis                                                                                                             |
| ----------------------- | ----- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 4.1.2 Name, Rolle, Wert | A     | ✅     | Native Elemente und Radix-Primitives; Umschalter mit `aria-pressed`, Steuerkreuz mit `aria-expanded`, Tabs, `aria-current`. axe. |
| 4.1.3 Statusmeldungen   | AA    | ✅     | Live-Regionen für Trefferzahl (verzögert beim Tippen), Treffer-Navigation („Treffer 2 von 35: …“) und Ladezustände.              |

## Offene Punkte

1. **Screenreader-Tests** mit VoiceOver (iOS/Safari), TalkBack (Android/Chrome) und NVDA (Windows/Firefox) nach der [Protokollvorlage](screenreader-protokoll.md) – je Meilenstein und vor dem Livegang.
2. **3.1.2 Sprache von Teilen:** bei redaktionell gepflegten Texten fremdsprachige Passagen auszeichnen. Die Markdown-Pipeline lässt derzeit kein HTML durch; für `lang`-Auszeichnung braucht sie eine Erweiterung (z. B. eine Markdown-Direktive oder `rehype-raw` vor dem Sanitizer, der `lang` bereits erlaubt).
3. **Leichte Sprache:** weitere Texte schreiben und von einer Prüfgruppe prüfen lassen.
4. **Echte Geräte:** Gesten, Safe Areas und Bottom-Sheets auf einem aktuellen iPhone und Android-Gerät prüfen (Playwrights WebKit unter Windows ist nur eine Annäherung an Safari).

## Performance

Lighthouse 13.5 (Mobil, simuliertes langsames 4G), lokaler statischer Server mit vorkomprimierten Dateien, ohne HTTP/2 und Caching-Header:

| Seite            | Performance | LCP   | Accessibility | Best Practices | SEO |
| ---------------- | ----------- | ----- | ------------- | -------------- | --- |
| Startseite       | 90          | 3,0 s | 100           | 100            | 100 |
| Bildwand         | 84          | 3,5 s | 100           | 100            | 100 |
| Liste            | 85          | 3,3 s | 100           | 100            | 100 |
| Biografie        | 85          | 3,6 s | 100           | 100            | 100 |
| Über das Projekt | 90          | 2,9 s | 100           | 100            | 100 |

Umgesetzt: Zod aus dem Browser-Bundle entfernt (Konfiguration als Daten), Brotli/Gzip-Vorkomprimierung, Bildwand vorgerendert (LCP der Bildwand von 10,2 s auf 3,5 s). Weitere Hebel: Menü und Suchpanel (vaul/Radix, ~22 KB) erst bei Bedarf laden, Schriften auf die benötigten Zeichen reduzieren, beim Hosting `Cache-Control: immutable` für `/assets/` und HTTP/2 bzw. HTTP/3.
