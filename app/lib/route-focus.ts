import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

import { PERSON_HEADING_ID } from "~/components/detail/ids";
import { afterViewTransition } from "./view-transition";

/**
 * Moves focus to the heading of the page now shown: the open biography's name, else the
 * page's h1, else the main content. Screen readers then read where the reader has landed
 * (WCAG 2.4.3).
 */
export function focusPageHeading() {
  const target =
    document.getElementById(PERSON_HEADING_ID) ??
    document.querySelector<HTMLElement>("main h1") ??
    document.getElementById("main");
  if (!target) return;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

/** Whether keyboard focus has been lost (on <body>, or on an element no longer in the page). */
function focusLost(): boolean {
  const active = document.activeElement;
  return !active || active === document.body || !active.isConnected;
}

/**
 * After a client-side navigation to another page, focus that has been lost (the link that was
 * followed belonged to the page that was replaced) moves to the new page's heading. Focus that
 * landed somewhere on purpose (a biography's name, the person in the overview) stays there.
 * Only path changes count: hash (biography tabs, chapters) and query (search) changes don't.
 */
export function useRouteFocus() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    let frame = 0;
    afterViewTransition(() => {
      frame = requestAnimationFrame(() => {
        if (focusLost()) focusPageHeading();
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
}
