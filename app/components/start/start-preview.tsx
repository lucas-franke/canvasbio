import { ChartGantt, LayoutDashboard, List, MapIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";

import { CanvasBackdrop } from "~/components/canvas/canvas-backdrop";
import { Portrait } from "~/components/portrait";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { withBase } from "~/lib/base-path";
import { seededShuffle } from "~/lib/canvas/layout";
import type { PersonListItem, PlaceCoords } from "~/lib/content/adapter";
import { rowFor, scaleOfRows, scalePercent } from "~/lib/content/chronology";
import { lifeYears } from "~/lib/content/format";
import { useLocale, useMessages } from "~/lib/i18n";
import { listPath, mapPath, pagePath, timelinePath } from "~/lib/i18n/locale";

export type StartView = "canvas" | "list" | "timeline" | "map";

export const START_VIEWS: readonly StartView[] = ["canvas", "list", "timeline", "map"];

export function viewHref(locale: string, view: StartView): string {
  if (view === "list") return listPath(locale);
  if (view === "timeline") return timelinePath(locale);
  if (view === "map") return mapPath(locale);
  return pagePath(locale, "people");
}

const ICONS: Record<StartView, ReactNode> = {
  canvas: <LayoutDashboard aria-hidden="true" />,
  list: <List aria-hidden="true" />,
  timeline: <ChartGantt aria-hidden="true" />,
  map: <MapIcon aria-hidden="true" />,
};

/** People shown in the small previews: a fixed mix (same on every visit), never by prominence. */
const SAMPLE_SEED = "start-preview";

interface StartPreviewProps {
  people: PersonListItem[];
  placeCoords: PlaceCoords;
  view: StartView;
  onViewChange: (view: StartView) => void;
}

/**
 * A look into the four views (tabs). The previews are pictures only: a click on one opens
 * the view, and the start page's main button names and opens the chosen view (keyboard and
 * screen readers use that button; each panel has a line of text saying what the view is).
 */
export function StartPreview({ people, placeCoords, view, onViewChange }: StartPreviewProps) {
  const m = useMessages();
  const locale = useLocale();
  const navigate = useNavigate();
  const places = useMemo(
    () =>
      new Set(people.flatMap((p) => (p.born.place && placeCoords[p.born.place] ? [p.born.place] : []))).size,
    [people, placeCoords],
  );
  const text: Record<StartView, string> = {
    canvas: m.start.previewText.canvas(people.length),
    list: m.start.previewText.list,
    timeline: m.start.previewText.timeline,
    map: m.start.previewText.map(places),
  };

  return (
    <Tabs value={view} onValueChange={(value) => onViewChange(value as StartView)} className="gap-3">
      <TabsList aria-label={m.start.previews} className="bg-surface">
        {/* Phones: labels only, so all four tabs fit. */}
        {START_VIEWS.map((v) => (
          <TabsTrigger
            key={v}
            value={v}
            className="inline-flex items-center gap-2 [&_svg]:hidden [&_svg]:size-4 sm:[&_svg]:block"
          >
            {ICONS[v]}
            {m.view[v]}
          </TabsTrigger>
        ))}
      </TabsList>
      {START_VIEWS.map((v) => (
        <TabsContent key={v} value={v} className="flex flex-col gap-3">
          {/* A picture of the view; the click is a shortcut for pointers (the main button
              is the control for everyone). */}
          <div
            aria-hidden="true"
            onClick={() => navigate(viewHref(locale, v))}
            className="relative h-[clamp(13rem,32svh,22rem)] cursor-pointer overflow-hidden rounded-card bg-surface shadow-[0_12px_40px_rgb(0_0_0/0.12)] ring-1 ring-line/70 lg:h-[min(36rem,calc(100dvh-16rem))]"
          >
            {v === "canvas" && (
              <CanvasBackdrop people={people} hrefFor={(slug) => pagePath(locale, "people", slug)} />
            )}
            {v === "list" && <ListPreview people={people} />}
            {v === "timeline" && <TimelinePreview people={people} />}
            {v === "map" && <MapPreview people={people} placeCoords={placeCoords} />}
          </div>
          <p className="text-body-sm text-muted-text">{text[v]}</p>
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** The list: a few rows (portrait, name, first line of the description), A to Z. */
function ListPreview({ people }: { people: PersonListItem[] }) {
  const locale = useLocale();
  const rows = useMemo(
    () =>
      seededShuffle(people, SAMPLE_SEED)
        .slice(0, 7)
        .sort((a, b) => a.name.sort.localeCompare(b.name.sort, locale)),
    [people, locale],
  );
  return (
    <ul className="flex h-full flex-col gap-1 [mask-image:linear-gradient(to_bottom,black_70%,transparent)] p-3 sm:p-4">
      {rows.map((person) => (
        <li key={person.slug} className="flex items-center gap-3 rounded-xl p-1.5">
          <span className="size-14 shrink-0 overflow-hidden rounded-md">
            <Portrait
              slug={person.slug}
              image={person.image}
              alt=""
              sizes="56px"
              className="size-full object-cover"
            />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-heading text-body text-emphasis">{person.name.display}</span>
            <span className="truncate text-body-sm text-muted-text">
              {person.summary[0] ?? lifeYears(person.born, person.died)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The timeline: a few life spans on the shared scale, oldest first. */
function TimelinePreview({ people }: { people: PersonListItem[] }) {
  const scale = useMemo(() => scaleOfRows(people.map(rowFor)), [people]);
  const rows = useMemo(
    () =>
      seededShuffle(people, SAMPLE_SEED)
        .map(rowFor)
        .filter((row) => Number.isFinite(row.from) && row.to !== undefined)
        .slice(0, 20)
        .sort((a, b) => a.from - b.from),
    [people],
  );
  if (!scale) return null;
  const left = (year: number) => `${scalePercent(scale, year)}%`;
  return (
    <div className="flex h-full flex-col gap-3 p-4 sm:p-5">
      <div className="grid grid-cols-[7rem_1fr] gap-x-3 sm:grid-cols-[9rem_1fr]">
        <span />
        <div className="relative mr-4 h-5">
          {scale.ticks.map((tick) => (
            <span
              key={tick}
              className="absolute top-0 -translate-x-1/2 text-body-xs font-medium text-emphasis tabular-nums"
              style={{ left: left(tick) }}
            >
              {tick}
            </span>
          ))}
        </div>
      </div>
      <ul className="relative flex flex-col gap-2.5 [mask-image:linear-gradient(to_bottom,black_75%,transparent)]">
        {rows.map((row) => (
          <li
            key={row.person.slug}
            className="grid grid-cols-[7rem_1fr] items-center gap-x-3 sm:grid-cols-[9rem_1fr]"
          >
            <span className="truncate text-body-sm text-emphasis">{row.person.name.display}</span>
            <span className="relative mr-4 h-2.5">
              {scale.ticks.map((tick) => (
                <span
                  key={tick}
                  className="absolute -inset-y-1.5 w-px bg-line"
                  style={{ left: left(tick) }}
                />
              ))}
              <span
                className="absolute inset-y-0 rounded-full bg-brand"
                style={{
                  left: left(row.from),
                  width: `${scalePercent(scale, row.to!) - scalePercent(scale, row.from)}%`,
                }}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The view of the world used by the map preview (degrees): no Antarctica, little Arctic. */
const WORLD = { west: -170, east: 190, north: 80, south: -56 };

type Ring = [number, number][];

/**
 * The map: places of birth as dots (larger where more people were born) on the land outline,
 * drawn into a canvas. The outline is the map's own basemap file, loaded only when this
 * preview is shown (the map view then has it cached).
 */
function MapPreview({ people, placeCoords }: { people: PersonListItem[]; placeCoords: PlaceCoords }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [land, setLand] = useState<Ring[] | null>(null);
  const dots = useMemo(() => {
    const counts = new Map<string, number>();
    for (const person of people) {
      const place = person.born.place;
      if (place && placeCoords[place]) counts.set(place, (counts.get(place) ?? 0) + 1);
    }
    return [...counts].map(([place, count]) => ({ coords: placeCoords[place]!, count }));
  }, [people, placeCoords]);

  useEffect(() => {
    let cancelled = false;
    fetch(withBase("/map/land.json"))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: { features: { geometry: { type: string; coordinates: unknown } }[] }) => {
        const rings = data.features.flatMap(({ geometry }) =>
          geometry.type === "Polygon"
            ? (geometry.coordinates as Ring[])
            : geometry.type === "MultiPolygon"
              ? (geometry.coordinates as Ring[][]).flat()
              : [],
        );
        if (!cancelled) setLand(rings);
      })
      // Without the outline the dots still show where people were born.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const token = (name: string) =>
        getComputedStyle(document.documentElement).getPropertyValue(`--c-${name}`).trim();
      // Fit the world into the box (contain), centred.
      const s = Math.min(width / (WORLD.east - WORLD.west), height / (WORLD.north - WORLD.south));
      const ox = (width - (WORLD.east - WORLD.west) * s) / 2;
      const oy = (height - (WORLD.north - WORLD.south) * s) / 2;
      const x = (lng: number) => ox + ((lng < WORLD.west ? lng + 360 : lng) - WORLD.west) * s;
      const y = (lat: number) => oy + (WORLD.north - lat) * s;

      // Only the world box (Antarctica and the far north stay outside).
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, oy, (WORLD.east - WORLD.west) * s, (WORLD.north - WORLD.south) * s);
      ctx.clip();
      if (land) {
        ctx.fillStyle = token("emphasis");
        ctx.globalAlpha = 0.08;
        ctx.beginPath();
        for (const ring of land) {
          // Rings crossing the edge of the view: drawn where they start (good enough at this size).
          const shift = ring[0]![0] < WORLD.west ? 360 : 0;
          ring.forEach(([lng, lat], i) => {
            const px = ox + (lng + shift - WORLD.west) * s;
            if (i === 0) ctx.moveTo(px, y(lat));
            else ctx.lineTo(px, y(lat));
          });
          ctx.closePath();
        }
        ctx.fill();
      }
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = token("accent");
      ctx.strokeStyle = token("surface");
      ctx.lineWidth = 1;
      for (const { coords, count } of dots) {
        ctx.beginPath();
        ctx.arc(x(coords[0]), y(coords[1]), 1.8 + Math.sqrt(count) * 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    };
    draw();
    const resize = new ResizeObserver(draw);
    resize.observe(canvas);
    const theme = new MutationObserver(draw);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", draw);
    return () => {
      resize.disconnect();
      theme.disconnect();
      scheme.removeEventListener("change", draw);
    };
  }, [land, dots]);

  return <canvas ref={canvasRef} className="absolute inset-0 size-full" />;
}
