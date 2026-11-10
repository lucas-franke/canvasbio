import { expect, test, type Page } from "@playwright/test";

const scaleOf = (transform: string) => Number(/scale\(([\d.e-]+)\)/.exec(transform)?.[1]);

const worldTransform = (page: Page) =>
  page
    .locator(".canvas-world")
    .first()
    .evaluate((el) => (el as HTMLElement).style.transform);

test("the mosaic preview shows the living wall, decorative only", async ({ page }) => {
  await page.goto("/");
  const backdrop = page.locator(".canvas-world").first().locator("xpath=ancestor::*[@inert]").first();
  await expect(backdrop).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("[data-cell]").first()).toBeAttached();
  // Nothing in it can be focused, and screen readers don't see it.
  await expect(page.getByRole("link", { name: "Clara Zetkin" })).toHaveCount(0);

  // Its tiles lie side by side in the brick pattern, several per row (not stacked in one column).
  const { tiles, rows } = await page.locator(".canvas-world li").evaluateAll((all) => ({
    tiles: all.length,
    rows: new Set(all.map((li) => Math.round(li.getBoundingClientRect().top / 100))).size,
  }));
  expect(tiles).toBeGreaterThan(8);
  expect(rows).toBeLessThan(tiles / 2);

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
  await page.getByRole("link", { name: "Mosaik öffnen", exact: true }).click();
  await expect(page).toHaveURL(/\/personen$/);
  // The start page (with its preview wall) is gone, so this is the mosaic's own wall.
  await expect(page.getByRole("navigation", { name: "Ansichten" })).toHaveCount(0);
  const wall = page.locator("main .canvas-world");
  await expect(wall).toBeAttached();
  // Same zoom as the backdrop, and it stays put.
  const transform = await wall.evaluate((el) => (el as HTMLElement).style.transform);
  expect(scaleOf(transform)).toBeCloseTo(backdropScale, 5);
  await page.waitForTimeout(600);
  expect(await wall.evaluate((el) => (el as HTMLElement).style.transform)).toBe(transform);
  expect(await page.evaluate(() => sessionStorage.getItem("canvas:continue"))).toBeNull();
});

test("each view is one tap away from the start page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/^\d+ Biografien aus \d Kontinenten$/)).toBeVisible();
  await expect(page.getByRole("tablist")).toHaveCount(0);
  const views = page.getByRole("navigation", { name: "Ansichten" });
  await expect(views.getByRole("link")).toHaveText(["Mosaik", "Liste", "Zeitstrahl", "Karte"]);
  // With a screen reader the list is the easier one: the mosaic links say so.
  await expect(views.getByRole("link", { name: "Mosaik" })).toHaveAccessibleDescription(
    "Mit Screenreader ist die Listenansicht übersichtlicher.",
  );
  for (const [name, href] of [
    ["Liste", "/personen/liste"],
    ["Zeitstrahl", "/personen/zeitstrahl"],
    ["Karte", "/personen/karte"],
  ] as const) {
    await expect(views.getByRole("link", { name })).toHaveAttribute("href", href);
  }
  await views.getByRole("link", { name: "Liste" }).click();
  await expect(page).toHaveURL(/\/personen\/liste$/);
});

test("the preview card opens the mosaic; from 1024 px pointing at a view previews it", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  const mosaic = page.getByRole("link", { name: "Mosaik öffnen", exact: true });
  await expect(mosaic).toHaveAttribute("href", "/personen");
  // The whole preview is the button's click area.
  const card = (await mosaic.boundingBox())!;
  const button = (await mosaic.locator("span").first().boundingBox())!;
  expect(card.height).toBeGreaterThan(button.height * 3);
  if (isMobile) return;
  const views = page.getByRole("navigation", { name: "Ansichten" });
  await views.getByRole("link", { name: "Karte" }).hover();
  const map = page.getByRole("link", { name: "Karte öffnen", exact: true });
  await expect(map).toHaveAttribute("href", "/personen/karte");
  // A click in the top left corner, away from the button, opens the view as well.
  const box = (await map.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.click(box.x + 20, box.y + 20);
  await expect(page).toHaveURL(/\/personen\/karte$/);
});

test("a random biography is one more row below the anniversaries", async ({ page }) => {
  await page.goto("/");
  const anniversaries = page.getByRole("heading", { level: 2, name: /An diesem Tag|In den nächsten Tagen/ });
  await expect(anniversaries).toBeVisible();
  const random = page.getByRole("button", { name: "Zufällige Biografie", exact: true });
  await expect(random).toBeVisible();
  // Below the anniversaries, in the same column.
  const heading = (await anniversaries.boundingBox())!;
  const row = (await random.boundingBox())!;
  expect(row.y).toBeGreaterThan(heading.y);
  expect(Math.abs(row.x - heading.x)).toBeLessThan(12);
  await random.click();
  await expect(page).toHaveURL(/\/personen\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the title doesn't move when the anniversaries appear", async ({ page, browser, viewport }) => {
  // Without JavaScript the page stays as pre-rendered, i.e. with the reserved room.
  const plain = await browser.newContext({ javaScriptEnabled: false, viewport });
  const prerendered = await plain.newPage();
  await prerendered.goto("/");
  const before = await prerendered.getByRole("heading", { level: 1 }).boundingBox();
  await plain.close();

  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 2, name: /An diesem Tag|In den nächsten Tagen/ }),
  ).toBeVisible();
  const after = await page.getByRole("heading", { level: 1 }).boundingBox();
  // A few pixels at most (heading and rows are reserved, only their exact text height differs).
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(8);
});

test("over the mosaic and the map the brand sits in a pill, on the list it stands free", async ({ page }) => {
  const pill = () => page.getByRole("link", { name: "Lauter Frauen – Startseite" }).locator("xpath=..");
  for (const [path, contained] of [
    ["/personen", true],
    ["/personen/karte", true],
    ["/personen/liste", false],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(pill()).toHaveClass(contained ? /\bbg-nav\b/ : /^(?!.*\bbg-nav\b)/);
  }
  // Once the list scrolls beneath it, the brand gets its pill there too.
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect(pill()).toHaveClass(/\bbg-nav\b/);
});

test("the brand shows the full name on phones too", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  const brand = page.getByRole("link", { name: "Lauter Frauen – Startseite" });
  await expect(brand).toBeVisible();
  await expect(brand).toContainText("Lauter Frauen");
});

test("the start page names the project once (in the navigation); its title says what it is about", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Pionierinnen der Frauenbewegung aus aller Welt",
  );
  // The visible name: only the brand in the navigation, not a second time as the title.
  const visibleNames = await page
    .getByText("Lauter Frauen", { exact: true })
    .evaluateAll((all) => all.filter((el) => (el as HTMLElement).offsetParent !== null).length);
  expect(visibleNames).toBe(1);
  await expect(page).toHaveTitle(/Lauter Frauen/);
});

test("the moving preview can be paused and resumed (WCAG 2.2.2)", async ({ page }) => {
  await page.goto("/");
  const before = await worldTransform(page);
  await expect.poll(() => worldTransform(page)).not.toBe(before);
  await page.getByRole("button", { name: "Bewegung anhalten" }).click();
  const resume = page.getByRole("button", { name: "Bewegung fortsetzen" });
  await expect(resume).toBeVisible();
  // Stopped: the wall stays where it is, and the page didn't open the mosaic.
  const stopped = await worldTransform(page);
  await page.waitForTimeout(800);
  expect(await worldTransform(page)).toBe(stopped);
  await expect(page).toHaveURL(/\/$/);
  await resume.click();
  await expect.poll(() => worldTransform(page)).not.toBe(stopped);
});

test("with reduced motion there is nothing to pause", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Mosaik öffnen", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Bewegung/ })).toHaveCount(0);
});
