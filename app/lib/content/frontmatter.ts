import { parse } from "yaml";

/** Splits a Markdown document into YAML frontmatter data and body. */
export function parseFrontmatter(source: string): { data: unknown; body: string } {
  const match = source.replace(/^\uFEFF/, "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: source };
  return { data: parse(match[1]) ?? {}, body: match[2].trim() };
}
