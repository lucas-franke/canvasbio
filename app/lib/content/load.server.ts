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
    error(taxonomyFile, `not readable: ${(e as Error).message}`);
  }
  for (const [facet, values] of Object.entries(taxonomy)) {
    for (const [value, labels] of Object.entries(values)) {
      const missing = localeCodes.filter((code) => !labels[code]);
      if (missing.length > 0)
        error(taxonomyFile, `${facet}.${value}: translation missing for ${missing.join(", ")}`);
    }
  }

  // People
  const people = new Map<string, LoadedPerson>();
  const peopleDir = path.join(root, "people");
  const folders = (await readdir(peopleDir, { withFileTypes: true }).catch(() => []))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  // Folders are read in parallel (sequential reads of hundreds of people stalled the
  // pre-rendering server), then added in sorted order.
  const loadPerson = async (folder: string): Promise<LoadedPerson | null> => {
    const dir = path.join(peopleDir, folder);
    const personFile = path.join(dir, "person.json");

    let person: Person;
    try {
      const parsed = personSchema.safeParse(JSON.parse(await readFile(personFile, "utf8")));
      if (!parsed.success) {
        error(personFile, formatZodError(parsed.error));
        return null;
      }
      person = parsed.data;
    } catch (e) {
      error(personFile, `not readable: ${(e as Error).message}`);
      return null;
    }

    if (person.slug !== folder)
      error(personFile, `slug "${person.slug}" does not match the folder name "${folder}"`);
    if (!(await exists(path.join(dir, person.portrait.file)))) {
      error(personFile, `portrait "${person.portrait.file}" is missing`);
    }
    for (const [facet, values] of Object.entries(person.facets)) {
      if (!config.facets.some((f) => f.key === facet)) {
        error(personFile, `facet "${facet}" is not defined in site.config.ts`);
        continue;
      }
      for (const value of values) {
        if (!taxonomy[facet]?.[value])
          error(personFile, `facet value "${facet}.${value}" is missing from taxonomy.json`);
      }
    }

    const texts = new Map<string, { text: PersonText; story: string }>();
    for (const file of (await readdir(dir)).filter((f) => f.endsWith(".md"))) {
      const locale = file.slice(0, -3);
      const textFile = path.join(dir, file);
      if (!localeCodes.includes(locale)) {
        warn(textFile, `locale "${locale}" is not configured in site.config.ts and is ignored`);
        continue;
      }
      const { data, body } = parseFrontmatter(await readFile(textFile, "utf8"));
      const parsed = personTextSchema.safeParse(data);
      if (!parsed.success) {
        error(textFile, formatZodError(parsed.error));
        continue;
      }
      if (!body) warn(textFile, "life story (Markdown body) is empty");
      texts.set(locale, { text: parsed.data, story: body });
    }
    for (const locale of requiredLocales) {
      if (!texts.has(locale)) error(path.join(dir, `${locale}.md`), "required translation is missing");
    }

    return { person, texts };
  };
  for (const entry of await Promise.all(folders.map(loadPerson))) {
    if (entry) people.set(entry.person.slug, entry);
  }

  if (people.size === 0) error(peopleDir, "no people found");
  return { people, taxonomy, issues };
}
