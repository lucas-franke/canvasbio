/**
 * Wikidata descriptions and occupation labels as the site shows them. Wikidata often has
 * only the masculine German form, repeats the life dates, or carries leftovers of a template.
 */

/** Masculine role words found in the imported data, and their feminine form. */
const FEMININE: Record<string, string> = {
  Abstinenzler: "Abstinenzlerin",
  Aktivist: "Aktivistin",
  Antifaschist: "Antifaschistin",
  Apartheidgegner: "Apartheidgegnerin",
  Außenminister: "Außenministerin",
  Berater: "Beraterin",
  Defectologist: "Defektologin",
  Erziehungwissenschaftler: "Erziehungswissenschaftlerin",
  Ernährungsberater: "Ernährungsberaterin",
  Fabrikarbeiter: "Fabrikarbeiterin",
  Feminist: "Feministin",
  Fundraiser: "Fundraiserin",
  Kommunist: "Kommunistin",
  Krankenpfleger: "Krankenpflegerin",
  Lecturer: "Dozentin",
  Menschenrechtler: "Menschenrechtlerin",
  Mitbegründer: "Mitbegründerin",
  Politiker: "Politikerin",
  Sanitätsoffizier: "Sanitätsoffizierin",
  Schulpsychologe: "Schulpsychologin",
  Unabhängigkeitsaktivist: "Unabhängigkeitsaktivistin",
  Wohltäter: "Wohltäterin",
};

const word = (w: string) => new RegExp(`(?<!\\p{L})${w}(?!\\p{L})`, "gu");

/**
 * German text with feminine role words. Whole words only: "Politikerin" and the compound
 * ellipsis in "Bürger- und Frauenrechtlerin" stay as they are. An adjective before a feminine
 * noun agrees with it ("Belgischer Politikerin" → "Belgische Politikerin").
 */
export function feminine(text: string): string {
  let result = text;
  for (const [masculine, female] of Object.entries(FEMININE))
    result = result.replace(word(masculine), female);
  return result.replace(/(?<!\p{L})(\p{Lu}\p{Ll}*isch)er (\p{L}+in)(?!\p{L})/gu, "$1e $2");
}

/** Invisible hyphenation hint, copied along from Wikidata. */
const SOFT_HYPHEN = String.fromCharCode(0xad);

/** Years of birth and death ("1878", "1960"), as far as known. */
export interface LifeYears {
  born?: string;
  died?: string;
}

/**
 * A description without what the page shows anyway or what doesn't belong in it: soft
 * hyphens, template leftovers after "|" ("… | geboren: 1904 | …") and the person's own life
 * dates, e.g. "(1855-1934)", ", 1822-1913" or a leading "1983-2016, ". Other year ranges stay
 * (terms of office: "Secretary of Labor 1933–1945"). What is left can be empty (the
 * description was only the years); callers fall back to the occupations then.
 */
export function cleanDescription(text: string, life: LifeYears = {}): string {
  let result = text.replaceAll(SOFT_HYPHEN, "").split(" | ")[0]!;
  if (life.born && life.died) {
    const span = String.raw`${life.born}\s*[–-]\s*${life.died}`;
    result = result
      // Reference-book style: "Murray, Eunice Guthrie (1878–1960), suffragist and author".
      .replace(new RegExp(String.raw`^[^()]*,[^()]*\(${span}\),\s*`), "")
      .replace(new RegExp(String.raw`\s*\(${span}\)`, "g"), "")
      .replace(new RegExp(String.raw`^\s*${span}\s*(?:,\s*|$)`), "")
      .replace(new RegExp(String.raw`,\s*${span}\s*$`), "");
  }
  return result.replace(/^[\s,;:]+|[\s,;:]+$/g, "").trim();
}
