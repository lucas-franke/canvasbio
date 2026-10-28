# Screenreader-Protokoll (Vorlage)

Pro Kombination aus Screenreader und Browser eine Kopie dieses Protokolls ausfüllen. Ergebnisse fließen in den [Prüfbericht](accessibility-audit.md) und die Erklärung zur Barrierefreiheit ein.

|                        |                                                                          |
| ---------------------- | ------------------------------------------------------------------------ |
| Datum                  |                                                                          |
| Prüfende Person        |                                                                          |
| Screenreader + Version | z. B. VoiceOver iOS 26 / TalkBack 16 / NVDA 2026.x                       |
| Browser + Gerät        | z. B. Safari auf iPhone 15 / Chrome auf Pixel 7 / Firefox auf Windows 11 |
| Build / Version        |                                                                          |

Bewertung je Schritt: **ok** · **Problem** (mit Beschreibung) · **nicht geprüft**

## Abläufe

| #   | Ablauf                                                      | Erwartung                                                                                              | Ergebnis | Notiz |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------- | ----- |
| 1   | Startseite öffnen, mit Überschriften-Navigation durchgehen  | Navigation zuerst; Titel „Ihre Stimme“ nur einmal (keine Region); Hinweis auf die Listenansicht        |          |       |
| 2   | „Mosaik“ aktivieren (Gruppe „Biografien entdecken“)                           | Zuerst der Hinweis: Bildfläche, Liste übersichtlicher; Link zur Liste             |          |       |
| 3   | In der Bildwand per Wischen / Tab eine Kachel erreichen     | Liste „Porträts“ mit 200 Einträgen und Ende; Name der Person; keine Doppelungen                        |          |       |
| 4   | „Zur Listenansicht“ nutzen                                  | Liste mit Buchstaben-Überschriften; Anzahl der Einträge je Liste                                       |          |       |
| 5   | A–Z-Index: zu einem Buchstaben springen                     | Fokus und Ansage landen auf der Buchstaben-Überschrift; leere Buchstaben als „keine Einträge“ angesagt |          |       |
| 6   | Biografie öffnen                                            | Fokus auf dem Namen; auf dem Handy als Dialog angesagt                                                 |          |       |
| 7   | Tabs „Biografie / Lebensgeschichte / Lebenslauf“ wechseln   | Tab-Rolle, Auswahlzustand und Inhalt werden angesagt                                                   |          |       |
| 8   | Fußnote in der Lebensgeschichte aufrufen und zurückspringen | Sprung zur Anmerkung und zurück funktioniert                                                           |          |       |
| 9   | Biografie schließen                                         | Fokus kehrt zur Person in der Übersicht zurück                                                         |          |       |
| 10  | Suche öffnen, Namen eingeben                                | Dialog „Suche“; nach kurzer Pause Ansage der Trefferzahl                                               |          |       |
| 11  | Filter-Chips (Wirkungsfeld) an- und abwählen                | Als Kontrollkästchen mit Zustand angesagt, innerhalb der Gruppe „Wirkungsfeld“                         |          |       |
| 12  | Ergebnisse anzeigen                                         | Ansage „N Personen gefunden“; Ergebnisleiste mit entfernbaren Filtern                                  |          |       |
| 13  | Filter-Chip entfernen                                       | Ergebnis aktualisiert sich, Fokus bleibt in der Ergebnisleiste                                         |          |       |
| 14  | „Nächster Treffer“ in der Bildwand                          | Ansage „Treffer 1 von N: Name“                                                                         |          |       |
| 15  | Leere Suche (z. B. „xyzxyz“)                                | „Keine Personen gefunden“ und „Suche zurücksetzen“ erreichbar                                          |          |       |
| 16  | „Zufällige Biografie“                                       | Biografie öffnet sich, Fokus auf dem Namen                                                             |          |       |
| 17  | „Ansicht“ aufklappen und Liste wählen                       | Aufklappen angesagt; aktive Ansicht als „aktuelle Seite“, Liste öffnet sich                            |          |       |
| 18  | Menü: Sprache wechseln (Englisch)                           | Sprache der Ansage wechselt; aktuelle Sprache und Seite sind markiert                                  |          |       |
| 19  | Menü: Darstellung (Hell / Dunkel / Wie Gerät)               | Als Optionsgruppe mit Auswahl angesagt                                                                 |          |       |
| 20  | Erklärung zur Barrierefreiheit öffnen, Kontakt-Link         | Seite erreichbar, E-Mail-Link verständlich                                                             |          |       |

## Gesamteindruck

- Verständlichkeit der Ansagen:
- Auffälligkeiten / Fehler (mit Schritt-Nr.):
- Empfehlungen:
