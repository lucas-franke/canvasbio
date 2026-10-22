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
    people: "Biografien",
    about: "Über das Projekt",
    accessibility: "Barrierefreiheit",
    imprint: "Impressum",
    privacy: "Datenschutz",
    legal: "Rechtliches",
    search: "Suche",
    menu: "Menü",
    closeMenu: "Menü schließen",
  },
  view: {
    label: "Ansicht",
    canvas: "Mosaik",
    list: "Liste",
    timeline: "Zeitstrahl",
  },
  sort: {
    label: "Sortieren",
    name: "Name A–Z",
    "name-desc": "Name Z–A",
    born: "Geburtsjahr, älteste zuerst",
    "born-desc": "Geburtsjahr, jüngste zuerst",
    died: "Todesjahr",
    age: "Lebensdauer, längste zuerst",
  },
  chapters: {
    letter: "Alphabet",
    born: "Jahrzehnte",
    died: "Todesjahre",
    age: "Lebensdauer",
    title: "Springen zu",
    other: "Andere",
    decade: (year: number) => `${year}er`,
    diedHeading: (year: number) => `Gestorben in den ${year}er-Jahren`,
    age10: (years: number) => (years >= 100 ? "100+" : `${years}–${years + 9}`),
    ageHeading: (years: number) => (years >= 100 ? "100+" : `${years} bis ${years + 9} Jahre alt geworden`),
    unknown: { born: "Geburtsjahr unbekannt", died: "Todesjahr unbekannt", age: "Lebensdauer unbekannt" },
    unknownShort: "Unbekannt",
  },
  language: {
    label: "Sprache",
    current: "aktuelle Sprache",
  },
  theme: {
    label: "Darstellung",
    system: "Wie Gerät",
    light: "Hell",
    dark: "Dunkel",
  },
  start: {
    onThisDay: "An diesem Tag",
    comingUp: "In den nächsten Tagen",
    anniversaryToday: (kind: "born" | "died", years: number) =>
      `Heute vor ${years} Jahren ${kind === "born" ? "geboren" : "gestorben"}`,
    anniversaryUpcoming: (kind: "born" | "died", date: string) =>
      `${kind === "born" ? "Geboren" : "Gestorben"} am ${date}`,
    portraitsLabel: "Porträts aus der Sammlung",
  },
  people: {
    title: "Biografien",
    listTitle: "Biografien als Liste",
    timelineTitle: "Biografien als Zeitstrahl",
    gridTitle: "Biografien als Mosaik",
    /** Badge in languages where not every biography exists (contentRequired: false): this one does. */
    ownText: "In Leichter Sprache",
  },
  search: {
    title: "Suche",
    suggestions: "Passende Personen",
    clearName: "Eingabe löschen",
    peopleCount: (n: number) => (n === 1 ? "1 Person" : `${n} Personen`),
    close: "Suche schließen",
    name: "Nach Namen suchen",
    show: (n: number) =>
      n === 0 ? "Keine Treffer" : n === 1 ? "1 Ergebnis anzeigen" : `${n} Ergebnisse anzeigen`,
    found: (n: number) =>
      n === 0 ? "Keine Personen gefunden" : n === 1 ? "1 Person gefunden" : `${n} Personen gefunden`,
    reset: "Zurücksetzen",
    results: (n: number) => `Ergebnisse (${n})`,
    change: "Suche ändern",
    filters: (n: number) => `Filter (${n})`,
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
  timeline: {
    legend: "Jeder Balken zeigt eine Lebenszeit. Wer übereinander liegt, lebte zur selben Zeit.",
    legendInteractive: "Zeigen Sie auf eine Person, um ihre Zeitgenossen hervorzuheben.",
    events: "Wichtige Daten",
  },
  random: {
    label: "Zufällige Biografie",
  },
  canvas: {
    label: "Mosaik",
    hint: "Mit den Pfeiltasten von Porträt zu Porträt, mit Plus und Minus zoomen. Alle Personen gibt es auch als Liste.",
    toList: "Zur Listenansicht",
    controls: "Mosaik steuern",
    zoomIn: "Vergrößern",
    zoomOut: "Verkleinern",
    gestureHintTouch: "Wischen zum Erkunden, tippen zum Öffnen",
    gestureHintPointer: "Ziehen zum Erkunden, klicken zum Öffnen",
    gestureHintClose: "Hinweis schließen",
  },
  detail: {
    close: "Schließen",
    more: "Weitere Biografien",
    previous: "Vorherige",
    next: "Nächste",
    randomAnother: "Noch eine zufällige Biografie",
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
    related: "Ähnliche Biografien",
    readingTime: (minutes: number) => `${minutes} ${minutes === 1 ? "Minute" : "Minuten"} Lesezeit`,
    outline: "Inhalt",
    sameEra: "Zur selben Zeit",
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
