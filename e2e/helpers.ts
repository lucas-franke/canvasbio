import type { Page } from "@playwright/test";

/**
 * Switches the overview with the "Ansicht" dropdown: the button shows the active view and
 * opens the list of views. `view` is the German label ("Mosaik", "Liste", "Zeitstrahl").
 */
export async function switchView(page: Page, view: string) {
  await page.getByRole("button", { name: /^Ansicht/ }).click();
  await page.getByRole("group", { name: "Ansicht" }).getByRole("link", { name: view }).click();
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

/** Waits until React has hydrated the pre-rendered page (clicks before that do nothing). */
export async function waitForHydration(page: Page) {
  await page.waitForFunction(() =>
    Object.keys(document.querySelector("main") ?? document.body).some((key) => key.startsWith("__react")),
  );
}

/** Number of people in the collection (from the overview data), so tests don't hard-code it. */
export async function peopleCount(page: Page): Promise<number> {
  const response = await page.request.get("/data/people-de.json");
  return ((await response.json()) as { people: unknown[] }).people.length;
}
