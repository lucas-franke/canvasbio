import { cn } from "cn";
import { ChartGantt, Check, ChevronDown, LayoutDashboard, List } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router";

import { useLocale, useMessages } from "~/lib/i18n";
import { listPath, pagePath, timelinePath } from "~/lib/i18n/locale";
import { useSearchSuffix } from "~/lib/search/use-search";

type View = "canvas" | "list" | "timeline";

/**
 * "Ansicht": switch between portrait wall, list and timeline. The button shows the active
 * view; it opens a small dropdown with all three views (icon and label; links, the active
 * one is aria-current). Escape, a click outside or choosing a view closes it; arrow keys move
 * between the views. Without JavaScript all three views show right away.
 */
export function ViewToggle({ active }: { active: View }) {
  const locale = useLocale();
  const m = useMessages();
  const labelId = useId();
  const listId = useId();
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
  // Close once another view is shown.
  const [shownFor, setShownFor] = useState(active);
  if (shownFor !== active) {
    setShownFor(active);
    setOpen(false);
  }

  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Focus moves to the active view in the list.
    panel.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  // Up/down (and Home/End) move between the views; Tab leaves the list as usual.
  const onListKeyDown = (event: KeyboardEvent) => {
    const links = [...(panel.current?.querySelectorAll<HTMLElement>("a") ?? [])];
    const index = links.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === "ArrowDown"
        ? (index + 1) % links.length
        : event.key === "ArrowUp"
          ? (index - 1 + links.length) % links.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? links.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    links[next]?.focus();
  };

  return (
    <>
      <div ref={root} className="js-only relative">
        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`${m.view.label}: ${current.label}`}
          title={m.view.label}
          onClick={() => setOpen((value) => !value)}
          // The chevron (and from md the view's name) shows that it opens.
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-nav-foreground transition-colors hover:bg-nav-foreground/10 aria-expanded:bg-nav-foreground/10 lg:h-10 [&_svg]:size-5"
        >
          <span aria-hidden="true">{current.icon}</span>
          <span aria-hidden="true" className="hidden text-label font-medium md:inline">
            {current.label}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn("-ml-0.5 size-4! transition-transform", open && "rotate-180")}
          />
        </button>
        {open && (
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- arrow keys for the links inside
          <div
            ref={panel}
            id={listId}
            role="group"
            aria-labelledby={labelId}
            onKeyDown={onListKeyDown}
            className="absolute top-full right-0 z-50 mt-2 flex min-w-48 animate-in flex-col gap-0.5 rounded-3xl bg-nav p-1.5 text-nav-foreground shadow-[0_8px_30px_rgb(0_0_0/0.18)] duration-150 zoom-in-95 fade-in"
          >
            <span id={labelId} className="sr-only">
              {m.view.label}
            </span>
            {options.map((option) => (
              <Link
                key={option.view}
                to={option.href + suffix}
                aria-current={option.view === active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-full px-3 text-label font-medium whitespace-nowrap transition-colors hover:bg-nav-foreground/10 aria-[current=page]:bg-nav-foreground/10 [&_svg]:size-5"
              >
                <span aria-hidden="true">{option.icon}</span>
                <span className="flex-1">{option.label}</span>
                {option.view === active && <Check aria-hidden="true" className="size-4!" />}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Without JavaScript the button can't open: show all views right away. */}
      <div role="group" aria-labelledby={`${labelId}-static`} className="nojs-only flex items-center gap-0.5">
        <span id={`${labelId}-static`} className="px-2 text-body-sm font-medium whitespace-nowrap">
          {m.view.label}
        </span>
        {options.map((option) => (
          <Link
            key={option.view}
            to={option.href}
            aria-current={option.view === active ? "page" : undefined}
            aria-label={option.label}
            title={option.label}
            className="grid size-11 shrink-0 place-items-center rounded-full text-nav-foreground hover:bg-nav-foreground/10 aria-[current=page]:bg-nav-foreground aria-[current=page]:text-nav lg:size-10 [&_svg]:size-5"
          >
            <span aria-hidden="true">{option.icon}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
