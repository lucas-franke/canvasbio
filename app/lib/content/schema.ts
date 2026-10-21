import { z } from "zod";

/*
 * Content model. One folder per person:
 *
 *   content/people/<slug>/person.json   language-independent data
 *   content/people/<slug>/<locale>.md   translated texts (YAML frontmatter) + life story (Markdown body)
 *   content/people/<slug>/portrait.jpg  original portrait
 *   content/taxonomy.json               translated labels for facet values
 */

export const slugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug: only a-z, 0-9 and hyphens");

/** ISO date with the precision that is actually known: "1831", "1831-09" or "1831-09-20". */
export const partialDateSchema = z
  .string()
  .regex(/^-?\d{4}(-\d{2}(-\d{2})?)?$/, "Date as YYYY, YYYY-MM or YYYY-MM-DD");

const lifeEventSchema = z.object({
  date: partialDateSchema.optional(),
  /** Key into taxonomy.place. */
  place: slugSchema.optional(),
});

export const licenseSchema = z.object({
  /** Short license name as shown in credits, e.g. "Public domain", "CC0". */
  name: z.string().min(1),
  url: z.url().optional(),
});

export const personSchema = z.object({
  slug: slugSchema,
  name: z.object({
    /** Name as displayed, e.g. "Hedwig Dohm". */
    display: z.string().min(1),
    /** Sort key for the A–Z list, e.g. "Dohm, Hedwig". */
    sort: z.string().min(1),
  }),
  born: lifeEventSchema,
  died: lifeEventSchema.optional(),
  portrait: z.object({
    file: z.string().regex(/\.(jpe?g|png|webp)$/i),
    /** Creator / source line shown under the image. */
    credit: z.string().min(1),
    license: licenseSchema,
    sourceUrl: z.url(),
    /**
     * Square crops (tiles, list): focal point 0–1 from top-left, defaults to upper center
     * (faces). `zoom` > 1 crops tighter, e.g. one person out of a group photo.
     */
    focus: z
      .object({
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1),
        zoom: z.number().min(1).max(5).optional(),
      })
      .optional(),
    /** Chosen or cropped by hand: `npm run import:demo` keeps the image, credit and alt texts. */
    curated: z.boolean().optional(),
  }),
  /** Facet values per facet key from site.config (keys into taxonomy). */
  facets: z.record(z.string(), z.array(slugSchema)),
  /** 0 (little known) … 1 (very well known); used to favor lesser-known people in random picks. */
  prominence: z.number().min(0).max(1),
  /** Where the content comes from; shown as sources/attribution. */
  sources: z
    .array(z.object({ label: z.string().min(1), url: z.url(), license: licenseSchema.optional() }))
    .min(1),
  /** Optional external identifier, e.g. a Wikidata QID. */
  externalId: z.string().optional(),
});

export type Person = z.infer<typeof personSchema>;

/** Frontmatter of `<locale>.md`. The Markdown body is the life story. */
export const personTextSchema = z.object({
  /** Two short lines for list rows and search results (persecution / later role in the original concept). */
  summary: z.array(z.string().min(1)).min(1).max(3),
  /** Alternative text for the portrait (WCAG 1.1.1). Required. */
  portraitAlt: z.string().min(1),
  /** Key facts shown on the first detail tab. */
  facts: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })),
  quote: z
    .object({
      text: z.string().min(1),
      source: z.string().min(1),
      /** Language of the quote if it differs from the page (WCAG 3.1.2). */
      lang: z.string().optional(),
    })
    .optional(),
  timeline: z.array(z.object({ date: z.string().min(1), event: z.string().min(1) })),
});

export type PersonText = z.infer<typeof personTextSchema>;

export interface PersonLocalized extends Person {
  locale: string;
  text: PersonText;
  /** Life story as Markdown. */
  story: string;
}

/** Translated labels for facet values: taxonomy[facetKey][valueSlug][locale]. */
export const taxonomySchema = z.record(
  z.string(),
  z.record(slugSchema, z.record(z.string(), z.string().min(1))),
);

export type Taxonomy = z.infer<typeof taxonomySchema>;
