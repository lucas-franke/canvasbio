import type { MouseEvent } from "react";

import { SPLIT_VIEW_QUERY } from "./hooks";

/*
 * Shared-element morph between a portrait in the overview (canvas tile or list row) and the
 * portrait of the open biography, using the View Transitions API (navigations with
 * `viewTransition`). A transition name must be unique on the page, so it is set imperatively
 * on exactly one element per state:
 * - old state: the clicked overview portrait (set on click, before the navigation starts),
 * - new state: the biography portrait, or when closing, the overview portrait of that person
 *   (set in a layout effect, i.e. in the commit inside the transition's update callback).
 * Browsers without View Transitions simply navigate. Only in the split view: on small
 * screens the biography slides up as a sheet and its portrait may be off screen.
 */

/*
 * The running transition, so focus can wait for it: moving focus while the old and new
 * snapshots are on screen is pointless for screen readers and crashes some WebKit builds.
 * React Router starts transitions via document.startViewTransition, which is wrapped once.
 */
let running: Promise<void> | null = null;

if (typeof document !== "undefined" && typeof document.startViewTransition === "function") {
  const start = document.startViewTransition.bind(document);
  document.startViewTransition = ((...args: Parameters<typeof start>) => {
    const transition = start(...args);
    const done = transition.finished.then(
      () => undefined,
      () => undefined,
    );
    running = done;
    void done.then(() => {
      if (running === done) running = null;
    });
    return transition;
  }) as typeof document.startViewTransition;
}

/** Runs `callback` once the current view transition (if any) has finished. */
export function afterViewTransition(callback: () => void) {
  if (running) void running.then(callback);
  else callback();
}

const NAME = "person-portrait";
let named: HTMLElement[] = [];

function setName(element: HTMLElement | null | undefined) {
  if (!element) return;
  element.style.viewTransitionName = NAME;
  named.push(element);
}

export function clearPortraitTransition() {
  for (const element of named) element.style.viewTransitionName = "";
  named = [];
}

const splitView = () => typeof window !== "undefined" && window.matchMedia(SPLIT_VIEW_QUERY).matches;

/** Overview portrait of a person: the element marked `data-vt-portrait` in its `data-vt-item`. */
function overviewPortrait(from: Element | null) {
  return from?.closest("[data-vt-item]")?.querySelector<HTMLElement>("[data-vt-portrait]");
}

/** onClick of an overview link: its portrait becomes the source of the morph. */
export function markPortraitSource(event: MouseEvent<HTMLElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  markPortraitSourceElement(event.currentTarget);
}

/** Same for a navigation started in code (e.g. "Zufällige Biografie"): `element` is the overview item. */
export function markPortraitSourceElement(element: Element | null | undefined) {
  clearPortraitTransition();
  if (splitView()) setName(overviewPortrait(element ?? null));
}

/** After a biography opened (or closed): name the element the morph should end on. */
export function markPortraitTarget(slug: string | undefined, previousSlug: string | undefined) {
  clearPortraitTransition();
  if (!splitView()) return;
  if (slug) {
    setName(document.querySelector<HTMLElement>("[data-vt-detail-portrait]"));
  } else if (previousSlug) {
    setName(overviewPortrait(document.querySelector(`[data-person="${CSS.escape(previousSlug)}"]`)));
  }
}
