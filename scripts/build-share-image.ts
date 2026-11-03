/**
 * The preview image for links to pages without a portrait of their own (start page, views,
 * about): a collage of portraits on the page colour, 1200 × 630 as messengers and social
 * media expect. A fixed mix of people (the same on every build), never by prominence.
 *
 *   npx tsx scripts/build-share-image.ts   (after build-images, which makes the squares)
 *
 * Output: public/share.jpg
 */
import { readdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { seededShuffle } from "../app/lib/canvas/layout";
import siteConfig from "../site.config";

const WIDTH = 1200;
const HEIGHT = 630;
const COLS = 7;
const ROWS = 4;
const GAP = 10;
const PORTRAITS = path.resolve("public/portraits");

const tile = Math.floor((WIDTH - GAP * (COLS + 1)) / COLS);
const top = Math.round((HEIGHT - (ROWS * tile + (ROWS - 1) * GAP)) / 2);
// Every other row shifted by half a tile, like the brick pattern of the mosaic.
const offset = (row: number) => (row % 2 === 1 ? -Math.round(tile / 2) : 0);

const slugs = seededShuffle((await readdir(PORTRAITS)).sort(), "share-image");
const cells: { row: number; col: number }[] = [];
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS + (row % 2); col++) cells.push({ row, col });
}

// Tiles reaching past the left or right edge are cut off there, as on the wall.
const composites = await Promise.all(
  cells.map(async ({ row, col }, i) => {
    const left = GAP + col * (tile + GAP) + offset(row);
    const from = Math.max(0, -left);
    const width = Math.min(tile, WIDTH - left) - from;
    const input = await sharp(path.join(PORTRAITS, slugs[i]!, "sq-320.webp"))
      .resize(tile, tile)
      .extract({ left: from, top: 0, width, height: tile })
      .toBuffer();
    return { input, left: left + from, top: top + row * (tile + GAP) };
  }),
);

await sharp({
  create: { width: WIDTH, height: HEIGHT, channels: 3, background: siteConfig.theme.colors.light.page },
})
  .composite(composites)
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(path.resolve("public/share.jpg"));
console.log(`Share image: ${cells.length} portraits, public/share.jpg`);
