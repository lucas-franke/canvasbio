import { expect, test, type Locator, type Page } from "@playwright/test";

/** Position of the first marker fully on screen, clear of the navigation and the controls; −1 if none. */
const onScreen = (markers: Locator) =>
  markers.evaluateAll((all) =>
    all.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return r.left > 16 && r.right < innerWidth - 72 && r.top > 120 && r.bottom < innerHeight - 200;
    }),
  );

const clustersOf = (page: Page) => page.getByRole("button", { name: /^\d+ Biografien hier, vergrößern$/ });

/** A cluster fully on screen. */
async function visibleCluster(page: Page) {
  const clusters = clustersOf(page);
  await expect(clusters.first()).toBeAttached({ timeout: 20_000 });
  // Let the opening fit (fitBounds) settle.
  await page.waitForTimeout(1000);
  const index = await onScreen(clusters);
  expect(index).toBeGreaterThanOrEqual(0);
  return clusters.nth(index);
}

/** Where each marker sits on screen, by its label. */
const markerPositions = (page: Page) =>
  page.locator(".maplibregl-marker").evaluateAll((all) =>
    all
      .map((el) => {
        const r = el.getBoundingClientRect();
        return `${el.getAttribute("aria-label")}@${Math.round(r.x)},${Math.round(r.y)}`;
      })
      .sort()
      .join("|"),
  );

test("pointing at a cluster enlarges it in place instead of moving it away (desktop)", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "hover needs a mouse");
  await page.goto("/personen/karte");
  const marker = await visibleCluster(page);
  const before = (await marker.boundingBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  // The zoom on hover is on the portrait inside; MapLibre's positioned element stays put.
  await page.waitForTimeout(400);
  const after = (await marker.boundingBox())!;
  expect(Math.abs(after.x - before.x)).toBeLessThan(1);
  expect(Math.abs(after.y - before.y)).toBeLessThan(1);
});

test("clicking a cluster zooms into it, also when the whole world fits on screen", async ({ page }) => {
  await page.goto("/personen/karte");
  const marker = await visibleCluster(page);
  const markers = () =>
    page
      .locator(".maplibregl-marker")
      .evaluateAll((all) => all.map((el) => el.getAttribute("aria-label")).join("|"));
  const before = await markers();
  await marker.click();
  // Zoomed in: the clusters split up, so the markers on the map are different ones.
  await expect.poll(markers).not.toBe(before);
});

test("closing a biography leaves the map where the reader left it", async ({ page }) => {
  await page.goto("/personen/karte");
  // Zoom in until a single portrait is on screen.
  const people = page.locator("a.maplibregl-marker");
  await (await visibleCluster(page)).click();
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(800);
    if ((await onScreen(people)) >= 0) break;
    const index = await onScreen(clustersOf(page));
    expect(index).toBeGreaterThanOrEqual(0);
    await clustersOf(page).nth(index).click();
  }
  await page.waitForTimeout(800);
  const index = await onScreen(people);
  expect(index).toBeGreaterThanOrEqual(0);
  const before = await markerPositions(page);

  await people.nth(index).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  // No fit to all people afterwards: every marker stays in its place.
  await page.waitForTimeout(1000);
  expect(await markerPositions(page)).toBe(before);
});
