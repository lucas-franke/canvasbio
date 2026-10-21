import { fetchJson } from "./http";

/** Sections that are lists, references or links rather than the life story. */
const STOP_SECTIONS: Record<"de" | "en", RegExp> = {
  de: /^(Literatur|Weblinks|Einzelnachweise|Anmerkungen|Siehe auch|Werke|Schriften|Veröffentlichungen|Publikationen|Filme?|Ehrungen|Nachlass|Quellen|Rezeption)\b/i,
  en: /^(References|External links|See also|Further reading|Notes|Works|Bibliography|Publications|Selected works|Sources|Citations|Legacy|Honours|Honors|Filmography)\b/i,
};

/** Characters that only occur in phonetic (IPA) notation. */
const IPA = /[ˈˌːˑəɐɛɪʊʃʒθðŋæɔɑʌɒɜʝɲʁɥøœ]|\u0303/; // \u0303: combining tilde (nasal vowels)

/**
 * Removes what the plain-text extract leaves behind of pronunciation markup:
 * "Clara Zetkin (; German: [ˈtsɛtkiːn]; née Eißner …" → "Clara Zetkin (née Eißner …".
 * Editorial brackets ("[…]", "[Hardy]") stay.
 */
export function cleanExtractText(text: string): string {
  return (
    text
      // IPA in square brackets (also with an apostrophe as stress mark).
      .replace(/\s*\[[^\]\n]*\]/g, (match) => (IPA.test(match) || /\['/.test(match) ? "" : match))
      // Labels whose content was removed: "German: ;", "Dutch pronunciation: ;", "Aussprache ,".
      .replace(/(?:\p{L}+ )?\p{L}+:\s*(?=[;,)])|\b(?:Aussprache|pronounced|listen|anhören)\s*(?=[;,)])/gu, "")
      // Doubled separators, separators at the edges of parentheses, empty parentheses.
      .replace(/;\s*;/g, ";")
      .replace(/\(\s*[;,]\s*/g, "(")
      .replace(/\s*[;,]\s*\)/g, ")")
      .replace(/\s*\(\s*\)/g, "")
      // A separator now preceded by a space ("Sand ,"), but not ellipses or other periods.
      .replace(/ ([;,])/g, "$1")
  );
}

/** Upper bound for the imported story; the rest is reachable via the source link. */
const MAX_CHARS = 9000;

/**
 * Plain-text article extract converted to Markdown: headings become ##/###,
 * reference/list sections at the end are dropped, length is capped at a section boundary.
 */
export async function getStory(lang: "de" | "en", title: string): Promise<string> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&titles=${encodeURIComponent(title)}`;
  const data = await fetchJson<{ query: { pages: Record<string, { extract?: string }> } }>(url);
  const extract = Object.values(data.query.pages)[0]?.extract ?? "";

  const blocks: string[] = [];
  let length = 0;
  for (const section of extract.split(/\n(?===+ )/)) {
    const heading = section.match(/^(=+) (.+?) =+\s*\n?/);
    const title = heading?.[2] ?? "";
    if (heading && STOP_SECTIONS[lang].test(title)) break;

    const body = section
      .replace(/^(=+) .+? =+\s*\n?/, "")
      .split(/\n+/)
      .map((p) => cleanExtractText(p.trim()))
      .filter(Boolean)
      .join("\n\n");
    if (length + body.length > MAX_CHARS && blocks.length > 0) break;

    const level = heading ? Math.min(heading[1].length, 3) : 0;
    // Headings without own text are kept: they usually introduce subsections ("== Leben ==").
    if (level > 0) blocks.push(`${"#".repeat(level)} ${title}`);
    if (body) blocks.push(body);
    length += body.length;
  }
  // Drop headings left dangling at the end (their content was cut off).
  while (blocks.length > 0 && blocks[blocks.length - 1].startsWith("#")) blocks.pop();
  return blocks.join("\n\n");
}

export const articleUrl = (lang: "de" | "en", title: string) =>
  `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
