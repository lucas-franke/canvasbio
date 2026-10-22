import { cn } from "cn";
import { ChartGantt, ChevronDown, LayoutDashboard, List } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";

import { useLocale, useMessages } from "~/lib/i18n";
import { listPath, pagePath, timelinePath } from "~/lib/i18n/locale";
import { useSearchSuffix } from "~/lib/search/use-search";

type View = "canvas" | "list" | "timeline";

const optionClass =
  "grid size-11 shrink-0 place-items-center rounded-full text-nav-foreground transition-colors hover:bg-nav-foreground/10 lg:size-10 [&_svg]:size-5";

/**
 * "Ansicht": switch between portrait wall, list and timeline. Collapsed it shows only the
 * active view; a click unfolds the label and all three options (links, the active one is
 * aria-current). Escape, a click outside or choosing a view folds it again. Without
 * JavaScript all three options show right away.
 */
export function ViewToggle({ active }: { active: View }) {
  const locale = useLocale();
  const m = useMessages();
  const labelId = useId();
  const groupId = useId();
  // Switching views keeps the search (so does switching languages in the menu). No view
  // transition here: right after loading, it raced with hydration and crashed WebKit.
  const suffix = useSearchSuffix();

  const options = [
    { view: "canvas", href: pagePath(locale, "people"), label: m.view.canvas, icon: <LayoutDashboard /> },
    { view: "list", href: listPath(locale), label: m.view.list, icon: <List /> },
    { view: "timeline", href: timelinePath(locale), label: m.view.timeline, icon: <ChartGantt /> },
  ] as const;
  const current = options.find((o) => o.view === active)!;

  const [open, setOpen] = useState(false);
  // Fold again once another view is shown.
  const [shownFor, setShownFor] = useState(active);
  if (shownFor !== active) {
    setShownFor(active);
    setOpen(false);
  }

  const group = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  // After Escape, focus goes back to the (re-rendered) button.
  const returnFocus = useRef(false);

  useEffect(() => {
    if (!open) {
      if (returnFocus.current) {
        returnFocus.current = false;
        button.current?.focus();
      }
      return;
    }
    // Focus moves into the unfolded options (the button is gone).
    group.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!group.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      returnFocus.current = true;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const unfolded = (props: { id: string; labelId: string; className?: string; animate?: boolean }) => (
    <div
      ref={props.animate ? group : undefined}
      id={props.id}
      role="group"
      aria-labelledby={props.labelId}
      className={cn(
        "flex items-center gap-0.5",
        props.animate && "animate-in duration-150 zoom-in-95 fade-in",
        props.className,
      )}
    >
      <span
        id={props.labelId}
        className="px-2 text-body-sm font-medium whitespace-nowrap text-nav-foreground"
      >
        {m.view.label}
      </span>
      {options.map((option) => (
        <Link
          key={option.view}
          to={option.href + suffix}
          aria-current={option.view === active ? "page" : undefined}
          aria-label={option.label}
          title={option.label}
          onClick={() => option.view === active && setOpen(false)}
          className={cn(optionClass, "aria-[current=page]:bg-nav-foreground aria-[current=page]:text-nav")}
        >
          <span aria-hidden="true">{option.icon}</span>
        </Link>
      ))}
    </div>
  );

  if (open) return unfolded({ id: groupId, labelId, animate: true });

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={false}
        aria-controls={groupId}
        aria-label={`${m.view.label}: ${current.label}`}
        title={m.view.label}
        onClick={() => setOpen(true)}
        // The chevron (and from md the view's name) shows that it unfolds.
        className="js-only inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-nav-foreground transition-colors hover:bg-nav-foreground/10 lg:h-10 [&_svg]:size-5"
      >
        <span aria-hidden="true">{current.icon}</span>
        <span aria-hidden="true" className="hidden text-label font-medium md:inline">
          {current.label}
        </span>
        <ChevronDown aria-hidden="true" className="-ml-0.5 size-4!" />
      </button>
      {/* Without JavaScript the button can't unfold: show all views right away. */}
      {unfolded({ id: `${groupId}-static`, labelId: `${labelId}-static`, className: "nojs-only" })}
    </>
  );
}
