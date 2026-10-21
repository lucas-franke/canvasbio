/**
 * Portrait variants produced by scripts/build-images.ts and how they are addressed.
 * Shared by the build script and the UI so both agree on names and sizes.
 */

/** Square crops for canvas tiles, list rows and search results. */
export const SQUARE_WIDTHS = [160, 320, 640] as const;
/** Original aspect ratio for the detail view. */
export const FULL_WIDTHS = [640, 1280] as const;
export const IMAGE_FORMATS = ["avif", "webp"] as const;

export type PortraitKind = "sq" | "full";
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

export const PORTRAIT_BASE = "/portraits";

export interface PortraitManifestEntry {
  /** Pixel size of the largest "full" variant (for aspect ratio / layout). */
  width: number;
  height: number;
  /** Tiny blurred placeholder as data URI (used for the large detail portrait). */
  lqip: string;
  /** Dominant color as #rrggbb (cheap placeholder for lists and the canvas). */
  color: string;
  /** Changes whenever the source image or treatment changes (cache busting). */
  hash: string;
}

/** What lists and the canvas need: no blurred placeholder, which would bloat the page data. */
export type PortraitThumb = Omit<PortraitManifestEntry, "lqip">;

export type PortraitManifest = Record<string, PortraitManifestEntry>;

export function portraitUrl(
  slug: string,
  kind: PortraitKind,
  width: number,
  format: ImageFormat,
  hash: string,
) {
  return `${PORTRAIT_BASE}/${slug}/${kind}-${width}.${format}?v=${hash}`;
}

/** `srcset` value for one format, e.g. for a <source type="image/avif">. */
export function portraitSrcSet(slug: string, kind: PortraitKind, format: ImageFormat, hash: string): string {
  const widths = kind === "sq" ? SQUARE_WIDTHS : FULL_WIDTHS;
  return widths.map((w) => `${portraitUrl(slug, kind, w, format, hash)} ${w}w`).join(", ");
}
