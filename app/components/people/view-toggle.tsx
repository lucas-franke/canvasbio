import { LayoutGrid, List } from "lucide-react";
import { useId } from "react";
import { Link } from "react-router";

import { useLocale, useMessages } from "~/lib/i18n";
import { listPath, pagePath } from "~/lib/i18n/locale";
import { useSearchSuffix } from "~/lib/search/use-search";

const optionClass =
  "grid size-11 place-items-center rounded-full text-nav-foreground transition-colors hover:bg-nav-foreground/15 aria-[current=page]:bg-nav-foreground aria-[current=page]:text-nav [&_svg]:size-5";

/**
 * "Ansicht" switch between portrait wall and list (Figma "Toggle").
 * Both views are separate URLs, so the options are links; the active one is aria-current.
 */
export function ViewToggle({ active }: { active: "canvas" | "list" }) {
  const locale = useLocale();
  const m = useMessages();
  const labelId = useId();
  // Switching views keeps the search (so does switching languages in the menu). No view
  // transition here: right after loading, it raced with hydration and crashed WebKit.
  const suffix = useSearchSuffix();

  return (
    <div role="group" aria-labelledby={labelId} className="flex items-center gap-3 md:pl-6">
      <span
        id={labelId}
        className="sr-only text-label font-medium whitespace-nowrap text-nav-foreground md:not-sr-only"
      >
        {m.view.label}
      </span>
      <div className="flex gap-1 rounded-full border-2 border-nav-foreground p-0.5">
        <Link
          to={pagePath(locale, "people") + suffix}
          aria-current={active === "canvas" ? "page" : undefined}
          aria-label={m.view.canvas}
          className={optionClass}
        >
          <LayoutGrid aria-hidden="true" />
        </Link>
        <Link
          to={listPath(locale) + suffix}
          aria-current={active === "list" ? "page" : undefined}
          aria-label={m.view.list}
          className={optionClass}
        >
          <List aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
