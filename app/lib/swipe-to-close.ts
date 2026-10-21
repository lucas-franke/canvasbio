import { useEffect, useRef, type RefObject } from "react";

/** Pulled at least this far (px, or a quarter of the panel if less), the panel closes. */
const CLOSE_DISTANCE = 160;
/** A quick flick closes as well (px per ms, after at least MIN_FLICK px). */
const FLICK_VELOCITY = 0.6;
const MIN_FLICK = 40;
/** Movement before the gesture is classified as pull or scroll. */
const SLOP = 8;

/**
 * Swipe down to close a full-screen panel (the biography sheet on phones), like native
 * sheets: only when it is scrolled to the top and the finger moves down; otherwise it
 * scrolls as usual. The close button stays the alternative without a gesture (WCAG 2.5.7).
 * Touch only; mouse and keyboard are unaffected.
 */
export function useSwipeToClose(ref: RefObject<HTMLElement | null>, enabled: boolean, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const panel = ref.current;
    if (!panel || !enabled) return;
    let state: "idle" | "pending" | "pull" | "scroll" = "idle";
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let distance = 0;

    const settle = () => {
      panel.style.transition = "transform 200ms ease-out";
      panel.style.transform = "";
    };

    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (event.touches.length !== 1 || !touch || panel.scrollTop > 0) {
        state = "idle";
        return;
      }
      state = "pending";
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = event.timeStamp;
      distance = 0;
    };

    const onMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || state === "idle" || state === "scroll") return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (state === "pending") {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        // Down and mostly vertical: pull. Anything else (scrolling up, the tab row sideways): leave it.
        state = dy > 0 && Math.abs(dy) > Math.abs(dx) ? "pull" : "scroll";
        if (state === "scroll") return;
      }
      event.preventDefault();
      distance = Math.max(0, dy);
      panel.style.transition = "none";
      panel.style.transform = `translateY(${distance}px)`;
    };

    const onEnd = (event: TouchEvent) => {
      if (state !== "pull") {
        state = "idle";
        return;
      }
      state = "idle";
      const velocity = distance / Math.max(1, event.timeStamp - startTime);
      const far = distance > Math.min(CLOSE_DISTANCE, panel.clientHeight / 4);
      if (event.type === "touchend" && (far || (velocity > FLICK_VELOCITY && distance > MIN_FLICK))) {
        // Stays where the finger left it; the closing transition slides it out from there.
        close.current();
      } else {
        settle();
      }
    };

    panel.addEventListener("touchstart", onStart, { passive: true });
    panel.addEventListener("touchmove", onMove, { passive: false });
    panel.addEventListener("touchend", onEnd);
    panel.addEventListener("touchcancel", onEnd);
    return () => {
      panel.removeEventListener("touchstart", onStart);
      panel.removeEventListener("touchmove", onMove);
      panel.removeEventListener("touchend", onEnd);
      panel.removeEventListener("touchcancel", onEnd);
      panel.style.transition = "";
      panel.style.transform = "";
    };
  }, [ref, enabled]);
}
