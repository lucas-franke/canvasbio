import { defineSiteConfig } from "./app/lib/config/schema.ts";

/**
 * Project configuration (white-label).
 * A new project starts by copying the template and editing this file
 * plus the `content/` folder. See README for details.
 */
export default defineSiteConfig({
  // Public address once deployed (enables share previews and canonical URLs), e.g.:
  // siteUrl: "https://ihre-stimme.example.org",

  brand: {
    name: { de: "Ihre Stimme", en: "Her Voice" },
    wordmark: { de: "Ihre Stimme", en: "Her Voice" },
    monogram: "S",
    description: {
      de: "Biografien von Pionierinnen der Frauenbewegung, 1850–1950.",
      en: "Biographies of pioneers of the women's movement, 1850–1950.",
    },
  },

  locales: [
    { code: "de", prefix: "", htmlLang: "de", label: "Deutsch" },
    { code: "en", prefix: "en", htmlLang: "en", label: "English" },
  ],
  defaultLocale: "de",

  paths: {
    people: { de: "personen", en: "people" },
    /** Sub-path of the list view below the people page, e.g. "/personen/liste". */
    list: { de: "liste", en: "list" },
    /** Sub-path of the timeline view ("Zeitstrahl"), e.g. "/personen/zeitstrahl". */
    timeline: { de: "zeitstrahl", en: "timeline" },
    /** Sub-path of the map view, e.g. "/personen/karte". */
    map: { de: "karte", en: "map" },
    about: { de: "ueber", en: "about" },
    accessibility: { de: "barrierefreiheit", en: "accessibility" },
    imprint: { de: "impressum", en: "legal-notice" },
    privacy: { de: "datenschutz", en: "privacy" },
  },

  operator: {
    organisation: {
      de: "Demo-Projekt „Ihre Stimme“",
      en: "Demo project “Her Voice”",
    },
    // Demo values: replace with the real operator before going live.
    address: ["Musterstraße 1", "12345 Musterstadt"],
    contactEmail: "barrierefreiheit@example.org",
    statementDate: "2026-10-21",
  },

  theme: {
    colors: {
      light: {
        page: "#f7f0e2",
        surface: "#fbf5e9",
        stage: "#101113",
        stageForeground: "#fbf5e9",
        text: "#37393e",
        emphasis: "#101113",
        muted: "#62646e",
        accent: "#a8513e",
        accentForeground: "#fbf5e9",
        accentOnStage: "#e69487",
        border: "#d9d3c7",
        borderControl: "#7d7f89",
        // Light floating controls on the light page: calmer than black pills.
        nav: "#fdfaf4",
        navForeground: "#101113",
        focus: "#101113",
        focusHalo: "#fbf5e9",
      },
      dark: {
        page: "#0d0e10",
        surface: "#16171a",
        stage: "#060607",
        stageForeground: "#f4efe6",
        text: "#c9cad0",
        emphasis: "#f4efe6",
        muted: "#a3a5ae",
        accent: "#e69487",
        accentForeground: "#141518",
        accentOnStage: "#e69487",
        border: "#2a2c31",
        borderControl: "#80828c",
        nav: "#1e1f23",
        navForeground: "#f4efe6",
        focus: "#f4efe6",
        focusHalo: "#0d0e10",
      },
    },
    fonts: {
      heading: '"IBM Plex Serif", ui-serif, Georgia, serif',
      body: '"IBM Plex Sans Variable", "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
      wordmark: '"IBM Plex Sans Variable", "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    },
    radius: 0.75,
    imageTreatment: "sepia",
    imageTones: { shadow: "#1e140c", highlight: "#eedab8" },
    tileEdge: "torn",
    paperTexture: true,
    portraitTint: { blend: "soft-light", opacity: 1 },
  },

  start: {
    title: { de: "Ihre Stimme", en: "Her Voice" },
    // ⁠ (word joiner) keeps "1850–1950" from breaking at the dash.
    subtitle: {
      de: "Pionierinnen der Frauenbewegung, 1850–\u20601950",
      en: "Pioneers of the women's movement, 1850–\u20601950",
    },
    quote: {
      text: {
        de: "Die Menschenrechte haben kein Geschlecht.",
        en: "Human rights have no sex.",
      },
      source: {
        de: "Hedwig Dohm, „Der Frauen Natur und Recht“, 1876",
        en: "Hedwig Dohm, “Der Frauen Natur und Recht”, 1876",
      },
    },
    cta: { de: "Biografien entdecken", en: "Explore biographies" },
  },

  facets: [
    { key: "field", type: "multi", label: { de: "Wirkungsfeld", en: "Field" } },
    {
      key: "place",
      type: "autocomplete",
      label: { de: "Ort", en: "Place" },
      hint: {
        de: "Geburts- oder Sterbeort",
        en: "Place of birth or death",
      },
    },
  ],

  detail: {
    tabs: [
      {
        id: "facts",
        label: { de: "Biografie", en: "Biography" },
        slug: { de: "", en: "" },
      },
      {
        id: "story",
        label: { de: "Lebensgeschichte", en: "Life story" },
        slug: { de: "geschichte", en: "story" },
      },
      {
        id: "timeline",
        label: { de: "Lebenslauf", en: "Timeline" },
        slug: { de: "lebenslauf", en: "timeline" },
      },
    ],
  },

  timeline: {
    events: [
      {
        year: 1848,
        label: {
          de: "Seneca Falls: erste Frauenrechtskonvention in den USA",
          en: "Seneca Falls: first women's rights convention in the US",
        },
      },
      {
        year: 1893,
        label: {
          de: "Neuseeland: erstes landesweites Frauenwahlrecht",
          en: "New Zealand: first nationwide women's suffrage",
        },
      },
      {
        year: 1906,
        label: {
          de: "Finnland: Frauen dürfen wählen und gewählt werden",
          en: "Finland: women can vote and stand for election",
        },
      },
      {
        year: 1918,
        label: {
          de: "Frauenwahlrecht in Deutschland",
          en: "Women's suffrage in Germany",
        },
      },
      {
        year: 1920,
        label: {
          de: "USA: Frauenwahlrecht im 19. Zusatzartikel",
          en: "US: women's suffrage in the 19th Amendment",
        },
      },
      {
        year: 1971,
        label: {
          de: "Schweiz: Frauenwahlrecht auf Bundesebene",
          en: "Switzerland: women's suffrage at federal level",
        },
      },
    ],
  },

  canvas: {
    tileSize: 240,
    gap: 48,
    rowOffset: 0.5,
    wrap: false,
    minZoom: 0.4,
    maxZoom: 2.5,
    sizeVariance: 0.16,
  },

  features: {
    randomBio: true,
    themeToggle: true,
  },
});
