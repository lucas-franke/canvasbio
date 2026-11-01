import { cn } from "cn";
import { memo, useCallback, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router";

import { chapterText } from "~/components/people/chapters";
import { Portrait } from "~/components/portrait";
import { tornEdgeClass } from "~/lib/canvas/torn-edge";
import { siteConfig } from "~/lib/config";
import type { PersonListItem } from "~/lib/content/adapter";
import {
  rowFor,
  scalePercent,
  scaleOfRows,
  type ChronologyRow,
  type TimeScale,
} from "~/lib/content/chronology";
import type { Chapter } from "~/lib/content/sort";
import { lifeYears } from "~/lib/content/format";
import { useLocale, useMessages } from "~/lib/i18n";
import { localize } from "~/lib/i18n/localize";
import { markPortraitSource } from "~/lib/view-transition";

/**
 * Row columns, shared by axis and rows so the years line up. Narrow: portrait, then name
 * with the bar below. Wide: portrait, name, bar side by side (like a Gantt chart), so the
 * grid lines run beside the names instead of through them.
 */
const ROW_GRID =
  "grid grid-cols-[3rem_1fr] gap-x-3 @lg:grid-cols-[4rem_1fr] @lg:gap-x-4 @2xl:grid-cols-[4rem_14rem_1fr]";
/**
 * The time scale's box inside a row (row padding + columns before the bar on the left; row
 * padding + room for half a year label on the right), for layers laid over the rows.
 */
const TRACK_BOX = "absolute inset-y-0 left-[4.25rem] right-[1.75rem] @lg:left-[5.5rem] @2xl:left-[20.5rem]";
/** Inside rows and the axis: leaves room on the right so the last year label fits. */
const TRACK_END = "mr-5";

/** Assumed life span when the year of death is unknown (the bar fades out). */
const OPEN_SPAN = 70;

const spanOf = (row: ChronologyRow<unknown>): [number, number] => [row.from, row.to ?? row.from + OPEN_SPAN];

interface TimelineViewProps {
  /** People in the chosen order, divided into chapters (decades of birth or death, life spans). */
  chapters: Chapter<PersonListItem>[];
  hrefFor: (slug: string) => string;
  activeSlug?: string;
}

/**
 * "Zeitstrahl": people in chapters (by default by decade of birth), each with a bar for their
 * life span on a shared scale. Grid lines run from the year axis through the list, so bars that
 * overlap show who lived at the same time. Pointing at a person (or opening one) highlights
 * their life span across the whole list. Key dates of the subject (site.config.ts,
 * `timeline.events`) are marked on the axis and in the list.
 *
 * The bars are decoration: the years are in the text, the list order carries the
 * chronology, and the key dates are listed as text above the axis.
 */
export function TimelineView({ chapters, hrefFor, activeSlug }: TimelineViewProps) {
  const m = useMessages();
  const locale = useLocale();
  const groups = useMemo(
    () => chapters.map((chapter) => ({ chapter, rows: chapter.items.map(rowFor) })),
    [chapters],
  );
  const scale = useMemo(() => scaleOfRows(groups.flatMap((g) => g.rows)), [groups]);
  const events = useMemo(
    () =>
      scale ? siteConfig.timeline.events.filter((e) => e.year >= scale.start && e.year <= scale.end) : [],
    [scale],
  );

  // Highlighted life span: the person pointed at or focused, else the open biography.
  const [pointed, setPointed] = useState<string | null>(null);
  const highlightSlug = pointed ?? activeSlug;
  const highlight = useMemo(() => {
    for (const group of groups) {
      const row = group.rows.find((r) => r.person.slug === highlightSlug);
      if (row && Number.isFinite(row.from)) return spanOf(row);
    }
    return null;
  }, [groups, highlightSlug]);
  const onPoint = useCallback((slug: string | null) => setPointed(slug), []);

  return (
    <>
      {scale && (
        <div className="flex flex-col gap-4 px-2 text-body-sm text-text">
          <p>
            {m.timeline.legend} <span className="pointer-coarse:hidden">{m.timeline.legendInteractive}</span>
          </p>
          {events.length > 0 && (
            <section aria-labelledby="timeline-events" className="flex flex-col gap-2">
              <h2
                id="timeline-events"
                className="font-sans text-body-sm font-semibold tracking-normal text-emphasis"
              >
                {m.timeline.events}
              </h2>
              <ul className="grid gap-x-6 gap-y-1 @xl:grid-cols-2">
                {events.map((event) => (
                  <li key={event.year} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-2 shrink-0 rotate-45 bg-brand" />
                    <span>
                      <span className="font-semibold text-emphasis tabular-nums">{event.year}</span>{" "}
                      {localize(event.label, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <div className="relative flex flex-col gap-10">
        {scale && <Axis scale={scale} events={events.map((e) => e.year)} highlight={highlight} />}
        {/* The highlighted life span as a band across all decades. */}
        {scale && highlight && (
          <div aria-hidden="true" className={cn(TRACK_BOX, "pointer-events-none")}>
            <div
              className="absolute inset-y-0 bg-brand/8 transition-[left,width] duration-200 motion-reduce:transition-none"
              style={band(scale, highlight)}
            />
          </div>
        )}
        {groups.map(({ chapter, rows }) => {
          const id = chapter.id;
          const dated = rows.some((row) => Number.isFinite(row.from));
          return (
            <section key={id} aria-labelledby={id}>
              <h2
                id={id}
                tabIndex={-1}
                className="scroll-mt-16 border-b border-brand px-2 pb-2 text-h2 text-brand focus-target"
              >
                {chapterText(chapter, m).heading}
              </h2>
              <ul className="relative mt-3 flex flex-col gap-1">
                {scale && dated && <GridLines scale={scale} events={events.map((e) => e.year)} />}
                {rows.map((row) => (
                  <li key={row.person.slug} className="relative">
                    <TimelineRow
                      row={row}
                      scale={scale}
                      href={hrefFor(row.person.slug)}
                      active={row.person.slug === activeSlug}
                      dimmed={Boolean(highlight) && !overlaps(row, highlight!)}
                      onPoint={onPoint}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}

function overlaps(row: ChronologyRow<unknown>, [from, to]: [number, number]) {
  if (!Number.isFinite(row.from)) return false;
  const [a, b] = spanOf(row);
  return a <= to && b >= from;
}

function band(scale: TimeScale, [from, to]: [number, number]): CSSProperties {
  const left = scalePercent(scale, Math.max(from, scale.start));
  return { left: `${left}%`, width: `${scalePercent(scale, Math.min(to, scale.end)) - left}%` };
}

/** Wide layout: vertical lines for the axis years (and key dates) behind a decade's rows. */
function GridLines({ scale, events }: { scale: TimeScale; events: number[] }) {
  return (
    <div aria-hidden="true" className={cn(TRACK_BOX, "pointer-events-none hidden @2xl:block")}>
      {scale.ticks.map((tick) => (
        <span
          key={tick}
          className="absolute inset-y-0 w-px bg-line"
          style={{ left: `${scalePercent(scale, tick)}%` }}
        />
      ))}
      {events.map((year) => (
        <span
          key={`event-${year}`}
          className="absolute inset-y-0 border-l border-dashed border-brand/60"
          style={{ left: `${scalePercent(scale, year)}%` }}
        />
      ))}
    </div>
  );
}

/** Years along the top, sticky while scrolling; each label is centred on its grid line. */
function Axis({
  scale,
  events,
  highlight,
}: {
  scale: TimeScale;
  events: number[];
  highlight: [number, number] | null;
}) {
  return (
    <div
      className={cn(
        ROW_GRID,
        // Floats like the navigation pills: same light surface, soft shadow, thin ring.
        "sticky top-[4.75rem] z-30 -mb-6 items-center rounded-xl bg-surface/95 px-2 py-2 shadow-[0_2px_12px_rgb(0_0_0/0.12)] ring-1 ring-line/70 backdrop-blur-sm sm:top-22",
      )}
    >
      <span className="@2xl:col-span-2" />
      <div aria-hidden="true" className={cn("relative h-7", TRACK_END)}>
        {highlight && (
          <div
            className="absolute inset-y-0 rounded-md bg-brand/15 transition-[left,width] duration-200 motion-reduce:transition-none"
            style={band(scale, highlight)}
          />
        )}
        {scale.ticks.map((tick) => (
          <span
            key={tick}
            className="absolute top-0 -translate-x-1/2 font-sans text-body-xs font-medium text-emphasis tabular-nums"
            style={{ left: `${scalePercent(scale, tick)}%` }}
          >
            {tick}
          </span>
        ))}
        {/* Key dates: small diamonds on the lower edge, explained in the list above. */}
        {events.map((year) => (
          <span
            key={year}
            className="absolute bottom-0 size-2 -translate-x-1/2 rotate-45 bg-brand"
            style={{ left: `${scalePercent(scale, year)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

const TimelineRow = memo(function TimelineRow({
  row,
  scale,
  href,
  active,
  dimmed,
  onPoint,
}: {
  row: ChronologyRow<PersonListItem>;
  scale: TimeScale | null;
  href: string;
  active: boolean;
  /** Another person is highlighted and this one didn't live at the same time. */
  dimmed: boolean;
  onPoint: (slug: string | null) => void;
}) {
  const { person } = row;
  const dated = scale && Number.isFinite(row.from);
  const bar = dated ? band(scale, spanOf(row)) : undefined;

  return (
    // The listeners only highlight the life span (visual); the link inside is the control.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <article
      data-vt-item
      onPointerEnter={(event) => event.pointerType === "mouse" && onPoint(person.slug)}
      onPointerLeave={(event) => event.pointerType === "mouse" && onPoint(null)}
      onFocus={() => onPoint(person.slug)}
      onBlur={() => onPoint(null)}
      className={cn(
        ROW_GRID,
        "group relative items-center rounded-2xl p-2 transition-colors focus-within:bg-emphasis/5 hover:bg-emphasis/5",
        active && "bg-brand/10 hover:bg-brand/10",
      )}
    >
      <div
        data-vt-portrait
        data-tint
        className={cn(
          "size-12 overflow-hidden @lg:size-16",
          siteConfig.theme.tileEdge === "torn" && tornEdgeClass(person.slug),
        )}
      >
        <Portrait
          slug={person.slug}
          image={person.image}
          alt=""
          sizes="(min-width: 640px) 64px, 48px"
          className="size-full object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2 @2xl:contents">
        <div className="flex flex-wrap items-baseline gap-x-3 @2xl:flex-col @2xl:gap-0">
          <h3 className="font-heading text-body text-emphasis @lg:text-h3">
            <Link
              to={href}
              preventScrollReset
              viewTransition
              onClick={markPortraitSource}
              data-person={person.slug}
              aria-current={active ? "page" : undefined}
              className={
                // Same pattern as the list rows: the whole row is the link's target, with its focus ring.
                "inline-block min-h-6 after:absolute after:inset-0 after:rounded-2xl after:content-[''] " +
                "focus-visible:shadow-none focus-visible:outline-none focus-visible:after:shadow-[0_0_0_6px_var(--c-focus-halo)] focus-visible:after:outline-3 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus"
              }
            >
              {person.name.display}
            </Link>
          </h3>
          <span className="text-body-sm text-muted-text tabular-nums">
            {lifeYears(person.born, person.died)}
          </span>
        </div>
        {bar && scale && (
          <div aria-hidden="true" className={cn("relative h-2.5", TRACK_END)}>
            {/* Narrow layout: short grid marks around the bar (full lines would cross the names). */}
            {scale.ticks.map((tick) => (
              <span
                key={tick}
                className="absolute -inset-y-1.5 w-px bg-line @2xl:hidden"
                style={{ left: `${scalePercent(scale, tick)}%` }}
              />
            ))}
            <span
              className={cn(
                "absolute inset-y-0 rounded-full bg-brand transition-opacity duration-200",
                row.to === undefined && "bg-linear-to-r from-brand to-transparent",
                dimmed && "opacity-25",
              )}
              style={bar}
            />
          </div>
        )}
      </div>
    </article>
  );
});
