import { ArrowDownUp } from "lucide-react";
import { useId } from "react";

import { SORTS, type SortKey, type SortView } from "~/lib/content/sort";
import { useMessages } from "~/lib/i18n";
import { useApplySearch, useSearch } from "~/lib/search/use-search";

/**
 * Order of list or timeline as a native select (the phone's own picker, fully accessible).
 * The order lives in the URL (`?sort=`) like the search, so it survives opening a biography.
 */
export function SortSelect({ view, value }: { view: SortView; value: SortKey }) {
  const m = useMessages();
  const id = useId();
  const search = useSearch();
  const applySearch = useApplySearch();
  const options = SORTS[view];

  return (
    <div className="relative flex min-w-0 items-center">
      <label htmlFor={id} className="sr-only">
        {m.sort.label}
      </label>
      <ArrowDownUp
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 size-4 text-muted-text"
      />
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          // The default order needs no parameter.
          applySearch({ ...search, sort: next === options[0] ? "" : next });
        }}
        className="h-11 min-w-0 cursor-pointer appearance-none truncate rounded-full border border-control/55 bg-surface pr-9 pl-9 text-body-sm font-medium text-emphasis hover:border-control lg:h-10"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.75rem center",
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {m.sort[option]}
          </option>
        ))}
      </select>
    </div>
  );
}
