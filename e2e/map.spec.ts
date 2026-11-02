import { expect, test, type Page } from "@playwright/test";

/** A cluster fully on screen, clear of the navigation at the top and the controls below. */
async function visibleCluster(page: Page) {
  const clusters = page.getByRole("button", { name: /^\d+ Biografien hier, vergrößern$/ });
  await expect(clusters.first()).toBeAttached({ timeout: 20_000 });
  // Let the opening fit (fitBounds) settle.
  await page.waitForTimeout(1000);
  const index = await clusters.evaluateAll((all) =>
    all.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return r.left > 16 && r.right < innerWidth - 72 && r.top > 120 && r.bottom < innerHeight - 200;
    }),
  );
  expect(index).toBeGreaterThanOrEqual(0);
  return clusters.nth(index);
}

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
