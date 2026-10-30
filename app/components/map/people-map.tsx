import "maplibre-gl/dist/maplibre-gl.css";

import { cn } from "cn";
import { List, X } from "lucide-react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import Supercluster from "supercluster";

import { CanvasControls } from "~/components/canvas/canvas-controls";
import { PersonRow } from "~/components/people/person-row";
import { SearchSummary } from "~/components/search/search-summary";
import type { PersonListItem, PlaceCoords } from "~/lib/content/adapter";
import { lifeYears } from "~/lib/content/format";
import { portraitUrl } from "~/lib/content/images";
import { useLocale, useMessages } from "~/lib/i18n";
import type { FacetLabels, SearchState } from "~/lib/search/search";
import { mapStyle, paintFor, readMapColors } from "./map-style";

maplibregl.setWorkerUrl(workerUrl);

/** Natural Earth 1:50m holds up to about here. */
const MAX_ZOOM = 8;
/** People at the same place stay one marker up to the last zoom level; it then opens a list. */
const CLUSTER_RADIUS = 52;

type Mode = "born" | "died";

interface PointProps {
  slug: string;
  /** Stable pseudo-random rank: picks the cluster's face without favouring the best known. */
  rank: number;
  place: string;
}
interface ClusterProps {
  /** The person whose portrait is the marker. */
  top: string;
  topRank: number;
}

/** FNV-1a hash of the slug, as a stable shuffle key. */
function rankOf(slug: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) hash = Math.imul(hash ^ slug.charCodeAt(i), 0x01000193);
  return hash >>> 0;
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export interface PeopleMapProps {
  people: PersonListItem[];
  hits: PersonListItem[] | null;
  search: SearchState;
  placeCoords: PlaceCoords;
  facetLabels: FacetLabels;
  tagLabels: Record<string, string>;
  tagFacet?: string;
  hrefFor: (slug: string) => string;
  activeSlug?: string;
}

type Panel = { kind: "places" } | { kind: "people"; title: string; slugs: string[] } | null;

/**
 * Map view: portraits at the places of birth (or death), clustered when zoomed out. The
 * basemap is self-hosted Natural Earth data, so nothing is loaded from third parties.
 * The map is an extra way in; the list of places next to it reaches everyone without it.
 */
export default function PeopleMap({
  people,
  hits,
  search,
  placeCoords,
  facetLabels,
  tagLabels,
  tagFacet,
  hrefFor,
  activeSlug,
}: PeopleMapProps) {
  const m = useMessages();
  const locale = useLocale();
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  // No WebGL (old devices, some privacy settings): the list of places is shown instead.
  const [failed] = useState(() => !hasWebGL());
  const [mode, setMode] = useState<Mode>("born");
  const [panel, setPanel] = useState<Panel>(failed ? { kind: "places" } : null);

  const shown = hits ?? people;
  const bySlug = useMemo(() => new Map(people.map((p) => [p.slug, p])), [people]);
  const placeLabels = useMemo(() => facetLabels.place ?? {}, [facetLabels]);

  const points = useMemo(
    () =>
      shown.flatMap((person) => {
        const place = mode === "born" ? person.born.place : person.died?.place;
        const coords = place ? placeCoords[place] : undefined;
        if (!place || !coords) return [];
        return [
          {
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: coords },
            properties: { slug: person.slug, rank: rankOf(person.slug), place } satisfies PointProps,
          },
        ];
      }),
    [shown, mode, placeCoords],
  );
  const unplaced = shown.length - points.length;

  const clusters = useMemo(() => {
    const index = new Supercluster<PointProps, ClusterProps>({
      radius: CLUSTER_RADIUS,
      maxZoom: MAX_ZOOM,
      map: (p) => ({ top: p.slug, topRank: p.rank }),
      reduce: (acc, p) => {
        if (p.topRank < acc.topRank) {
          acc.top = p.top;
          acc.topRank = p.topRank;
        }
      },
    });
    index.load(points);
    return index;
  }, [points]);

  // Places with how many people, for the list next to the map.
  const places = useMemo(() => {
    const counts = new Map<string, string[]>();
    for (const point of points) {
      const list = counts.get(point.properties.place) ?? [];
      list.push(point.properties.slug);
      counts.set(point.properties.place, list);
    }
    return [...counts]
      .map(([key, slugs]) => ({ key, label: placeLabels[key] ?? key, slugs }))
      .sort((a, b) => b.slugs.length - a.slugs.length || a.label.localeCompare(b.label, locale));
  }, [points, placeLabels, locale]);

  // ---- The map itself, created once ----
  useEffect(() => {
    if (!container.current || failed) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: mapStyle(readMapColors()),
      center: [12, 30],
      zoom: 1.2,
      minZoom: 0.5,
      maxZoom: MAX_ZOOM,
      renderWorldCopies: false,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      cooperativeGestures: false,
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.getCanvas().setAttribute("aria-label", m.map.label);
    map.on("load", () => setReady(true));
    map.on("error", (event) => {
      if (!map.loaded()) console.warn("map:", event.error);
    });
    mapRef.current = map;

    // Follow light/dark: the theme is a data attribute on <html> or the system setting.
    const repaint = () => {
      if (!map.isStyleLoaded()) return;
      for (const [layer, property, value] of paintFor(readMapColors())) {
        map.setPaintProperty(layer, property as "fill-color", value);
      }
    };
    const observer = new MutationObserver(repaint);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", repaint);

    return () => {
      observer.disconnect();
      scheme.removeEventListener("change", repaint);
      map.remove();
      mapRef.current = null;
    };
    // The label is only read once; a language switch remounts the overview anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fit the people shown (search results, birth or death places) into view.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || points.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    for (const point of points) bounds.extend(point.geometry.coordinates);
    map.fitBounds(bounds, {
      padding: { top: 112, bottom: 96, left: 48, right: 48 },
      maxZoom: 5,
      duration: 600,
    });
  }, [ready, points]);

  // ---- Markers: portraits as links, clusters as buttons ----
  const markers = useRef(new Map<string, Marker>());
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const current = markers.current;

    const personLabel = (person: PersonListItem) =>
      [person.name.display, lifeYears(person.born, person.died)].filter(Boolean).join(", ");
    const portrait = (person: PersonListItem) => {
      const img = document.createElement("img");
      img.src = portraitUrl(person.slug, "sq", 160, "webp", person.image.hash);
      img.alt = "";
      img.draggable = false;
      img.decoding = "async";
      img.style.backgroundColor = person.image.color;
      img.className = "size-full rounded-full object-cover";
      return img;
    };

    const render = () => {
      const zoom = Math.round(map.getZoom());
      const seen = new Set<string>();
      for (const feature of clusters.getClusters([-180, -85, 180, 85], zoom)) {
        const props = feature.properties as (PointProps | (ClusterProps & Supercluster.ClusterProperties)) & {
          cluster?: boolean;
        };
        const isCluster = "cluster_id" in props;
        const key = isCluster ? `c${props.cluster_id}:${zoom}` : `p${(props as PointProps).slug}`;
        seen.add(key);
        if (current.has(key)) continue;

        const slug = isCluster ? props.top : (props as PointProps).slug;
        const person = bySlug.get(slug);
        if (!person) continue;
        const count = isCluster ? props.point_count : 1;

        const element: HTMLElement = document.createElement(isCluster ? "button" : "a");
        element.className = cn(
          "group block size-11 rounded-full border-2 border-surface bg-surface shadow-[0_2px_8px_rgb(0_0_0/0.25)] transition-transform hover:scale-110 focus-visible:scale-110",
          isCluster && "size-13",
          slug === activeSlug && "border-brand",
        );
        element.append(portrait(person));
        if (isCluster) {
          const badge = document.createElement("span");
          badge.className =
            "absolute -top-1.5 -right-2 min-w-6 rounded-full bg-brand px-1.5 text-center text-body-xs leading-6 font-semibold text-brand-foreground tabular-nums";
          badge.textContent = String(count);
          badge.setAttribute("aria-hidden", "true");
          element.append(badge);
          element.setAttribute("type", "button");
          element.setAttribute("aria-label", m.map.cluster(count));
          const clusterId = props.cluster_id;
          const [lng, lat] = feature.geometry.coordinates as [number, number];
          element.addEventListener("click", () => {
            const next = clusters.getClusterExpansionZoom(clusterId);
            if (next > MAX_ZOOM || map.getZoom() >= MAX_ZOOM) {
              // Everyone at one place: list them instead of zooming further.
              const leaves = clusters.getLeaves(clusterId, Infinity).map((l) => l.properties);
              const place = leaves[0]?.place;
              setPanel({
                kind: "people",
                title: m.map.peopleHere(place ? (placeLabels[place] ?? place) : ""),
                slugs: leaves.map((l) => l.slug),
              });
            } else {
              map.easeTo({ center: [lng, lat], zoom: next, duration: 500 });
            }
          });
        } else {
          const href = hrefFor(slug);
          element.setAttribute("href", href);
          element.setAttribute("aria-label", personLabel(person));
          element.title = person.name.display;
          element.dataset.person = slug;
          element.addEventListener("click", (event: MouseEvent) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
            event.preventDefault();
            navigate(href, { preventScrollReset: true });
          });
        }
        const marker = new maplibregl.Marker({ element, anchor: "center" })
          .setLngLat(feature.geometry.coordinates as [number, number])
          .addTo(map);
        current.set(key, marker);
      }
      for (const [key, marker] of current) {
        if (seen.has(key)) continue;
        marker.remove();
        current.delete(key);
      }
    };

    render();
    map.on("zoomend", render);
    return () => {
      map.off("zoomend", render);
      for (const marker of current.values()) marker.remove();
      current.clear();
    };
  }, [ready, clusters, bySlug, activeSlug, hrefFor, navigate, m, placeLabels]);

  const peopleIn = (slugs: string[]) =>
    slugs
      .flatMap((slug) => bySlug.get(slug) ?? [])
      .sort((a, b) => a.name.sort.localeCompare(b.name.sort, locale));
  const tagsOf = (person: PersonListItem) =>
    tagFacet ? (person.facets[tagFacet] ?? []).flatMap((v) => tagLabels[v] ?? []) : [];

  return (
    <div className="relative h-full bg-page">
      <p className="sr-only">{m.map.intro(points.length)}</p>
      {/* MapLibre makes its container position: relative, so it sits in a sized wrapper. */}
      <div className="absolute inset-0">
        <div ref={container} className="size-full" />
      </div>
      {!ready && !failed && (
        <p role="status" className="absolute inset-0 grid place-items-center text-muted-text">
          {m.map.loading}
        </p>
      )}
      {failed && (
        <p role="alert" className="absolute inset-x-4 top-28 text-center text-muted-text">
          {m.map.failed}
        </p>
      )}

      {hits && (
        <div className="absolute inset-x-3 top-24 z-20 mx-auto max-w-xl lg:top-28">
          <SearchSummary state={search} count={hits.length} labels={facetLabels} collapsible />
        </div>
      )}

      {/* Birth or death places, and the list of places (the way around the map). */}
      <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-3 z-20 flex flex-col items-start gap-2 sm:left-6 lg:bottom-8 lg:left-8">
        <div
          role="group"
          aria-label={m.map.showBy}
          className="flex gap-0.5 rounded-full bg-nav p-0.5 text-nav-foreground shadow-[0_2px_10px_rgb(0_0_0/0.12)]"
        >
          {(["born", "died"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className="min-h-11 rounded-full px-4 text-label font-medium transition-colors hover:bg-nav-foreground/10 aria-pressed:bg-nav-foreground aria-pressed:text-nav lg:min-h-10"
            >
              {m.map[value]}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-expanded={panel?.kind === "places"}
          onClick={() => setPanel(panel?.kind === "places" ? null : { kind: "places" })}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-nav px-4 text-label font-medium text-nav-foreground shadow-[0_2px_10px_rgb(0_0_0/0.12)] hover:bg-nav/90 lg:min-h-10"
        >
          <List aria-hidden="true" className="size-5" />
          {m.map.places}
        </button>
        <p className="text-body-xs text-muted-text">{m.map.attribution}</p>
      </div>

      {ready && (
        <CanvasControls
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
        />
      )}

      {panel && (
        <section
          aria-labelledby="map-panel-title"
          className="absolute inset-x-3 top-24 bottom-44 z-30 flex flex-col overflow-hidden rounded-card bg-surface shadow-[0_12px_40px_rgb(0_0_0/0.25)] sm:right-6 sm:left-auto sm:w-96 lg:top-28 lg:bottom-28"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
            <h2 id="map-panel-title" className="text-h3">
              {panel.kind === "places" ? m.map.placesTitle : panel.title}
            </h2>
            <button
              type="button"
              aria-label={m.map.closePlaces}
              // Without WebGL the list of places is all there is: closing a place goes back to it.
              onClick={() => setPanel(failed ? { kind: "places" } : null)}
              className="grid size-11 place-items-center rounded-full text-emphasis hover:bg-emphasis/5"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {panel.kind === "places" ? (
              <>
                <ul className="flex flex-col">
                  {places.map((place) => (
                    <li key={place.key}>
                      <button
                        type="button"
                        onClick={() => {
                          setPanel({
                            kind: "people",
                            title: m.map.peopleHere(place.label),
                            slugs: place.slugs,
                          });
                          const coords = placeCoords[place.key];
                          if (coords)
                            mapRef.current?.easeTo({
                              center: coords,
                              zoom: Math.max(5, mapRef.current.getZoom()),
                            });
                        }}
                        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-body text-emphasis hover:bg-emphasis/5"
                      >
                        {place.label}
                        <span className="text-body-xs text-muted-text tabular-nums">
                          {place.slugs.length}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {unplaced > 0 && (
                  <p className="px-3 py-2 text-body-sm text-muted-text">{m.map.unplaced(unplaced)}</p>
                )}
              </>
            ) : (
              <ul className="flex flex-col gap-1">
                {peopleIn(panel.slugs).map((person) => (
                  <li key={person.slug}>
                    <PersonRow
                      person={person}
                      href={hrefFor(person.slug)}
                      tags={tagsOf(person)}
                      active={person.slug === activeSlug}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
