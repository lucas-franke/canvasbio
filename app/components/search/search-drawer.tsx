import { cn } from "cn";
import { ArrowRight, Check, MapPin, Search, X } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { LoadFailed } from "~/components/people/load-failed";
import { Portrait } from "~/components/portrait";
import { SIDE_SHEET } from "~/components/shell/menu-drawer";
import { NavIconButton } from "~/components/shell/nav";
import { Button, closeButtonClass } from "~/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle, DrawerTrigger } from "~/components/ui/drawer";
import { siteConfig } from "~/lib/config";
import { focusPageHeading } from "~/lib/route-focus";
import { afterViewTransition } from "~/lib/view-transition";
import { useKeyboardFit } from "~/lib/use-keyboard-fit";
import type { FacetConfig } from "~/lib/config/schema";
import { lifeYears } from "~/lib/content/format";
import { usePeopleIndex, type PeopleIndex } from "~/lib/content/people-index";
import { useLocale, useMessages } from "~/lib/i18n";
import { pagePath, parsePath } from "~/lib/i18n/locale";
import { localize } from "~/lib/i18n/localize";
import {
  emptySearch,
  filterPeople,
  isSearchActive,
  normalize,
  suggestPeople,
  type SearchState,
} from "~/lib/search/search";
import {
  setSearchPanelOpen,
  useApplySearch,
  useSearch,
  useSearchPanelOpen,
  useSearchSuffix,
} from "~/lib/search/use-search";

/**
 * Text fields. Focused, the focus ring takes the place of the border (one ring, not the
 * border plus the ring 2 px apart); the halo stays outside.
 */
/**
 * Where focus goes once the panel has closed, if not back to the search button: the page a
 * suggestion opened, or the results of the search just applied. Set right before closing.
 */
let focusAfterClose: "page" | "results" | null = null;

const fieldClass =
  "min-h-11 w-full rounded-xl border-2 border-control bg-surface px-4 text-body text-emphasis placeholder:text-muted-text focus-visible:border-focus focus-visible:outline-offset-[-2px]";

/**
 * The search button in the navigation: a sheet with name, place and field filters (Figma
 * "Suchpanel"). The button shows the number of results live; the search applies on submit.
 */
export function SearchDrawer() {
  const m = useMessages();
  const open = useSearchPanelOpen();
  // On phones the keyboard covers part of the screen: the panel fits into the rest, so the
  // name field (top) and the button showing the results (bottom) both stay in view.
  const keyboardFit = useKeyboardFit(open);

  return (
    // From the right on every screen (the search button is at the top right). A full-height
    // panel instead of a bottom sheet: the field stays at the top of the screen when the
    // keyboard opens. vaul's own input repositioning moved the sheet away from the keyboard
    // and the field with it out of view, so it is off; useKeyboardFit does that job.
    <Drawer open={open} onOpenChange={setSearchPanelOpen} direction="right" repositionInputs={false}>
      <DrawerTrigger asChild>
        <SearchTrigger />
      </DrawerTrigger>
      <DrawerContent
        className={cn(
          "bg-surface text-text",
          SIDE_SHEET,
          "data-[vaul-drawer-direction=right]:max-sm:rounded-none",
        )}
        style={keyboardFit}
        aria-describedby={undefined}
        // Escape in an open suggestion list closes the list, not the panel (the panel listens first).
        onEscapeKeyDown={(event) => {
          if ((event.target as Element).closest?.('[role="combobox"][aria-expanded="true"]'))
            event.preventDefault();
        }}
        tabIndex={-1}
        // The name field gets focus, not the close button: whoever opens the search wants to
        // type (on phones the keyboard covers the filters until it is closed). While the index
        // is still loading there is no field yet: the close button gets focus, and the form
        // takes it over once it is there (SearchForm).
        onOpenAutoFocus={(event) => {
          const name = document.getElementById("search-name");
          if (!name) return;
          event.preventDefault();
          name.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={(event) => {
          const target = focusAfterClose;
          focusAfterClose = null;
          if (target === "page") {
            event.preventDefault();
            afterViewTransition(focusPageHeading);
          } else if (target === "results") {
            const heading = document.querySelector<HTMLElement>("[data-search-results]");
            if (!heading) return;
            event.preventDefault();
            heading.focus();
          }
        }}
      >
        <div className="flex items-center justify-between px-6 pt-[max(1rem,env(safe-area-inset-top))]">
          <DrawerTitle className="font-heading text-h3 font-semibold text-emphasis">
            {m.search.title}
          </DrawerTitle>
          <DrawerClose className={closeButtonClass} aria-label={m.search.close}>
            <X aria-hidden="true" className="size-5" />
          </DrawerClose>
        </div>
        <SearchPanelBody />
      </DrawerContent>
    </Drawer>
  );
}

/**
 * The search button of the navigation. While a search is active on the people pages it
 * carries a mark (a filled dot: a shape, not only a colour) and its name says how many
 * results there are, so the filter stays visible when the results bar has scrolled away.
 */
function SearchTrigger(props: ComponentProps<"button">) {
  const m = useMessages();
  const search = useSearch();
  const { pathname } = useLocation();
  const active = isSearchActive(search) && parsePath(pathname).page === "people";
  const count = useResultCount(active ? search : null);
  return (
    <NavIconButton
      label={m.nav.search}
      icon={<Search />}
      nameSuffix={count === null ? "" : `, ${m.nav.searchActive(count)}`}
      data-search-trigger
      {...props}
    >
      {active && (
        <span
          aria-hidden="true"
          data-search-active=""
          className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-brand ring-2 ring-nav"
        />
      )}
    </NavIconButton>
  );
}

/** Number of people a search finds, once the overview data is there; null without a search. */
function useResultCount(search: SearchState | null): number | null {
  const locale = useLocale();
  const { index } = usePeopleIndex(locale);
  return useMemo(
    () =>
      search && index
        ? filterPeople(index.people, search, siteConfig.facets, index.facetLabels).length
        : null,
    [index, search],
  );
}

function SearchPanelBody() {
  const locale = useLocale();
  const m = useMessages();
  const { index, failed, retry } = usePeopleIndex(locale);
  if (failed) return <LoadFailed onRetry={retry} className="px-6 py-10" />;
  if (!index) {
    return (
      <p role="status" className="px-6 py-10 text-muted-text">
        {m.search.loading}
      </p>
    );
  }
  return <SearchForm index={index} />;
}

function SearchForm({ index }: { index: PeopleIndex }) {
  const m = useMessages();
  const locale = useLocale();
  const navigate = useNavigate();
  const applySearch = useApplySearch();
  const current = useSearch();
  const [draft, setDraft] = useState<SearchState>(current);
  const matches = useMemo(
    () => filterPeople(index.people, draft, siteConfig.facets, index.facetLabels),
    [index, draft],
  );
  const count = matches.length;
  const nameOnly =
    draft.q.trim() !== "" && Object.values(draft.facets).every((values) => values.length === 0);

  // Screen readers hear the count once typing pauses, not on every key.
  const [announced, setAnnounced] = useState<number | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setAnnounced(count), 700);
    return () => clearTimeout(timer);
  }, [count]);

  // Per chip: how many people the search would find with that value, given the other inputs.
  const facetCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    for (const facet of siteConfig.facets) {
      if (facet.type !== "multi") continue;
      counts[facet.key] = Object.fromEntries(
        Object.keys(index.facetLabels[facet.key] ?? {}).map((value) => [
          value,
          filterPeople(
            index.people,
            { ...draft, facets: { ...draft.facets, [facet.key]: [value] } },
            siteConfig.facets,
            index.facetLabels,
          ).length,
        ]),
      );
    }
    return counts;
  }, [index, draft]);

  const setFacet = (key: string, values: string[]) =>
    setDraft((state) => ({ ...state, facets: { ...state.facets, [key]: values } }));

  const nameInput = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  // Loaded after the panel opened (focus went to the close button meanwhile): the name field
  // takes focus, as when the panel opens with the form ready.
  useEffect(() => {
    const drawer = form.current?.closest("[data-vaul-drawer]");
    const active = document.activeElement;
    if (drawer && active && drawer.contains(active) && !form.current!.contains(active)) {
      nameInput.current?.focus({ preventScroll: true });
    }
  }, []);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    // A name that fits exactly one person: whoever typed it wants that biography, not a
    // result list with one entry.
    if (nameOnly && count === 1) {
      focusAfterClose = "page";
      setSearchPanelOpen(false);
      navigate(pagePath(locale, "people", matches[0]!.slug));
      return;
    }
    applySearch(draft);
    focusAfterClose = "results";
    setSearchPanelOpen(false);
  };

  return (
    <form
      ref={form}
      onSubmit={onSubmit}
      role="search"
      className="flex min-h-0 flex-1 flex-col"
      aria-label={m.search.title}
    >
      <div className="flex min-h-0 scroll-pt-6 scroll-pb-4 flex-col gap-6 overflow-y-auto overscroll-contain px-6 pt-6 pb-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="search-name" className="text-label font-medium text-emphasis">
            {m.search.name}
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-text"
            />
            <input
              ref={nameInput}
              id="search-name"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              value={draft.q}
              onChange={(event) => setDraft((state) => ({ ...state, q: event.target.value }))}
              className={cn(fieldClass, "pr-12 pl-12 [&::-webkit-search-cancel-button]:appearance-none")}
            />
            {draft.q && (
              <button
                type="button"
                aria-label={m.search.clearName}
                onClick={() => {
                  setDraft((state) => ({ ...state, q: "" }));
                  nameInput.current?.focus();
                }}
                className="absolute inset-y-0.5 right-0.5 grid w-11 place-items-center rounded-xl text-muted-text hover:text-emphasis"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            )}
          </div>
          <PersonSuggestions index={index} query={draft.q} />
        </div>

        {siteConfig.facets.map((facet) =>
          facet.type === "multi" ? (
            <MultiFacet
              key={facet.key}
              facet={facet}
              labels={index.facetLabels[facet.key] ?? {}}
              counts={facetCounts[facet.key] ?? {}}
              selected={draft.facets[facet.key] ?? []}
              onChange={(values) => setFacet(facet.key, values)}
            />
          ) : (
            <AutocompleteFacet
              key={facet.key}
              facet={facet}
              index={index}
              value={draft.facets[facet.key]?.[0] ?? ""}
              onChange={(value) => setFacet(facet.key, value.trim() ? [value] : [])}
            />
          ),
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Button type="submit" className="grow">
          {isSearchActive(draft) ? m.search.show(count) : m.search.showAll(count)}
        </Button>
        <Button
          type="button"
          variant="control"
          onClick={() => {
            setDraft((state) => ({ ...emptySearch, sort: state.sort }));
            nameInput.current?.focus();
          }}
        >
          {m.search.reset}
        </Button>
        <p role="status" className="sr-only">
          {announced === null ? "" : m.search.found(announced)}
        </p>
      </div>
    </form>
  );
}

/**
 * Type-ahead: the people whose name matches what is typed, to open one directly. Most
 * searches look for one person; the filters below are for exploring.
 */
function PersonSuggestions({ index, query }: { index: PeopleIndex; query: string }) {
  const m = useMessages();
  const locale = useLocale();
  const suffix = useSearchSuffix();
  const headingId = useId();
  const applySearch = useApplySearch();
  const sort = useSearch().sort;
  const people = useMemo(() => suggestPeople(index.people, query), [index, query]);
  // Everyone the name fits: the suggestions show a few, the last row leads to all of them.
  const total = useMemo(
    () =>
      people.length === 0
        ? 0
        : filterPeople(index.people, { ...emptySearch, q: query }, siteConfig.facets, index.facetLabels)
            .length,
    [index, query, people.length],
  );
  if (people.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-1 pt-1">
      <h3 id={headingId} className="text-eyebrow">
        {m.search.suggestions}
      </h3>
      <ul className="flex flex-col">
        {people.map((person) => (
          <li key={person.slug}>
            <Link
              to={pagePath(locale, "people", person.slug) + suffix}
              onClick={() => {
                focusAfterClose = "page";
                setSearchPanelOpen(false);
              }}
              className="flex min-h-12 items-center gap-3 rounded-xl px-2 py-1 hover:bg-emphasis/5"
            >
              <span className="size-10 shrink-0 overflow-hidden rounded-md">
                <Portrait
                  slug={person.slug}
                  image={person.image}
                  alt=""
                  sizes="40px"
                  className="size-full object-cover"
                />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-emphasis">{person.name.display}</span>
                <span className="text-body-xs text-muted-text">{lifeYears(person.born, person.died)}</span>
              </span>
            </Link>
          </li>
        ))}
        {total > people.length && (
          <li>
            <button
              type="button"
              onClick={() => {
                applySearch({ ...emptySearch, q: query.trim(), sort }, { toList: true });
                focusAfterClose = "results";
                setSearchPanelOpen(false);
              }}
              className="flex min-h-12 w-full items-center gap-2 rounded-xl px-2 py-1 text-left font-medium text-brand hover:bg-emphasis/5"
            >
              {m.search.showAll(total)}
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}

function MultiFacet({
  facet,
  labels,
  counts,
  selected,
  onChange,
}: {
  facet: FacetConfig;
  labels: Record<string, string>;
  /** Results with this value, given the other inputs. */
  counts: Record<string, number>;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const options = Object.entries(labels).sort(([, a], [, b]) => a.localeCompare(b, locale));

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-label font-medium text-emphasis">{localize(facet.label, locale)}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([value, label]) => {
          const checked = selected.includes(value);
          const count = counts[value] ?? 0;
          return (
            <label
              key={value}
              className={cn(
                "hit-44 inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-body-sm font-medium transition-colors",
                "has-[:focus-visible]:shadow-[0_0_0_6px_var(--c-focus-halo)] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
                checked
                  ? "border-brand bg-brand text-brand-foreground"
                  : count === 0
                    ? "border-dashed border-control text-muted-text hover:bg-emphasis/5"
                    : "border-control text-emphasis hover:bg-emphasis/5",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() =>
                  onChange(checked ? selected.filter((v) => v !== value) : [...selected, value])
                }
              />
              {/* The check mark shows the state without relying on colour (WCAG 1.4.1). */}
              {checked && <Check aria-hidden="true" className="-ml-1 size-4" />}
              {label}
              <span className="text-body-xs tabular-nums">
                <span aria-hidden="true">{count}</span>
                <span className="sr-only"> ({m.search.peopleCount(count)})</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** A place suggestion; `level` 1 = a country under its continent (`group`). */
interface Option {
  label: string;
  count: number;
  /** Normalised label, for matching. */
  key: string;
  level: 0 | 1;
  group: string;
}

/** Most suggestions shown at once while typing; typing narrows them down. */
const MAX_PLACE_OPTIONS = 8;

/**
 * Free text with suggestions as an ARIA 1.2 combobox (list autocomplete). Replaces a native
 * datalist, which can't be styled, shows no counts and behaves differently in every browser.
 */
function AutocompleteFacet({
  facet,
  index,
  value,
  onChange,
}: {
  facet: FacetConfig;
  index: PeopleIndex;
  value: string;
  onChange: (value: string) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // Labels of the values people actually have, with how many people have each.
  const labels = useMemo(() => index.facetLabels[facet.key] ?? {}, [index, facet.key]);
  const counts = useMemo(() => {
    const byValue = new Map<string, number>();
    for (const person of index.people) {
      for (const v of person.facets[facet.key] ?? []) byValue.set(v, (byValue.get(v) ?? 0) + 1);
    }
    return byValue;
  }, [index, facet.key]);
  const all = useMemo(() => {
    const byLabel = new Map<string, number>();
    for (const [v, count] of counts) {
      const label = labels[v] ?? v;
      byLabel.set(label, (byLabel.get(label) ?? 0) + count);
    }
    return [...byLabel].map(([label, count]) => ({ label, count, key: normalize(label) }));
  }, [counts, labels]);

  // Nothing typed yet: the continents, each followed by its countries, to browse (the place
  // facet only). While typing: the matching places of any kind, best first.
  const groups = useMemo(() => (facet.key === "place" ? (index.placeGroups ?? []) : []), [facet.key, index]);
  const query = normalize(value.trim());
  const grouped = !query && groups.length > 0;
  const options = useMemo((): Option[] => {
    if (grouped) {
      const option = (v: string, level: 0 | 1, group: string): Option => ({
        label: labels[v] ?? v,
        count: counts.get(v) ?? 0,
        key: normalize(labels[v] ?? v),
        level,
        group,
      });
      return groups.flatMap((g) => [
        option(g.key, 0, g.key),
        ...g.countries.filter((c) => counts.get(c)).map((c) => option(c, 1, g.key)),
      ]);
    }
    const matches = query ? all.filter((o) => o.key.includes(query)) : [...all];
    return matches
      .sort(
        (a, b) =>
          // Labels starting with the input first, then the most frequent.
          Number(b.key.startsWith(query)) - Number(a.key.startsWith(query)) ||
          b.count - a.count ||
          a.label.localeCompare(b.label, locale),
      )
      .slice(0, MAX_PLACE_OPTIONS)
      .map((o) => ({ ...o, level: 0 as const, group: "" }));
  }, [grouped, groups, labels, counts, all, query, locale]);

  const exact = options.length === 1 && options[0]!.key === query;
  const expanded = open && options.length > 0 && !exact;
  const hint = facet.hint ? localize(facet.hint, locale) : undefined;
  const optionId = (i: number) => `${id}-option-${i}`;

  const choose = (label: string) => {
    onChange(label);
    setOpen(false);
    setActive(-1);
  };

  // The list scrolls on its own (long when grouped): keep the active option in view.
  useEffect(() => {
    if (!expanded || active < 0) return;
    document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, expanded, id]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!expanded) {
        setOpen(true);
        setActive(event.key === "ArrowDown" ? 0 : options.length - 1);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + options.length) % options.length);
    } else if (event.key === "Enter" && expanded && active >= 0) {
      // Picks the suggestion; without one, Enter submits the search as usual.
      event.preventDefault();
      choose(options[active]!.label);
    } else if (event.key === "Escape" && expanded) {
      // Closes the list only, not the whole search panel.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setActive(-1);
    }
  };

  // Mouse: keep focus in the input (no blur before the click) and pick on click.
  // Keyboard users pick with the arrow keys and Enter (aria-activedescendant).
  const renderOption = (option: Option, i: number) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      key={`${option.group}:${option.label}`}
      id={optionId(i)}
      role="option"
      tabIndex={-1}
      aria-selected={i === active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => choose(option.label)}
      className={cn(
        "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 text-body text-emphasis hover:bg-emphasis/5",
        // A continent (when grouped) leads its countries; the countries are indented under it.
        grouped && option.level === 0 && "font-semibold",
        option.level === 1 && "ml-3 rounded-l-none border-l-2 border-line pl-4 text-body-sm",
        i === active && "bg-brand text-brand-foreground hover:bg-brand",
      )}
    >
      {option.label}
      <span className={cn("text-body-xs font-normal tabular-nums", i !== active && "text-muted-text")}>
        <span aria-hidden="true">{option.count}</span>
        <span className="sr-only">{m.search.peopleCount(option.count)}</span>
      </span>
    </div>
  );

  return (
    <div ref={root} className="flex flex-col gap-2">
      <label htmlFor={`${id}-input`} className="text-label font-medium text-emphasis">
        {localize(facet.label, locale)}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="-mt-1 text-body-sm text-muted-text">
          {hint}
        </p>
      )}
      <div className="relative">
        <MapPin
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-text"
        />
        <input
          ref={input}
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          aria-describedby={hint ? `${id}-hint` : undefined}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={onKeyDown}
          // Opens the suggestions right away (grouped by continent when nothing is typed).
          onClick={() => setOpen(true)}
          // The on-screen keyboard shrinks the sheet; keep label, field and suggestions in view
          // instead of letting the browser scroll just the field (which hides the label).
          onFocus={() => {
            setOpen(true);
            setTimeout(() => root.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 300);
          }}
          onBlur={() => setOpen(false)}
          className={cn(fieldClass, "pr-12 pl-12")}
        />
        {value && (
          <button
            type="button"
            aria-label={m.search.clearField(localize(facet.label, locale))}
            onClick={() => {
              onChange("");
              input.current?.focus();
            }}
            className="absolute inset-y-0.5 right-0.5 grid w-11 place-items-center rounded-xl text-muted-text hover:text-emphasis"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        )}
      </div>
      <div
        id={`${id}-listbox`}
        role="listbox"
        aria-label={localize(facet.label, locale)}
        hidden={!expanded}
        className="flex max-h-80 flex-col overflow-y-auto overscroll-contain rounded-xl border-2 border-control bg-surface p-1"
      >
        {grouped
          ? groups.map((g) => {
              const items = options.flatMap((o, i) => (o.group === g.key ? [{ o, i }] : []));
              if (items.length === 0) return null;
              return (
                <div
                  key={g.key}
                  role="group"
                  aria-label={items[0]!.o.label}
                  className="flex flex-col border-b border-line py-1 last:border-b-0"
                >
                  {items.map(({ o, i }) => renderOption(o, i))}
                </div>
              );
            })
          : options.map((o, i) => renderOption(o, i))}
      </div>
    </div>
  );
}
