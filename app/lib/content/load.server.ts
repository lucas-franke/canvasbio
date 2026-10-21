import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { z } from "zod";

import type { SiteConfig } from "~/lib/config/schema";
import { parseFrontmatter } from "./frontmatter";
import {
  personSchema,
  personTextSchema,
  taxonomySchema,
  type Person,
  type PersonText,
  type Taxonomy,
} from "./schema";

export interface ContentIssue {
  level: "error" | "warning";
  file: string;
  message: string;
}

export interface LoadedPerson {
  person: Person;
  texts: Map<string, { text: PersonText; story: string }>;
}

export interface LoadedContent {
  people: Map<string, LoadedPerson>;
  taxonomy: Taxonomy;
  issues: ContentIssue[];
}

const formatZodError = (error: z.ZodError) =>
  error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");

const exists = (file: string) =>
  access(file).then(
    () => true,
    () => false,
  );

/**
 * Reads and validates the whole content folder. Never throws on bad content;
 * problems are collected in `issues` so the validator can report all of them at once.
 */
export async function loadContent(root: string, config: SiteConfig): Promise<LoadedContent> {
  const issues: ContentIssue[] = [];
  const rel = (file: string) => path.relative(process.cwd(), file);
  const error = (file: string, message: string) => issues.push({ level: "error", file: rel(file), message });
  const warn = (file: string, message: string) => issues.push({ level: "warning", file: rel(file), message });

  const localeCodes = config.locales.map((l) => l.code);
  const requiredLocales = config.locales.filter((l) => l.contentRequired).map((l) => l.code);

  // Taxonomy
  const taxonomyFile = path.join(root, "taxonomy.json");
  let taxonomy: Taxonomy = {};
  try {
    const parsed = taxonomySchema.safeParse(JSON.parse(await readFile(taxonomyFile, "utf8")));
    if (parsed.success) taxonomy = parsed.data;
    else error(taxonomyFile, formatZodError(parsed.error));
  } catch (e) {
    error(taxonomyFile, `nicht lesbar: ${(e as Error).message}`);
  }
  for (const [facet, values] of Object.entries(taxonomy)) {
    for (const [value, labels] of Object.entries(values)) {
      const missing = localeCodes.filter((code) => !labels[code]);
      if (missing.length > 0)
        error(taxonomyFile, `${facet}.${value}: Übersetzung fehlt für ${missing.join(", ")}`);
    }
  }

  // People
  const people = new Map<string, LoadedPerson>();
  const peopleDir = path.join(root, "people");
  const folders = (await readdir(peopleDir, { withFileTypes: true }).catch(() => []))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const folder of folders) {
    const dir = path.join(peopleDir, folder);
    const personFile = path.join(dir, "person.json");

    let person: Person;
    try {
      const parsed = personSchema.safeParse(JSON.parse(await readFile(personFile, "utf8")));
      if (!parsed.success) {
        error(personFile, formatZodError(parsed.error));
        continue;
      }
      person = parsed.data;
    } catch (e) {
      error(personFile, `nicht lesbar: ${(e as Error).message}`);
      continue;
    }

    if (person.slug !== folder)
      error(personFile, `slug "${person.slug}" passt nicht zum Ordnernamen "${folder}"`);
    if (!(await exists(path.join(dir, person.portrait.file)))) {
      error(personFile, `Porträt "${person.portrait.file}" fehlt`);
    }
    for (const [facet, values] of Object.entries(person.facets)) {
      if (!config.facets.some((f) => f.key === facet)) {
        error(personFile, `Facette "${facet}" ist nicht in site.config.ts definiert`);
        continue;
      }
      for (const value of values) {
        if (!taxonomy[facet]?.[value])
          error(personFile, `Facettenwert "${facet}.${value}" fehlt in taxonomy.json`);
      }
    }

    const texts = new Map<string, { text: PersonText; story: string }>();
    for (const file of (await readdir(dir)).filter((f) => f.endsWith(".md"))) {
      const locale = file.slice(0, -3);
      const textFile = path.join(dir, file);
      if (!localeCodes.includes(locale)) {
        warn(textFile, `Locale "${locale}" ist nicht in site.config.ts konfiguriert und wird ignoriert`);
        continue;
      }
      const { data, body } = parseFrontmatter(await readFile(textFile, "utf8"));
      const parsed = personTextSchema.safeParse(data);
      if (!parsed.success) {
        error(textFile, formatZodError(parsed.error));
        continue;
      }
      if (!body) warn(textFile, "Lebensgeschichte (Markdown-Text) ist leer");
      texts.set(locale, { text: parsed.data, story: body });
    }
    for (const locale of requiredLocales) {
      if (!texts.has(locale)) error(path.join(dir, `${locale}.md`), "Pflicht-Übersetzung fehlt");
    }

    people.set(person.slug, { person, texts });
  }

  if (people.size === 0) error(peopleDir, "keine Personen gefunden");
  return { people, taxonomy, issues };
}
