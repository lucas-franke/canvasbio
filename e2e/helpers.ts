import type { Page } from "@playwright/test";

/**
 * On touch screens the canvas controls (zoom, direction pad, hide names) sit behind one
 * button ("Porträtwand steuern"); open it there. On desktop they are always visible.
 */
export async function openCanvasControls(page: Page, isMobile: boolean) {
  if (!isMobile) return;
  const toggle = page.getByRole("button", { name: "Porträtwand steuern" });
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Whether two rectangles overlap (touching edges don't count). */
export const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Boxes of the two navigation pills (left and right group). */
export async function navPillBoxes(page: Page, navName = "Hauptnavigation") {
  const groups = page.getByRole("navigation", { name: navName }).locator("> div");
  const boxes = await Promise.all([groups.first().boundingBox(), groups.last().boundingBox()]);
  return boxes.filter((b): b is Box => b !== null && b.width > 0);
}
