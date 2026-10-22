import { cn } from "cn";
import { ListTree } from "lucide-react";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

import { JumpSheet } from "~/components/people/jump-sheet";
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
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= 200) found = id;
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
 * Chapter rail beside the content on wide screens (container ≥ 72rem): every chapter of the
 * current order, the current one marked while scrolling.
 */
function ChapterRail({ chapters, sort }: ChapterNavProps) {
  const m = useMessages();
  const name = chaptersName(sort, m);
  const current = useCurrentChapter(chapters.map((c) => c.id));
  const letters = chapters[0]?.kind === "letter";
  return (
    <nav
      aria-label={name}
      className="sticky top-28 hidden max-h-[calc(100dvh-9rem)] self-start justify-self-end overflow-y-auto @6xl:block"
    >
      <p className="px-3 pb-2 font-sans text-body-xs font-semibold tracking-normal text-muted-text">{name}</p>
      <ul className={cn("border-l border-line", letters ? "grid grid-cols-2" : "flex flex-col")}>
        {chapters.map((chapter) => (
          <li key={chapter.id}>
            <a
              href={`#${chapter.id}`}
              onClick={(event) => jumpTo(event, chapter.id)}
              aria-current={chapter.id === current ? "true" : undefined}
              className="-ml-px block border-l-2 border-transparent px-3 py-1 text-body-sm whitespace-nowrap text-muted-text tabular-nums hover:text-emphasis aria-[current=true]:border-brand aria-[current=true]:font-semibold aria-[current=true]:text-brand"
            >
              {chapterText(chapter, m).label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Button that opens the chapters as a sheet (below the rail's width). */
export function ChapterSheet({
  chapters,
  sort,
  className,
  compact = false,
}: ChapterNavProps & { className?: string; compact?: boolean }) {
  const m = useMessages();
  const name = chaptersName(sort, m);
  if (chapters.length < 2) return null;
  return (
    <JumpSheet
      trigger={
        <>
          <ListTree aria-hidden="true" />
          <span className={cn(compact && "sr-only @2xl:not-sr-only")}>{name}</span>
        </>
      }
      triggerClassName={cn(
        "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-control/55 px-3.5 text-body-sm font-medium text-emphasis hover:border-control hover:bg-emphasis/5 lg:h-10 @6xl:hidden [&_svg]:size-5",
        compact && "w-11 px-0 @2xl:w-auto @2xl:px-3.5",
        className,
      )}
      title={`${m.chapters.title}: ${name}`}
      description={name}
    >
      {(onJump) => (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] gap-1">
          {chapters.map((chapter) => (
            <li key={chapter.id}>
              <a
                href={`#${chapter.id}`}
                onClick={(event) => onJump(event, chapter.id)}
                className="grid h-11 place-items-center rounded-md px-1 text-label font-medium whitespace-nowrap text-emphasis tabular-nums hover:bg-emphasis/5"
              >
                {chapterText(chapter, m).label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </JumpSheet>
  );
}

/**
 * Page layout of list and timeline: the content column, and on wide screens the chapter
 * rail to its left.
 */
export function ChapterLayout({ chapters, sort, children }: ChapterNavProps & { children: ReactNode }) {
  return (
    <div className="@6xl:grid @6xl:grid-cols-[1fr_minmax(0,57rem)_1fr] @6xl:gap-8">
      {chapters.length > 1 && <ChapterRail chapters={chapters} sort={sort} />}
      <div className="mx-auto flex w-full max-w-[57rem] flex-col gap-10 @6xl:col-start-2 @6xl:row-start-1">
        {children}
      </div>
    </div>
  );
}
