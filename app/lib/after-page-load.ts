/**
 * Resolves once the page has loaded (its images included) and painted: after `load`, the
 * second animation frame (the first frame has been drawn by then). After client-side
 * navigation that is two frames.
 *
 * For large things a page can show without (people data behind a biography, MapLibre):
 * started earlier, they competed with what the page shows first.
 */
export const afterPageLoad = () =>
  new Promise<void>((resolve) => {
    const painted = () => requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    if (document.readyState === "complete") painted();
    else window.addEventListener("load", painted, { once: true });
  });
