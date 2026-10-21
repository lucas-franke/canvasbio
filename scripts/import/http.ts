import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** Wikimedia asks API clients to identify themselves (https://meta.wikimedia.org/wiki/User-Agent_policy). */
const USER_AGENT = `CanvasBio-DemoImporter/0.1 (${process.env.WIKIMEDIA_CONTACT ?? "demo content import"}) node/${process.versions.node}`;

const CACHE_DIR = path.resolve(".cache/import");

/**
 * Separate request budgets: the APIs tolerate a quick pace, the image servers
 * (upload.wikimedia.org) rate-limit scripted downloads much earlier.
 */
const lanes = {
  api: { interval: 120, last: 0 },
  media: { interval: 1500, last: 0 },
};
type Lane = keyof typeof lanes;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttle(lane: Lane) {
  const state = lanes[lane];
  const wait = state.last + state.interval - Date.now();
  if (wait > 0) await sleep(wait);
  state.last = Date.now();
}

/** Longest single wait before giving up on a request (the caller decides how to handle that). */
const MAX_RETRY_WAIT_S = 60;

async function request(url: string, accept: string, lane: Lane): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    await throttle(lane);
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: accept },
      signal: AbortSignal.timeout(30_000),
    });
    if (res.ok) return res;
    const retryable = res.status === 429 || res.status >= 500;
    const retryAfter = Number(res.headers.get("retry-after")) || 5 * 2 ** attempt;
    if (!retryable || attempt >= 4 || retryAfter > MAX_RETRY_WAIT_S) {
      throw new Error(`HTTP ${res.status} for ${url.slice(0, 160)}`);
    }
    console.warn(`  HTTP ${res.status}, retrying in ${retryAfter}s …`);
    // Slow the whole lane down after a rate limit, not just this request.
    if (res.status === 429) lanes[lane].interval = Math.min(lanes[lane].interval * 2, 10_000);
    await sleep(retryAfter * 1000);
  }
}

/** GET JSON with an on-disk cache, so re-running the import doesn't hit the APIs again. */
export async function fetchJson<T>(url: string): Promise<T> {
  const key = createHash("sha1").update(url).digest("hex");
  const file = path.join(CACHE_DIR, `${key}.json`);
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    // not cached yet
  }
  const res = await request(url, "application/json, application/sparql-results+json", "api");
  const data = (await res.json()) as T;
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(data));
  return data;
}

export async function fetchBinary(url: string): Promise<Buffer> {
  const res = await request(url, "image/*", "media");
  return Buffer.from(await res.arrayBuffer());
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
