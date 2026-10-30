import { portraitUrl, SQUARE_WIDTHS } from "~/lib/content/images";

/**
 * Portraits for the canvas wall, ready to draw: each image is loaded once per file width
 * and composed into a small canvas of its own (crop, tint, torn edge baked in), so drawing a
 * frame is one `drawImage` per tile. Loading is prioritised (nearest to the view centre
 * first), limited to a few downloads at a time, and the composed images are kept within a
 * memory budget (the least recently drawn go first).
 */

export type ComposeTile = (image: HTMLImageElement, width: number, slug: string) => HTMLCanvasElement;

interface Entry {
  canvas: HTMLCanvasElement;
  width: number;
  /** Frame in which the entry was last drawn. */
  used: number;
}

interface Wanted {
  slug: string;
  hash: string;
  width: number;
  priority: number;
}

/** File width for a tile of `devicePx` device pixels (slightly soft is fine: 15 %). */
export const imageWidthFor = (devicePx: number) =>
  SQUARE_WIDTHS.find((w) => w >= devicePx * 0.85) ?? SQUARE_WIDTHS.at(-1)!;

export class TileImages {
  private entries = new Map<string, Entry[]>();
  private wanted = new Map<string, Wanted>();
  private loading = new Set<string>();
  private failed = new Set<string>();
  private pixels = 0;
  private frame = 0;
  private disposed = false;

  constructor(
    private compose: ComposeTile,
    /** Called whenever a new image is ready (the wall redraws). */
    private onReady: () => void,
    private maxLoading = 6,
    /** Composed pixels kept in memory: about 4 bytes each (≈ 100 MB). */
    private budget = 25_000_000,
  ) {}

  /** Starts a frame: the images asked for in the previous one are no longer needed. */
  beginFrame() {
    this.frame++;
    this.wanted.clear();
  }

  /**
   * The image to draw for a person: the wanted width if loaded, else the closest one loaded
   * (sharper first). Also asks for the wanted width if it isn't there yet.
   */
  get(slug: string, hash: string, width: number, priority: number): HTMLCanvasElement | undefined {
    const list = this.entries.get(slug);
    const exact = list?.find((e) => e.width === width);
    if (!exact) this.want(slug, hash, width, priority);
    const byWidth = [...(list ?? [])].sort((a, b) => a.width - b.width);
    const entry = exact ?? byWidth.find((e) => e.width > width) ?? byWidth.at(-1);
    if (entry) entry.used = this.frame;
    return entry?.canvas;
  }

  /** Asks for an image without drawing it (preloading around the view). */
  want(slug: string, hash: string, width: number, priority: number) {
    const key = `${slug}@${width}`;
    if (
      this.loading.has(key) ||
      this.failed.has(key) ||
      this.entries.get(slug)?.some((e) => e.width === width)
    )
      return;
    const current = this.wanted.get(key);
    if (!current || priority < current.priority) this.wanted.set(key, { slug, hash, width, priority });
  }

  /** Ends a frame: starts the most urgent downloads. */
  endFrame() {
    if (this.loading.size >= this.maxLoading || this.wanted.size === 0) return;
    const queue = [...this.wanted].sort(([, a], [, b]) => a.priority - b.priority);
    for (const [key, item] of queue) {
      if (this.loading.size >= this.maxLoading) break;
      // Out of the queue once started: neither a success nor a failure loads it again.
      this.wanted.delete(key);
      void this.load(item);
    }
  }

  /** Whether every image asked for in this frame is loaded (in the wanted width). */
  get settled() {
    return this.wanted.size === 0 && this.loading.size === 0;
  }

  /** Drops all composed images (e.g. the theme changed the tint): they are composed anew. */
  clear() {
    this.entries.clear();
    this.pixels = 0;
  }

  dispose() {
    this.disposed = true;
    this.clear();
  }

  private async load({ slug, hash, width }: Wanted) {
    const key = `${slug}@${width}`;
    this.loading.add(key);
    try {
      const image = new Image();
      image.decoding = "async";
      const loaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("not loadable"));
      });
      image.src = portraitUrl(slug, "sq", width, "webp", hash);
      // decode() decodes off the main thread; some engines reject it for images that load
      // fine, so the load event is the fallback.
      await image.decode().catch(() => loaded);
      if (this.disposed) return;
      const canvas = this.compose(image, width, slug);
      const list = this.entries.get(slug) ?? [];
      list.push({ canvas, width, used: this.frame });
      this.entries.set(slug, list);
      this.pixels += width * width;
      this.evict();
      this.onReady();
    } catch {
      // Not loadable (offline, missing): the tile keeps its colour.
      this.failed.add(key);
    } finally {
      this.loading.delete(key);
      if (!this.disposed) this.endFrame();
    }
  }

  private evict() {
    if (this.pixels <= this.budget) return;
    const all = [...this.entries].flatMap(([slug, list]) => list.map((entry) => ({ slug, entry })));
    // Least recently drawn first; never what the current frame drew.
    all.sort((a, b) => a.entry.used - b.entry.used);
    for (const { slug, entry } of all) {
      if (this.pixels <= this.budget * 0.8) break;
      if (entry.used >= this.frame) break;
      const list = this.entries.get(slug)!.filter((e) => e !== entry);
      if (list.length > 0) this.entries.set(slug, list);
      else this.entries.delete(slug);
      this.pixels -= entry.width * entry.width;
    }
  }
}
