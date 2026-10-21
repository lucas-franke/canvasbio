import { z } from "zod";

/**
 * White-label configuration schema. Every project built from this template
 * provides one `site.config.ts` that must satisfy this schema.
 */

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Colours must be 6-digit hex (#rrggbb)");

const localeCode = z.string().regex(/^[a-z]{2}(-[A-Za-z]{2,})?$/);

/** A string per locale, e.g. `{ de: "Suche", en: "Search" }`. */
const localized = z.record(localeCode, z.string().min(1));
/** Like `localized`, but empty strings are allowed (e.g. URL segments). */
const localizedOptional = z.record(localeCode, z.string());

/**
 * Semantic color tokens. Names describe the role, not the hue, so a project
 * can swap the palette without touching components.
 */
export const colorTokensSchema = z.object({
  /** Background of list/canvas pages. */
  page: hexColor,
  /** Cards, panels, dialogs. */
  surface: hexColor,
  /** Dark backdrop behind the portrait mosaic (start page, dialogs). */
  stage: hexColor,
  /** Text placed directly on the stage. */
  stageForeground: hexColor,
  /** Default body text. */
  text: hexColor,
  /** Headings and emphasized text. */
  emphasis: hexColor,
  /** Secondary text (captions, credits, meta). */
  muted: hexColor,
  /** Brand accent: primary buttons, links, highlighted text. */
  accent: hexColor,
  /** Text/icons on accent surfaces. */
  accentForeground: hexColor,
  /** Accent used for text/wordmark on the dark stage. */
  accentOnStage: hexColor,
  /** Decorative dividers (no contrast requirement). */
  border: hexColor,
  /** Boundaries of interactive controls (inputs, chips): needs 3:1. */
  borderControl: hexColor,
  /** Floating navigation pills. */
  nav: hexColor,
  navForeground: hexColor,
  /** Focus indicator: inner ring + contrasting outer halo. */
  focus: hexColor,
  focusHalo: hexColor,
});

export type ColorTokens = z.infer<typeof colorTokensSchema>;

export const siteConfigSchema = z.object({
  /**
   * Public address of the site, e.g. "https://example.org". Optional; when set, pages get
   * absolute canonical/share URLs and biographies a preview image for shared links.
   */
  siteUrl: z.url().optional(),

  brand: z.object({
    /** Project name, used in <title> and meta tags. */
    name: localized,
    /** Text wordmark shown in the header and on the start card. */
    wordmark: localized,
    /** Optional logo (path relative to /public). */
    logo: z.object({ src: z.string(), alt: localized, width: z.number(), height: z.number() }).optional(),
    description: localized,
  }),

  locales: z
    .array(
      z.object({
        /** Content locale and key for translations, e.g. "de", "en", "de-LS". */
        code: localeCode,
        /** First URL segment for this locale; "" for the default locale (no prefix). */
        prefix: z.string().regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/),
        /** Value for the HTML lang attribute (Leichte Sprache is still "de"). */
        htmlLang: z.string(),
        /** Name of the language in that language, for the switcher. */
        label: z.string(),
        /**
         * Whether every person must have a text in this locale. If false (e.g. Leichte Sprache),
         * missing texts show a notice instead of silently falling back to another language.
         */
        contentRequired: z.boolean().default(true),
      }),
    )
    .min(1),
  defaultLocale: z.string(),

  /** Translated URL segments of the pages, e.g. people: { de: "personen", en: "people" }. */
  paths: z.object({
    people: z.record(localeCode, z.string().regex(/^[a-z0-9-]+$/)),
    list: z.record(localeCode, z.string().regex(/^[a-z0-9-]+$/)),
    /** Timeline view below the people page. */
    timeline: z.record(localeCode, z.string().regex(/^[a-z0-9-]+$/)),
    about: z.record(localeCode, z.string().regex(/^[a-z0-9-]+$/)),
    /** Accessibility statement (German: Erklärung zur Barrierefreiheit). */
    accessibility: z.record(localeCode, z.string().regex(/^[a-z0-9-]+$/)),
    /** Legal notice (German: Impressum, § 5 DDG). */
    imprint: z.record(localeCode, z.string().regex(/^[a-z0-9-]+$/)),
    /** Privacy policy (German: Datenschutzerklärung, Art. 13 GDPR). */
    privacy: z.record(localeCode, z.string().regex(/^[a-z0-9-]+$/)),
  }),

  /**
   * Who runs the site. Fills the placeholders in content/pages/*.md: {{organisation}},
   * {{operatorBlock}} (name, address, phone, e-mail), {{contactEmail}}, {{statementDate}}.
   */
  operator: z.object({
    organisation: localized,
    /** Postal address, one line per entry. */
    address: z.array(z.string().min(1)).min(1),
    phone: z.string().optional(),
    /** Feedback contact for accessibility barriers (required by BITV 2.0 / EU 2016/2102). */
    contactEmail: z.email(),
    /** Date of the last review of the accessibility statement, ISO "YYYY-MM-DD". */
    statementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),

  theme: z.object({
    colors: z.object({ light: colorTokensSchema, dark: colorTokensSchema }),
    fonts: z.object({
      /** CSS font-family stacks. The font files are loaded in app/theme/fonts.ts. */
      heading: z.string(),
      body: z.string(),
      wordmark: z.string(),
    }),
    /** Base corner radius in rem; cards use a multiple of it. */
    radius: z.number().min(0).max(3),
    imageTreatment: z.enum(["sepia", "grayscale", "none"]),
    /** Duotone used for "sepia": shadows map to `shadow`, highlights to `highlight`. */
    imageTones: z
      .object({ shadow: hexColor, highlight: hexColor })
      .default({ shadow: "#1e140c", highlight: "#eedab8" }),
    tileEdge: z.enum(["torn", "none"]),
    /** Very light paper grain on the page background (archival look). */
    paperTexture: z.boolean().default(false),
  }),

  start: z.object({
    title: localized,
    subtitle: localized,
    quote: z.object({ text: localized, source: localized }).optional(),
    cta: localized,
  }),

  /**
   * Filter facets offered in the search panel. Keys refer to `facets` in person content and
   * are also the URL parameters of the search ("q" is reserved for the name).
   * - multi: choose any number of values (chips),
   * - autocomplete: free text with suggestions, matched against the value labels.
   */
  facets: z.array(
    z.object({
      key: z
        .string()
        .regex(/^[a-z][a-zA-Z0-9]*$/)
        .refine((key) => key !== "q", '"q" is reserved for the name search'),
      type: z.enum(["multi", "autocomplete"]),
      label: localized,
      /** Short help text below the field. */
      hint: localized.optional(),
    }),
  ),

  detail: z.object({
    tabs: z.array(
      z.object({
        id: z.enum(["facts", "story", "timeline"]),
        label: localized,
        /** URL segment for the tab; the first tab has none. */
        slug: localizedOptional,
      }),
    ),
  }),

  /**
   * Timeline view: key dates of the collection's subject, marked on the time axis
   * (e.g. when women got the vote). Optional; without events the axis shows only years.
   */
  timeline: z
    .object({
      events: z.array(z.object({ year: z.number().int(), label: localized })),
    })
    .default({ events: [] }),

  canvas: z.object({
    /** Tile edge length in CSS px at zoom 1. */
    tileSize: z.number().positive(),
    gap: z.number().min(0),
    /** Horizontal offset of every other row, as a fraction of (tileSize + gap). */
    rowOffset: z.number().min(0).max(1),
    /** Repeat the layout endlessly in all directions. */
    wrap: z.boolean(),
    minZoom: z.number().positive(),
    maxZoom: z.number().positive(),
    /**
     * Slight size and position variation of the tiles (0–0.3): each tile is drawn between
     * (1 − sizeVariance) and full size, a little off-centre. Loosens the strict grid into a
     * collage; 0 turns it off.
     */
    sizeVariance: z.number().min(0).max(0.3).default(0),
  }),

  features: z.object({
    randomBio: z.boolean(),
    hideNames: z.boolean(),
    easyLanguage: z.boolean(),
    themeToggle: z.boolean(),
  }),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;
export type SiteConfigInput = z.input<typeof siteConfigSchema>;
export type FacetConfig = SiteConfig["facets"][number];

/** Validates a config and adds cross-field checks the schema alone can't express. */
export function defineSiteConfig(input: SiteConfigInput): SiteConfig {
  const config = siteConfigSchema.parse(input);
  const codes = config.locales.map((l) => l.code);

  if (!codes.includes(config.defaultLocale)) {
    throw new Error(`defaultLocale "${config.defaultLocale}" is missing from locales (${codes.join(", ")})`);
  }
  const prefixes = config.locales.map((l) => l.prefix);
  if (new Set(prefixes).size !== prefixes.length) {
    throw new Error(`locales[].prefix must be unique (${prefixes.join(", ")})`);
  }
  const defaultPrefix = config.locales.find((l) => l.code === config.defaultLocale)!.prefix;
  if (defaultPrefix !== "" || prefixes.filter((p) => p === "").length !== 1) {
    throw new Error("Only the defaultLocale has an empty prefix; all other locales need one");
  }
  if (config.canvas.minZoom >= config.canvas.maxZoom) {
    throw new Error("canvas.minZoom must be smaller than canvas.maxZoom");
  }
  const incomplete = findIncompleteTranslations(config, codes);
  if (incomplete.length > 0) {
    throw new Error(`Missing translations in site.config:\n  ${incomplete.join("\n  ")}`);
  }
  return config;
}

const looksLocalized = (value: object) => {
  const keys = Object.keys(value);
  return (
    keys.length > 0 &&
    keys.every((k) => localeCode.safeParse(k).success) &&
    Object.values(value).every((v) => typeof v === "string")
  );
};

/** Finds localized objects that don't cover every configured locale. */
function findIncompleteTranslations(node: unknown, codes: string[], path = "config"): string[] {
  if (Array.isArray(node)) {
    return node.flatMap((item, i) => findIncompleteTranslations(item, codes, `${path}[${i}]`));
  }
  if (node === null || typeof node !== "object") return [];
  if (looksLocalized(node)) {
    const missing = codes.filter((c) => !(c in node));
    return missing.length > 0 ? [`${path}: ${missing.join(", ")}`] : [];
  }
  return Object.entries(node).flatMap(([key, value]) =>
    findIncompleteTranslations(value, codes, `${path}.${key}`),
  );
}
