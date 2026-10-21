import { htmlLangFor } from "~/lib/i18n/localize";

/**
 * Formats a partial ISO date ("1831", "1831-09", "1831-09-20") for display,
 * showing only the precision that is actually known.
 */
export function formatPartialDate(date: string, locale: string): string {
  const negative = date.startsWith("-");
  const [y, m, d] = date.replace(/^-/, "").split("-").map(Number);
  if (negative) {
    // Before the common era: year only, with the localised era ("50 v. Chr.", "50 BC").
    const value = new Date(Date.UTC(2000, 0, 1));
    value.setUTCFullYear(1 - y!);
    return new Intl.DateTimeFormat(htmlLangFor(locale), {
      timeZone: "UTC",
      year: "numeric",
      era: "short",
    }).format(value);
  }

  const value = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  const options: Intl.DateTimeFormatOptions = { timeZone: "UTC", year: "numeric" };
  if (m !== undefined) options.month = "long";
  if (d !== undefined) options.day = "numeric";
  return new Intl.DateTimeFormat(htmlLangFor(locale), options).format(value);
}

/** Year part of a partial date, e.g. "1831-09-20" → "1831". */
export const yearOf = (date: string) => date.match(/^-?\d{4}/)?.[0] ?? date;

const NAME_PARTICLES = new Set([
  "von",
  "van",
  "de",
  "du",
  "da",
  "di",
  "zu",
  "la",
  "le",
  "der",
  "den",
  "ten",
  "ter",
]);

/**
 * Sort key "Family, Given particle" following German library convention:
 * "Bertha von Suttner" → "Suttner, Bertha von", "Clara Zetkin" → "Zetkin, Clara".
 */
export function sortName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length < 2) return displayName.trim();
  const family = parts[parts.length - 1];
  const rest = parts.slice(0, -1);
  const particles: string[] = [];
  while (rest.length > 1 && NAME_PARTICLES.has(rest[rest.length - 1].toLowerCase())) {
    particles.unshift(rest.pop()!);
  }
  return `${family}, ${[...rest, ...particles].join(" ")}`;
}

/** Letters that Unicode normalization can't decompose into a base letter. */
const TRANSLITERATION: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss",
  ø: "o",
  æ: "ae",
  œ: "oe",
  ł: "l",
  đ: "d",
  ð: "d",
  þ: "th",
  ı: "i",
};

/** URL-safe slug: "Bertha von Suttner" → "bertha-von-suttner", "Gertrud Bäumer" → "gertrud-baeumer". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöüßøæœłđðþı]/g, (c) => TRANSLITERATION[c])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** First letter for A–Z grouping; umlauts and accents group under their base letter. */
export function indexLetter(sortKey: string): string {
  const letter = sortKey.normalize("NFD").replace(/[̀-ͯ]/g, "").charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : "#";
}
