/**
 * Generates portrait variants from content/people/<slug>/<portrait>:
 * square crops and full-aspect versions as AVIF + WebP, a blurred placeholder,
 * and the image treatment (sepia/grayscale) from site.config.ts.
 *
 *   npx tsx scripts/build-images.ts [--force]
 *
 * Output: public/portraits/<slug>/*.{avif,webp} and .generated/portraits.json.
 * Unchanged images are skipped (source hash + treatment are compared).
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

import sharp, { type Sharp } from "sharp";

import {
  FULL_WIDTHS,
  IMAGE_FORMATS,
  SQUARE_WIDTHS,
  type PortraitManifest,
  type PortraitManifestEntry,
} from "../app/lib/content/images";
import { personSchema, type Person } from "../app/lib/content/schema";
import siteConfig from "../site.config";

const { values: args } = parseArgs({ options: { force: { type: "boolean", default: false } } });

const PEOPLE = path.resolve("content/people");
const OUT = path.resolve("public/portraits");
const MANIFEST = path.resolve(".generated/portraits.json");
const treatment = siteConfig.theme.imageTreatment;
const tones = siteConfig.theme.imageTones;

/** Default crop focus for portraits: horizontally centered, faces sit in the upper third. */
const DEFAULT_FOCUS = { x: 0.5, y: 0.35 };

/** Bump when the manifest format or the variants change, so cached entries are rebuilt. */
const MANIFEST_VERSION = 3;

const LUMA: [number, number, number] = [0.2126, 0.7152, 0.0722];
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/**
 * "sepia" is a duotone: luminance is mapped linearly from the shadow to the highlight tone.
 * Unlike sharp's tint() this gives a clearly warm image without blowing out highlights.
 */
function treat(image: Sharp): Sharp {
  if (treatment === "grayscale") return image.grayscale();
  if (treatment === "sepia") {
    const [shadow, highlight] = [rgb(tones.shadow), rgb(tones.highlight)];
    return image
      .toColourspace("srgb")
      .recomb([LUMA, LUMA, LUMA])
      .linear(
        highlight.map((h, i) => (h - shadow[i]) / 255),
        shadow,
      );
  }
  return image;
}

function squareRegion(width: number, height: number, focus = DEFAULT_FOCUS) {
  const side = Math.min(width, height);
  const clamp = (v: number, max: number) => Math.round(Math.min(Math.max(v, 0), max));
  return {
    left: clamp(focus.x * width - side / 2, width - side),
    top: clamp(focus.y * height - side / 2, height - side),
    width: side,
    height: side,
  };
}

const encoders = {
  avif: (img: Sharp) => img.avif({ quality: 52, effort: 4 }),
  webp: (img: Sharp) => img.webp({ quality: 74 }),
};

async function processPerson(person: Person, source: Buffer, hash: string): Promise<PortraitManifestEntry> {
  const dir = path.join(OUT, person.slug);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const base = treat(sharp(source).rotate());
  const { width = 0, height = 0 } = await sharp(source).rotate().metadata();
  const square = squareRegion(width, height, person.portrait.focus);

  const jobs: Promise<unknown>[] = [];
  for (const format of IMAGE_FORMATS) {
    for (const w of SQUARE_WIDTHS) {
      const img = base.clone().extract(square).resize(w, w);
      jobs.push(encoders[format](img).toFile(path.join(dir, `sq-${w}.${format}`)));
    }
    for (const w of FULL_WIDTHS) {
      const img = base.clone().resize({ width: w, withoutEnlargement: true });
      jobs.push(encoders[format](img).toFile(path.join(dir, `full-${w}.${format}`)));
    }
  }
  await Promise.all(jobs);

  const full = await base
    .clone()
    .resize({ width: FULL_WIDTHS.at(-1), withoutEnlargement: true })
    .toBuffer({
      resolveWithObject: true,
    });
  const lqip = await base.clone().extract(square).resize(16, 16).blur(1).webp({ quality: 40 }).toBuffer();
  // stats() reads the input image, so measure the already treated (toned) pixels.
  const treated = await base.clone().extract(square).resize(32, 32).toBuffer();
  const { dominant } = await sharp(treated).stats();
  const color = `#${[dominant.r, dominant.g, dominant.b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;

  return {
    width: full.info.width,
    height: full.info.height,
    lqip: `data:image/webp;base64,${lqip.toString("base64")}`,
    color,
    hash,
  };
}

/** Runs `task` over `items` with limited concurrency (AVIF encoding is CPU-heavy). */
async function pool<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await task(items[next++]);
    }),
  );
}

async function main() {
  const previous: PortraitManifest = args.force
    ? {}
    : JSON.parse(await readFile(MANIFEST, "utf8").catch(() => "{}"));
  const manifest: PortraitManifest = {};
  const slugs = (await readdir(PEOPLE, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let built = 0;
  let skipped = 0;
  const failures: string[] = [];

  await pool(slugs, Math.max(1, availableParallelism() - 1), async (slug) => {
    try {
      const person = personSchema.parse(
        JSON.parse(await readFile(path.join(PEOPLE, slug, "person.json"), "utf8")),
      );
      const source = await readFile(path.join(PEOPLE, slug, person.portrait.file));
      const hash = createHash("sha1")
        .update(source)
        .update(
          JSON.stringify({
            MANIFEST_VERSION,
            treatment,
            tones,
            focus: person.portrait.focus,
            SQUARE_WIDTHS,
            FULL_WIDTHS,
          }),
        )
        .digest("hex")
        .slice(0, 10);

      if (previous[slug]?.hash === hash) {
        manifest[slug] = previous[slug];
        skipped++;
        return;
      }
      manifest[slug] = await processPerson(person, source, hash);
      built++;
      if (built % 20 === 0) console.log(`  ${built} Porträts erzeugt …`);
    } catch (error) {
      failures.push(`${slug}: ${(error as Error).message}`);
    }
  });

  // Remove output of people that no longer exist.
  for (const entry of await readdir(OUT, { withFileTypes: true }).catch(() => [])) {
    if (entry.isDirectory() && !manifest[entry.name])
      await rm(path.join(OUT, entry.name), { recursive: true });
  }

  await mkdir(path.dirname(MANIFEST), { recursive: true });
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);

  console.log(`Porträts: ${built} erzeugt, ${skipped} unverändert (Tönung: ${treatment})`);
  if (failures.length > 0) {
    console.error(`Fehler bei ${failures.length} Porträt(s):\n  ${failures.join("\n  ")}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
