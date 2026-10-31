/**
 * Writes Brotli (.br) and Gzip (.gz) versions of all text files in build/client.
 * Static servers can serve them directly (nginx `gzip_static`/`brotli_static`, sirv
 * `--brotli --gzip` in `npm run preview`); hosts that compress on the fly ignore them.
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { brotliCompress, constants, gzip } from "node:zlib";
import { promisify } from "node:util";

const ROOT = path.resolve("build/client");
const TEXT = /\.(html|m?js|css|json|svg|txt|xml|webmanifest|data)$/;
/** Smaller files don't benefit from compression. */
const MIN_BYTES = 1024;

const brotli = promisify(brotliCompress);
const gz = promisify(gzip);

async function* files(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else if (TEXT.test(entry.name)) yield full;
  }
}

let count = 0;
let before = 0;
let after = 0;
const queue: Promise<void>[] = [];

for await (const file of files(ROOT)) {
  if ((await stat(file)).size < MIN_BYTES) continue;
  queue.push(
    (async () => {
      const source = await readFile(file);
      const [br, gzipped] = await Promise.all([
        brotli(source, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } }),
        gz(source, { level: 9 }),
      ]);
      await Promise.all([writeFile(`${file}.br`, br), writeFile(`${file}.gz`, gzipped)]);
      count++;
      before += source.length;
      after += br.length;
    })(),
  );
}
await Promise.all(queue);

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
console.log(`Compressed: ${count} files, ${mb(before)} → ${mb(after)} (Brotli)`);
