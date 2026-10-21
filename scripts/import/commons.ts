import { chunk, fetchJson } from "./http";

const API = "https://commons.wikimedia.org/w/api.php";

export interface CommonsImage {
  file: string;
  /** Thumbnail URL at the requested width. */
  url: string;
  pageUrl: string;
  license: { name: string; url?: string };
  artist: string;
  year?: string;
}

interface ImageInfo {
  thumburl: string;
  descriptionurl: string;
  extmetadata: Record<string, { value: string } | undefined>;
}

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    // Commons templates often contain the text twice (visible + hidden), e.g. "Unknown authorUnknown author".
    .replace(/^(.{3,}?)\s*\1(?=\W|$)/, "$1");

/**
 * Only public domain and CC0 images are imported, so the demo needs no
 * license-specific handling beyond the credit line.
 */
function isFree(meta: ImageInfo["extmetadata"]): boolean {
  const license = (meta.License?.value ?? "").toLowerCase();
  const short = (meta.LicenseShortName?.value ?? "").toLowerCase();
  return license.startsWith("pd") || license === "cc0" || short.includes("public domain") || short === "cc0";
}

/** Fetches license metadata and a thumbnail URL for Commons files; drops non-free ones. */
export async function getFreeImages(files: string[], width: number): Promise<Map<string, CommonsImage>> {
  const result = new Map<string, CommonsImage>();
  for (const batch of chunk(files, 50)) {
    const titles = batch.map((f) => `File:${f}`).join("|");
    const url = `${API}?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${width}&titles=${encodeURIComponent(titles)}`;
    const data = await fetchJson<{
      query: {
        normalized?: { from: string; to: string }[];
        pages: Record<string, { title: string; imageinfo?: ImageInfo[] }>;
      };
    }>(url);

    // Wikidata stores names with spaces; the API may normalize them (e.g. underscores, capitalization).
    const original = new Map(data.query.normalized?.map((n) => [n.to, n.from]) ?? []);
    for (const page of Object.values(data.query.pages)) {
      const info = page.imageinfo?.[0];
      if (!info || !isFree(info.extmetadata)) continue;
      const meta = info.extmetadata;
      const file = (original.get(page.title) ?? page.title).replace(/^File:/, "");
      result.set(file, {
        file,
        url: info.thumburl,
        pageUrl: info.descriptionurl,
        license: {
          name: stripHtml(meta.LicenseShortName?.value ?? "Public domain"),
          url: meta.LicenseUrl?.value,
        },
        artist: stripHtml(meta.Artist?.value ?? "") || "Unbekannt",
        year: (meta.DateTimeOriginal?.value ?? "").match(/\b(1[89]\d{2})\b/)?.[1],
      });
    }
  }
  return result;
}
