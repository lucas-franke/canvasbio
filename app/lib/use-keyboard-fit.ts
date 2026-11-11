import { useEffect, useState, type CSSProperties } from "react";

/**
 * Keeps a full-height panel inside the part of the screen the on-screen keyboard leaves
 * free. Phones shrink only the visual viewport for the keyboard (iOS always, Android Chrome by
 * default), so a panel sized to the screen had its top or bottom under the keyboard: the
 * search field or the button to show the results. While the keyboard is open the panel takes
 * the visual viewport's position and height instead.
 *
 * Returns the inline style for the panel (undefined while nothing is covered). Pinch zoom
 * also shrinks the visual viewport; then nothing changes.
 */
export function useKeyboardFit(active: boolean): CSSProperties | undefined {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!active || !viewport) return;
    const update = () => {
      const keyboard = Math.abs(viewport.scale - 1) < 0.01 && window.innerHeight - viewport.height > 1;
      setBox((current) => {
        if (!keyboard) return null;
        const next = { top: Math.round(viewport.offsetTop), height: Math.round(viewport.height) };
        return current?.top === next.top && current.height === next.height ? current : next;
      });
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      setBox(null);
    };
  }, [active]);

  return active && box ? { top: box.top, height: box.height, bottom: "auto" } : undefined;
}
