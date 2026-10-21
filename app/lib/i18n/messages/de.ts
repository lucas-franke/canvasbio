/**
 * UI strings (German, reference). Other locales must provide the same shape;
 * a missing key fails the typecheck. Project-specific texts (title, start page)
 * live in site.config.ts instead.
 */
export const de = {
  skipToContent: "Zum Inhalt springen",
  nav: {
    label: "Hauptnavigation",
    home: "Startseite",
    back: "Zurück",
    backToStart: "Zurück zur Startseite",
    people: "Biografien",
    about: "Über das Projekt",
    accessibility: "Barrierefreiheit",
    search: "Suche",
    menu: "Menü",
    closeMenu: "Menü schließen",
  },
  view: {
    label: "Ansicht",
    canvas: "Bilder",
    list: "Liste",
  },
  alphabet: {
    label: "Alphabet",
    open: "A–Z",
    title: "Zu Buchstabe springen",
    jumpTo: (letter: string) => `Zu ${letter} springen`,
    empty: (letter: string) => `Keine Einträge mit ${letter}`,
  },
  language: {
    label: "Sprache",
    easyLanguage: "Leichte Sprache",
    current: "aktuelle Sprache",
  },
  theme: {
    label: "Darstellung",
    system: "Wie Gerät",
    light: "Hell",
    dark: "Dunkel",
  },
  start: {
    portraitsLabel: "Porträts aus der Sammlung",
  },
  people: {
    title: "Biografien",
    listTitle: "Biografien als Liste",
    gridTitle: "Biografien als Bilder",
    count: (n: number) => (n === 1 ? "1 Person" : `${n} Personen`),
    /** Badge in languages where not every biography exists (Leichte Sprache): this one does. */
    ownText: "In Leichter Sprache",
  },
  search: {
    title: "Suche",
    close: "Suche schließen",
    name: "Nach Namen suchen",
    show: (n: number) =>
      n === 0 ? "Keine Treffer" : n === 1 ? "1 Ergebnis anzeigen" : `${n} Ergebnisse anzeigen`,
    found: (n: number) =>
      n === 0 ? "Keine Personen gefunden" : n === 1 ? "1 Person gefunden" : `${n} Personen gefunden`,
    reset: "Zurücksetzen",
    results: (n: number) => `Ergebnisse (${n})`,
    change: "Suche ändern",
    nameChip: (q: string) => `Name: ${q}`,
    removeFilter: (label: string) => `Filter „${label}“ entfernen`,
    empty: "Keine Personen gefunden",
    emptyHint: "Versuchen Sie einen anderen Namen oder weniger Filter.",
    clear: "Suche zurücksetzen",
    previousHit: "Vorheriger Treffer",
    nextHit: "Nächster Treffer",
    hitStatus: (i: number, n: number, name: string) => `Treffer ${i} von ${n}: ${name}`,
    loading: "Wird geladen …",
  },
  random: {
    label: "Zufällige Biografie",
  },
  canvas: {
    hideNames: "Namen ausblenden",
    label: "Porträtwand",
    hint: "Mit den Pfeiltasten von Porträt zu Porträt, mit Plus und Minus zoomen. Alle Personen gibt es auch als Liste.",
    toList: "Zur Listenansicht",
    controls: "Porträtwand steuern",
    zoomIn: "Vergrößern",
    zoomOut: "Verkleinern",
    move: "Verschieben",
    moveLeft: "Nach links",
    moveRight: "Nach rechts",
    moveUp: "Nach oben",
    moveDown: "Nach unten",
    recenter: "Zur Mitte",
  },
  detail: {
    close: "Schließen",
    sections: "Abschnitte",
    portraitCredit: "Bild",
    license: "Lizenz",
    source: "Quelle",
    sources: "Quellen",
    footnotes: "Anmerkungen",
    footnoteBack: "Zurück zum Text",
    notTranslated: (language: string) =>
      `Diese Biografie gibt es noch nicht in ${language}. Sie lesen den deutschen Text.`,
    loadingOverview: "Übersicht wird geladen …",
    loadFailed: "Die Übersicht konnte nicht geladen werden. Bitte prüfen Sie die Internetverbindung.",
    retry: "Erneut versuchen",
  },
  error: {
    title: "Fehler",
    text: "Ein unerwarteter Fehler ist aufgetreten.",
  },
  notFound: {
    title: "Seite nicht gefunden",
    text: "Diese Seite gibt es nicht. Vielleicht wurde sie verschoben.",
    toStart: "Zur Startseite",
  },
};

/** Shape every locale must implement. */
export type Messages = typeof de;
