/**
 * Applies the description cleanup of the import (scripts/import/descriptions.ts) to the
 * existing content, without a new import: the first summary line and the field of activity
 * ("Wirkungsfeld") of every person, in German also the feminine role words.
 *
 *   npx tsx scripts/fix-descriptions.ts
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { parse, stringify } from "yaml";

import { cleanDescription, feminine } from "./import/descriptions";

const CONTENT = path.resolve("content/people");
const FIELD = { de: "Wirkungsfeld", en: "Field" } as const;

interface Front {
  summary?: string[];
  facts?: { label: string; value: string }[];
}

let changed = 0;
for (const slug of await readdir(CONTENT)) {
  for (const lang of ["de", "en"] as const) {
    const file = path.join(CONTENT, slug, `${lang}.md`);
    const source = await readFile(file, "utf8").catch(() => null);
    const match = source?.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!source || !match) continue;
    const front = parse(match[1]!) as Front;
    // The second summary line is generated: "1857–1933 · Königshain-Wiederau".
    const [, born, died] = front.summary?.[1]?.match(/^(\d{4})–(\d{4})/) ?? [];
    const fix = (text: string) => {
      const cleaned = cleanDescription(text, { born, died });
      return lang === "de" ? feminine(cleaned) : cleaned;
    };

    const field = front.facts?.find((f) => f.label === FIELD[lang]);
    if (field) field.value = fix(field.value);
    if (front.summary?.length) {
      // The second line is the lifespan and place (generated), only the first is a description.
      const lines = front.summary.length > 1 ? front.summary.slice(1) : [];
      const description = fix(front.summary[0]!);
      const fallback = field?.value.split(", ").slice(0, 3).join(", ");
      // A description that was only the years: the occupations instead, as the import does.
      const first = description || fallback;
      front.summary = front.summary.length > 1 ? [...(first ? [first] : []), ...lines] : [first ?? ""];
    }

    const next = `---\n${stringify(front, { lineWidth: 0 })}---\n${match[2]}`;
    if (next !== source) {
      await writeFile(file, next);
      changed++;
    }
  }
}
console.log(`${changed} files changed`);
