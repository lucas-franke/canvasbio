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
    name: { de: "Ihre Stimme", en: "Her Voice", "de-LS": "Ihre Stimme" },
    wordmark: { de: "Ihre Stimme", en: "Her Voice", "de-LS": "Ihre Stimme" },
    description: {
      de: "Biografien von Pionierinnen der Frauenbewegung, 1850–1950.",
      en: "Biographies of pioneers of the women's movement, 1850–1950.",
      "de-LS":
        "Hier finden Sie Lebens-Geschichten von Frauen. Diese Frauen haben für die Rechte von Frauen gekämpft.",
    },
  },

  locales: [
    { code: "de", prefix: "", htmlLang: "de", label: "Deutsch" },
    { code: "en", prefix: "en", htmlLang: "en", label: "English" },
    {
      code: "de-LS",
      prefix: "leichte-sprache",
      htmlLang: "de",
      label: "Leichte Sprache",
      contentRequired: false,
    },
  ],
  defaultLocale: "de",

  paths: {
    people: { de: "personen", en: "people", "de-LS": "personen" },
    /** Sub-path of the list view below the people page, e.g. "/personen/liste". */
    list: { de: "liste", en: "list", "de-LS": "liste" },
    /** Sub-path of the timeline view ("Zeitstrahl"), e.g. "/personen/zeitstrahl". */
    timeline: { de: "zeitstrahl", en: "timeline", "de-LS": "zeitstrahl" },
    about: { de: "ueber", en: "about", "de-LS": "ueber" },
    accessibility: { de: "barrierefreiheit", en: "accessibility", "de-LS": "barrierefreiheit" },
    imprint: { de: "impressum", en: "legal-notice", "de-LS": "impressum" },
    privacy: { de: "datenschutz", en: "privacy", "de-LS": "datenschutz" },
  },

  operator: {
    organisation: {
      de: "Demo-Projekt „Ihre Stimme“",
      en: "Demo project “Her Voice”",
      "de-LS": "Das Projekt „Ihre Stimme“",
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
        nav: "#101113",
        navForeground: "#fbf5e9",
        focus: "#101113",
        focusHalo: "#fbf5e9",
      },
      dark: {
        page: "#141518",
        surface: "#1d1e22",
        stage: "#0b0b0c",
        stageForeground: "#f4efe6",
        text: "#c9cad0",
        emphasis: "#f4efe6",
        muted: "#a3a5ae",
        accent: "#e69487",
        accentForeground: "#141518",
        accentOnStage: "#e69487",
        border: "#34363c",
        borderControl: "#80828c",
        nav: "#2a2b30",
        navForeground: "#f4efe6",
        focus: "#f4efe6",
        focusHalo: "#101113",
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
  },

  start: {
    title: { de: "Ihre Stimme", en: "Her Voice", "de-LS": "Ihre Stimme" },
    // ⁠ (word joiner) keeps "1850–1950" from breaking at the dash.
    subtitle: {
      de: "Pionierinnen der Frauenbewegung, 1850–\u20601950",
      en: "Pioneers of the women's movement, 1850–\u20601950",
      "de-LS": "Frauen, die für die Rechte von Frauen gekämpft haben",
    },
    quote: {
      text: {
        de: "Die Menschenrechte haben kein Geschlecht.",
        en: "Human rights have no sex.",
        "de-LS": "Die Menschenrechte haben kein Geschlecht.",
      },
      source: {
        de: "Hedwig Dohm, „Der Frauen Natur und Recht“, 1876",
        en: "Hedwig Dohm, “Der Frauen Natur und Recht”, 1876",
        "de-LS": "Hedwig Dohm, im Jahr 1876",
      },
    },
    cta: { de: "Biografien entdecken", en: "Explore biographies", "de-LS": "Zu den Frauen" },
  },

  facets: [
    { key: "field", type: "multi", label: { de: "Wirkungsfeld", en: "Field", "de-LS": "Beruf" } },
    {
      key: "place",
      type: "autocomplete",
      label: { de: "Ort", en: "Place", "de-LS": "Ort" },
      hint: {
        de: "Geburts- oder Sterbeort",
        en: "Place of birth or death",
        "de-LS": "Wo sie geboren ist. Oder wo sie gestorben ist.",
      },
    },
  ],

  detail: {
    tabs: [
      {
        id: "facts",
        label: { de: "Biografie", en: "Biography", "de-LS": "Über sie" },
        slug: { de: "", en: "", "de-LS": "" },
      },
      {
        id: "story",
        label: { de: "Lebensgeschichte", en: "Life story", "de-LS": "Ihre Geschichte" },
        slug: { de: "geschichte", en: "story", "de-LS": "geschichte" },
      },
      {
        id: "timeline",
        label: { de: "Lebenslauf", en: "Timeline", "de-LS": "Wichtige Jahre" },
        slug: { de: "lebenslauf", en: "timeline", "de-LS": "jahre" },
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
          "de-LS": "In Amerika treffen sich Frauen. Sie fordern gleiche Rechte.",
        },
      },
      {
        year: 1893,
        label: {
          de: "Neuseeland: erstes landesweites Frauenwahlrecht",
          en: "New Zealand: first nationwide women's suffrage",
          "de-LS": "In Neuseeland dürfen Frauen als Erste wählen.",
        },
      },
      {
        year: 1906,
        label: {
          de: "Finnland: Frauen dürfen wählen und gewählt werden",
          en: "Finland: women can vote and stand for election",
          "de-LS": "In Finnland dürfen Frauen wählen. Und sie dürfen gewählt werden.",
        },
      },
      {
        year: 1918,
        label: {
          de: "Frauenwahlrecht in Deutschland",
          en: "Women's suffrage in Germany",
          "de-LS": "In Deutschland dürfen Frauen wählen.",
        },
      },
      {
        year: 1920,
        label: {
          de: "USA: Frauenwahlrecht im 19. Zusatzartikel",
          en: "US: women's suffrage in the 19th Amendment",
          "de-LS": "In Amerika dürfen Frauen wählen.",
        },
      },
      {
        year: 1971,
        label: {
          de: "Schweiz: Frauenwahlrecht auf Bundesebene",
          en: "Switzerland: women's suffrage at federal level",
          "de-LS": "In der Schweiz dürfen Frauen wählen.",
        },
      },
    ],
  },

  canvas: {
    tileSize: 240,
    gap: 48,
    rowOffset: 0.5,
    wrap: true,
    minZoom: 0.4,
    maxZoom: 2.5,
    sizeVariance: 0.16,
  },

  features: {
    randomBio: true,
    hideNames: true,
    easyLanguage: true,
    themeToggle: true,
  },
});
