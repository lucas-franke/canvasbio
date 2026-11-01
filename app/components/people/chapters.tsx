import { cn } from "cn";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";

import type { Chapter, SortKey } from "~/lib/content/sort";
import { useMessages, type Messages } from "~/lib/i18n";

/** Short label (navigation) and heading (section) of a chapter. */
export function chapterText(chapter: Chapter<unknown>, m: Messages): { label: string; heading: string } {
  const { kind, value } = chapter;
  if (kind === "letter") {
    const letter = value === "#" ? m.chapters.other : String(value);
    return { label: letter, heading: letter };
  }
  if (kind === "unknown") {
    return { label: m.chapters.unknownShort, heading: m.chapters.unknown[value as "born" | "died" | "age"] };
  }
  const year = Number(value);
  if (kind === "died") return { label: m.chapters.decade(year), heading: m.chapters.diedHeading(year) };
  if (kind === "age") return { label: m.chapters.age10(year), heading: m.chapters.ageHeading(year) };
  return { label: m.chapters.decade(year), heading: m.chapters.decade(year) };
}

/** Name of the chapter navigation for an order: "Alphabet", "Jahrzehnte", … */
export function chaptersName(sort: SortKey, m: Messages): string {
  if (sort === "name" || sort === "name-desc") return m.chapters.letter;
  if (sort === "died") return m.chapters.died;
  if (sort === "age") return m.chapters.age;
  return m.chapters.born;
}

/** Scrolls to a chapter heading and moves focus there; the URL hash marks the position. */
function jumpTo(event: MouseEvent<HTMLAnchorElement>, anchor: string) {
  const target = document.getElementById(anchor);
  if (!target) return;
  event.preventDefault();
  // Smooth only for short distances: across many screens it would take seconds.
  const near = Math.abs(target.getBoundingClientRect().top) < window.innerHeight * 2;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.history.replaceState(window.history.state, "", `#${anchor}`);
  target.scrollIntoView({ behavior: near && !reduce ? "smooth" : "auto" });
  target.focus({ preventScroll: true });
}

/** Where a jump puts a heading: the page's scroll padding plus the heading's scroll margin. */
function landingTop(heading: HTMLElement): number {
  const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  return padding + (parseFloat(getComputedStyle(heading).scrollMarginTop) || 0);
}

/** The chapter whose heading has most recently scrolled past the top (sticky bars included). */
function useCurrentChapter(ids: string[]): string | null {
  const [current, setCurrent] = useState<string | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    const list = key ? key.split(",") : [];
    let frame = 0;
    const update = () => {
      frame = 0;
      let found: string | null = list[0] ?? null;
      for (const id of list) {
        const heading = document.getElementById(id);
        // A few pixels of slack for rounding; a heading that was jumped to counts as reached.
        if (heading && heading.getBoundingClientRect().top <= landingTop(heading) + 8) found = id;
      }
      // At the end of the page the last chapters can't reach the top: the last one is current.
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atEnd && list.length > 0) found = list.at(-1)!;
      setCurrent(found);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [key]);
  return current;
}

interface ChapterNavProps {
  chapters: Chapter<unknown>[];
  sort: SortKey;
}

/**
 * What the index shows for a chapter: "A", "#", "1850", "80", "100+", "?" (screen readers
 * get the full label, see IndexLabel).
 */
export function chapterShort(chapter: Chapter<unknown>): string {
  const { kind, value } = chapter;
  if (kind === "unknown") return "?";
  if (kind === "age" && Number(value) >= 100) return "100+";
  return String(value);
}

/**
 * The short label for the eye, the full one for screen readers ("1850" → "1850er"). As text,
 * not aria-label, so the name contains what is visible (WCAG 2.5.3) and reads as one word.
 */
function IndexLabel({ chapter, full }: { chapter: Chapter<unknown>; full: string }) {
  const short = chapterShort(chapter);
  if (short === full) return <>{short}</>;
  return (
    <>
      <span aria-hidden="true">{short}</span>
      <span className="sr-only">{full}</span>
    </>
  );
}

/** Height of an index link and of a dot (px). */
const ENTRY = 24;
const DOT = 12;

/**
 * Which entries of the index get a link, given the height of its track: all if they fit,
 * else as many as fit next to dots for the others, spread evenly (first and last always).
 * Until measured (pre-rendered HTML) all.
 */
function useShownEntries(track: RefObject<HTMLElement | null>, count: number): Set<number> {
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.clientHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [track]);
  return useMemo(() => {
    const all = new Set(Array.from({ length: count }, (_, i) => i));
    // 8 px: the list's own padding.
    const room = height === null ? Infinity : height - 8;
    if (count * ENTRY <= room) return all;
    // links·ENTRY + (count − links)·DOT ≤ room
    const links = Math.max(2, Math.floor((room - count * DOT) / (ENTRY - DOT)));
    if (links >= count) return all;
    return new Set(Array.from({ length: links }, (_, j) => Math.round((j * (count - 1)) / (links - 1))));
  }, [height, count]);
}

/** Movement (px) after which pressing the index becomes scrubbing instead of a tap. */
const SCRUB_THRESHOLD = 6;

/**
 * Index along the right edge, as in a phone's contacts app: every chapter of the current
 * order, the current one marked while scrolling. Tapping a chapter jumps there; sliding a
 * finger (or the mouse) along the index scrolls with it, with the chapter shown large beside it.
 * Each entry is a link (keyboard, screen readers) of at least 24 × 24 px (WCAG 2.5.8). When
 * the screen is too short for all of them, some become small dots in between (as in iOS
 * contacts) instead of the index scrolling, which a finger couldn't reach.
 */
function ChapterIndex({ chapters, sort }: ChapterNavProps) {
  const m = useMessages();
  const current = useCurrentChapter(chapters.map((c) => c.id));
  const scrub = useRef<{ startY: number; moved: boolean; id: string | null } | null>(null);
  const suppressClick = useRef(false);
  const [bubble, setBubble] = useState<{ label: string; top: number } | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const shown = useShownEntries(track, chapters.length);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    scrub.current = { startY: event.clientY, moved: false, id: null };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const state = scrub.current;
    if (!state) return;
    if (!state.moved && Math.abs(event.clientY - state.startY) < SCRUB_THRESHOLD) return;
    if (!state.moved) {
      state.moved = true;
      // Keep scrubbing when the finger drifts off the narrow index.
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const box = event.currentTarget.getBoundingClientRect();
    const entry = document
      .elementFromPoint(box.left + box.width / 2, event.clientY)
      ?.closest<HTMLAnchorElement>("[data-chapter]");
    if (entry && entry.dataset.chapter !== state.id) {
      state.id = entry.dataset.chapter!;
      document.getElementById(state.id)?.scrollIntoView({ behavior: "auto" });
    }
    if (state.id) {
      const chapter = chapters.find((c) => c.id === state.id);
      if (chapter) setBubble({ label: chapterShort(chapter), top: event.clientY - box.top });
    }
  };

  const endScrub = () => {
    const state = scrub.current;
    scrub.current = null;
    setBubble(null);
    if (!state?.moved) return;
    // The click that follows the release is not a tap on an entry.
    suppressClick.current = true;
    if (!state.id) return;
    window.history.replaceState(window.history.state, "", `#${state.id}`);
    document.getElementById(state.id)?.focus({ preventScroll: true });
  };

  return (
    <nav
      aria-label={chaptersName(sort, m)}
      data-floating=""
      // A track as high as the content; the index sticks in it (below the navigation).
      className="pointer-events-none absolute inset-y-0 -right-3 z-30 sm:-right-6 lg:-right-4 print:hidden"
    >
      {/* Sticks exactly where the content starts (below the page header and the main
          padding), so it never shifts once the page scrolls. */}
      <div
        ref={track}
        className="sticky top-20 flex h-[calc(100dvh-6rem)] max-h-full flex-col justify-center sm:top-28 sm:h-[calc(100dvh-8rem)]"
      >
        <ul
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
          onClickCapture={(event) => {
            if (!suppressClick.current) return;
            suppressClick.current = false;
            event.preventDefault();
            event.stopPropagation();
          }}
          className="pointer-events-auto flex max-h-full touch-none flex-col items-center overflow-hidden rounded-full bg-surface/80 px-0.5 py-1 shadow-sm ring-1 ring-line/60 backdrop-blur-sm select-none"
        >
          {chapters.map((chapter, i) =>
            shown.has(i) ? (
              <li key={chapter.id}>
                <a
                  href={`#${chapter.id}`}
                  data-chapter={chapter.id}
                  onClick={(event) => jumpTo(event, chapter.id)}
                  aria-current={chapter.id === current ? "true" : undefined}
                  draggable={false}
                  className="flex min-h-6 min-w-6 items-center justify-center rounded-full px-1 text-body-xs font-semibold text-muted-text tabular-nums hover:text-emphasis aria-[current=true]:bg-brand aria-[current=true]:text-brand-foreground"
                >
                  <IndexLabel chapter={chapter} full={chapterText(chapter, m).label} />
                </a>
              </li>
            ) : (
              // A dot stands for a chapter without room of its own; scrubbing still reaches it.
              <li key={chapter.id} aria-hidden="true">
                <span
                  data-chapter={chapter.id}
                  data-current={chapter.id === current ? "" : undefined}
                  className="grid h-3 w-6 place-items-center before:size-1 before:rounded-full before:bg-muted-text before:content-[''] data-current:before:size-1.5 data-current:before:bg-brand"
                />
              </li>
            ),
          )}
        </ul>
        {bubble && (
          <span
            aria-hidden="true"
            className="absolute right-full mr-3 grid min-w-14 -translate-y-1/2 place-items-center rounded-full bg-brand px-3 py-3 font-heading text-h3 text-brand-foreground tabular-nums shadow-lg"
            style={{ top: bubble.top }}
          >
            {bubble.label}
          </span>
        )}
      </div>
    </nav>
  );
}

/**
 * Page layout of list and timeline: the content column, and the chapter index at the right
 * edge (the column keeps clear of it while it is narrow).
 */
export function ChapterLayout({ chapters, sort, children }: ChapterNavProps & { children: ReactNode }) {
  const indexed = chapters.length > 1;
  // Years ("1850", "100+") make a wider index than letters.
  const wide = indexed && chapters.some((c) => c.kind !== "letter");
  return (
    <div className="relative">
      {indexed && <ChapterIndex chapters={chapters} sort={sort} />}
      <div
        className={cn(
          "mx-auto flex w-full max-w-[57rem] flex-col gap-10",
          indexed && (wide ? "pr-11 sm:pr-9" : "pr-7 sm:pr-6"),
          indexed && "@6xl:pr-0",
        )}
      >
        {children}
      </div>
    </div>
  );
}
