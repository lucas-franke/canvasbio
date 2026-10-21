import { readFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { siteConfig } from "~/lib/config";
import { localize } from "~/lib/i18n/localize";
import { formatPartialDate } from "./format";
import { parseFrontmatter } from "./frontmatter";
import { renderMarkdown } from "./markdown.server";

const pageMetaSchema = z.object({ title: z.string().min(1), description: z.string().min(1) });

export interface StaticPage {
  title: string;
  description: string;
  html: string;
  /** Locale the page text is in (default locale if this locale has no own version). */
  locale: string;
}

/** Operator details from site.config.ts, so page texts stay reusable across projects. */
function fillPlaceholders(source: string, locale: string): string {
  const { operator } = siteConfig;
  const organisation = localize(operator.organisation, locale);
  const email = `[${operator.contactEmail}](mailto:${operator.contactEmail})`;
  // Markdown hard line breaks (two spaces) keep the address lines together.
  const operatorBlock = [organisation, ...operator.address, operator.phone, email]
    .filter(Boolean)
    .join("  \n");
  const values: Record<string, string> = {
    organisation,
    operatorBlock,
    contactEmail: operator.contactEmail,
    statementDate: formatPartialDate(operator.statementDate, locale),
  };
  return source.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match);
}

/** Loads content/pages/<name>.<locale>.md, falling back to the default locale. */
export async function loadPage(name: string, locale: string): Promise<StaticPage> {
  for (const candidate of [locale, siteConfig.defaultLocale]) {
    const file = path.resolve("content/pages", `${name}.${candidate}.md`);
    const source = await readFile(file, "utf8").catch(() => null);
    if (source === null) continue;

    const { data, body } = parseFrontmatter(fillPlaceholders(source, locale));
    const meta = pageMetaSchema.parse(data);
    return { ...meta, locale: candidate, html: await renderMarkdown(body, { headingOffset: 0 }) };
  }
  throw new Response(`Page "${name}" not found`, { status: 404 });
}
