import { expect, test, type Page } from "@playwright/test";

const scaleOf = (transform: string) => Number(/scale\(([\d.e-]+)\)/.exec(transform)?.[1]);

const worldTransform = (page: Page) =>
  page
    .locator(".canvas-world")
    .first()
    .evaluate((el) => (el as HTMLElement).style.transform);

test("the start page shows the living wall as a decorative backdrop", async ({ page }) => {
  await page.goto("/");
  const backdrop = page.locator(".canvas-world").first().locator("xpath=ancestor::*[@inert]").first();
  await expect(backdrop).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("[data-cell]").first()).toBeAttached();
  // Nothing in it can be focused, and screen readers don't see it.
  await expect(page.getByRole("link", { name: "Clara Zetkin" })).toHaveCount(0);

  // It drifts slowly.
  const before = await worldTransform(page);
  await page.waitForTimeout(1200);
  expect(await worldTransform(page)).not.toBe(before);
});

test("light mode: the wall fades into the light page, not into a dark stage", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 240, 226)");
  await expect(page.locator("div.bg-page").first()).toHaveCSS("background-color", "rgb(247, 240, 226)");
});

test("with reduced motion the backdrop stands still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-cell]").first()).toBeAttached();
  const before = await worldTransform(page);
  await page.waitForTimeout(1200);
  expect(await worldTransform(page)).toBe(before);
});

test("the mosaic button continues the wall where it was, without a camera flight", async ({ page }) => {
  await page.goto("/");
  // Once the wall drifts, the page is hydrated and the link navigates in the app.
  const before = await worldTransform(page);
  await expect.poll(() => worldTransform(page)).not.toBe(before);
  const backdropScale = scaleOf(await worldTransform(page));
  await page.getByRole("link", { name: "Biografien entdecken", exact: true }).click();
  await expect(page).toHaveURL(/\/personen$/);
  const wall = page.locator("main .canvas-world");
  await expect(wall).toBeAttached();
  // Same zoom as the backdrop, and it stays put.
  const transform = await wall.evaluate((el) => (el as HTMLElement).style.transform);
  expect(scaleOf(transform)).toBeCloseTo(backdropScale, 5);
  await page.waitForTimeout(600);
  expect(await wall.evaluate((el) => (el as HTMLElement).style.transform)).toBe(transform);
  expect(await page.evaluate(() => sessionStorage.getItem("canvas:continue"))).toBeNull();
});

test("the start page has one main way in (the mosaic), the list next to it, and names its card only once", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText(/^\d+ Biografien aus \d Kontinenten$/)).toBeVisible();
  const main = page.getByRole("link", { name: "Biografien entdecken", exact: true });
  await expect(main).toHaveAttribute("href", "/personen");
  await expect(main).toHaveAccessibleDescription("Mit Screenreader ist die Listenansicht übersichtlicher.");
  // The other views are in the view switch of the overview, not on the card.
  await expect(page.getByRole("link", { name: "Karte", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Ihre Stimme" })).toHaveCount(0);
  await page.getByRole("link", { name: "Als Liste öffnen", exact: true }).click();
  await expect(page).toHaveURL(/\/personen\/liste$/);
});

test("the start card doesn't move when the anniversaries appear", async ({ page, browser, viewport }) => {
  // Without JavaScript the page stays as pre-rendered, i.e. with the reserved room.
  const plain = await browser.newContext({ javaScriptEnabled: false, viewport });
  const prerendered = await plain.newPage();
  await prerendered.goto("/");
  const before = await prerendered.getByRole("heading", { level: 1 }).boundingBox();
  await plain.close();

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2, name: /An diesem Tag|In den nächsten Tagen/ })).toBeVisible();
  const after = await page.getByRole("heading", { level: 1 }).boundingBox();
  // A few pixels at most (heading and rows are reserved, only their exact text height differs).
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(8);
});

test("over the mosaic and the map the brand sits in a pill, on the list it stands free", async ({ page }) => {
  const pill = () => page.getByRole("link", { name: "Ihre Stimme – Startseite" }).locator("xpath=..");
  for (const [path, contained] of [
    ["/personen", true],
    ["/personen/karte", true],
    ["/personen/liste", false],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(pill()).toHaveClass(contained ? /\bbg-nav\b/ : /^(?!.*\bbg-nav\b)/);
  }
});

test("the brand shows the full name on phones too", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  const brand = page.getByRole("link", { name: "Ihre Stimme – Startseite" });
  await expect(brand).toBeVisible();
  await expect(brand).toContainText("Ihre Stimme");
});
