import { cn } from "cn";
import { Check, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";

import { LoadFailed } from "~/components/people/load-failed";
import { NavIconButton } from "~/components/shell/nav";
import { Button } from "~/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle, DrawerTrigger } from "~/components/ui/drawer";
import { siteConfig } from "~/lib/config";
import type { FacetConfig } from "~/lib/config/schema";
import { usePeopleIndex, type PeopleIndex } from "~/lib/content/people-index";
import { useLocale, useMessages } from "~/lib/i18n";
import { localize } from "~/lib/i18n/localize";
import { emptySearch, filterPeople, type SearchState } from "~/lib/search/search";
import { setSearchPanelOpen, useApplySearch, useSearch, useSearchPanelOpen } from "~/lib/search/use-search";

const fieldClass =
  "min-h-12 w-full rounded-xl border-2 border-control bg-surface px-4 text-body text-emphasis placeholder:text-muted-text";

/**
 * "Suche" in the bottom navigation: a sheet with name, place and field filters (Figma
 * "Suchpanel"). The button shows the number of results live; the search applies on submit.
 */
export function SearchDrawer() {
  const m = useMessages();
  const open = useSearchPanelOpen();

  return (
    <Drawer open={open} onOpenChange={setSearchPanelOpen}>
      <DrawerTrigger asChild>
        <NavIconButton label={m.nav.search} icon={<Search />} data-search-trigger />
      </DrawerTrigger>
      <DrawerContent
        className="mx-auto max-h-[90dvh] w-full rounded-t-card bg-surface text-text md:max-w-xl"
        aria-describedby={undefined}
        // The name field gets focus, not the close button.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          document.getElementById("search-name")?.focus();
        }}
      >
        <div className="flex items-center justify-between px-6 pt-2">
          <DrawerTitle className="font-heading text-h2 font-normal text-emphasis">
            {m.search.title}
          </DrawerTitle>
          <DrawerClose
            className="grid size-12 place-items-center rounded-full border-2 border-control text-emphasis hover:bg-emphasis/5"
            aria-label={m.search.close}
          >
            <X aria-hidden="true" className="size-6" />
          </DrawerClose>
        </div>
        <SearchPanelBody />
      </DrawerContent>
    </Drawer>
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
  const applySearch = useApplySearch();
  const current = useSearch();
  const [draft, setDraft] = useState<SearchState>(current);
  const count = useMemo(
    () => filterPeople(index.people, draft, siteConfig.facets, index.facetLabels).length,
    [index, draft],
  );

  // Screen readers hear the count once typing pauses, not on every key.
  const [announced, setAnnounced] = useState<number | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setAnnounced(count), 700);
    return () => clearTimeout(timer);
  }, [count]);

  const setFacet = (key: string, values: string[]) =>
    setDraft((state) => ({ ...state, facets: { ...state.facets, [key]: values } }));

  const nameInput = useRef<HTMLInputElement>(null);
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    applySearch(draft);
    setSearchPanelOpen(false);
  };

  return (
    <form onSubmit={onSubmit} role="search" className="flex min-h-0 flex-col" aria-label={m.search.title}>
      <div className="flex flex-col gap-6 overflow-y-auto px-6 pt-6 pb-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="search-name" className="text-label font-medium text-emphasis">
            {m.search.name}
          </label>
          <input
            ref={nameInput}
            id="search-name"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            value={draft.q}
            onChange={(event) => setDraft((state) => ({ ...state, q: event.target.value }))}
            className={fieldClass}
          />
        </div>

        {siteConfig.facets.map((facet) =>
          facet.type === "multi" ? (
            <MultiFacet
              key={facet.key}
              facet={facet}
              labels={index.facetLabels[facet.key] ?? {}}
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
          {m.search.show(count)}
        </Button>
        <Button
          type="button"
          variant="control"
          onClick={() => {
            setDraft(emptySearch);
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

function MultiFacet({
  facet,
  labels,
  selected,
  onChange,
}: {
  facet: FacetConfig;
  labels: Record<string, string>;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const locale = useLocale();
  const options = Object.entries(labels).sort(([, a], [, b]) => a.localeCompare(b, locale));

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-label font-medium text-emphasis">{localize(facet.label, locale)}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([value, label]) => {
          const checked = selected.includes(value);
          return (
            <label
              key={value}
              className={cn(
                "relative inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 px-4 text-body-sm font-medium transition-colors",
                "has-[:focus-visible]:shadow-[0_0_0_6px_var(--c-focus-halo)] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
                checked
                  ? "border-brand bg-brand text-brand-foreground"
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
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

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
  const locale = useLocale();
  const id = useId();
  // Suggestions: labels of the values people actually have.
  const suggestions = useMemo(() => {
    const labels = index.facetLabels[facet.key] ?? {};
    const used = new Set(index.people.flatMap((p) => p.facets[facet.key] ?? []));
    return [...new Set([...used].map((v) => labels[v] ?? v))].sort((a, b) => a.localeCompare(b, locale));
  }, [index, facet.key, locale]);
  const hint = facet.hint ? localize(facet.hint, locale) : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${id}-input`} className="text-label font-medium text-emphasis">
        {localize(facet.label, locale)}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="-mt-1 text-body-sm text-muted-text">
          {hint}
        </p>
      )}
      <input
        id={`${id}-input`}
        type="text"
        list={`${id}-list`}
        autoComplete="off"
        aria-describedby={hint ? `${id}-hint` : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
      <datalist id={`${id}-list`}>
        {suggestions.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>
    </div>
  );
}
