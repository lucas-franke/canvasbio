import { expect, test, type Page } from "@playwright/test";

import { navPillBoxes, overlaps } from "./helpers";

/** Camera as written to the world element: translate(-x·s, -y·s) scale(s). */
async function camera(page: Page) {
  const transform = await page.locator(".canvas-world").evaluate((el) => (el as HTMLElement).style.transform);
  const [, tx, ty, s] = /translate3d\((-?[\d.e-]+)px, (-?[\d.e-]+)px, 0px\) scale\(([\d.e-]+)\)/.exec(
    transform,
  )!;
  return { tx: Number(tx), ty: Number(ty), scale: Number(s) };
}

/** Camera once inertia has stopped. */
async function settledCamera(page: Page) {
  let previous = await camera(page);
  for (;;) {
    await page.waitForTimeout(250);
    const next = await camera(page);
    if (next.tx === previous.tx && next.ty === previous.ty && next.scale === previous.scale) return next;
    previous = next;
  }
}

async function openCanvas(page: Page) {
  await page.goto("/personen");
  await page.locator("[data-cell]").first().waitFor({ state: "attached" });
  await settledCamera(page);
}

const tabbableTile = (page: Page) => page.locator('[data-cell][tabindex="0"]');

test("the finite wall shows every person exactly once, as a named list", async ({ page }) => {
  await openCanvas(page);
  // The whole wall is rendered, without repeats.
  expect(await page.locator("[data-cell]").count()).toBe(600);

  const exposed = await page
    .locator("[data-person]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-person")));
  expect(exposed).toHaveLength(600);
  expect(new Set(exposed).size).toBe(600);
  await expect(page.getByRole("list", { name: "Porträts" }).getByRole("listitem")).toHaveCount(600);
  await expect(tabbableTile(page)).toHaveCount(1);
  // Only tiles in and around the view carry a portrait; the others are named links without
  // images (cheap to zoom), so the whole list stays reachable.
  const images = await page.locator(".canvas-world img").count();
  expect(images).toBeGreaterThan(0);
  expect(images).toBeLessThan(600);
  // Duplicates (with wrap) would be hidden from assistive tech and out of the tab order.
  const hiddenFocusable = page.locator('li[aria-hidden="true"] a:not([tabindex="-1"])');
  await expect(hiddenFocusable).toHaveCount(0);
});

test("arrow keys move between portraits, the camera follows, Enter opens, focus returns", async ({
  page,
}) => {
  await openCanvas(page);
  await tabbableTile(page).focus();
  const first = await tabbableTile(page).getAttribute("data-cell");

  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowDown");
  const focused = page.locator("[data-cell]:focus");
  await expect(focused).toHaveCount(1);
  expect(await focused.getAttribute("data-cell")).not.toBe(first);
  await expect(focused).toHaveAttribute("tabindex", "0");

  // The focused tile ends up fully visible and clear of the navigation (WCAG 2.4.11).
  await page.waitForTimeout(400);
  const viewport = page.viewportSize()!;
  const box = (await focused.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  for (const pill of await navPillBoxes(page)) expect(overlaps(box, pill)).toBe(false);

  const slug = await focused.getAttribute("data-person");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/personen/${slug}$`));
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/personen$/);
  await expect(page.locator(`[data-person="${slug}"]`)).toBeFocused();
});

test("+ and − on a focused portrait zoom", async ({ page }) => {
  await openCanvas(page);
  await tabbableTile(page).focus();
  const before = (await camera(page)).scale;
  await page.keyboard.press("+");
  await expect.poll(async () => (await camera(page)).scale).toBeGreaterThan(before);
  await page.keyboard.press("-");
  await page.keyboard.press("-");
  await expect.poll(async () => (await camera(page)).scale).toBeLessThan(before);
});

test("dragging pans without opening a biography; a tap opens one", async ({ page }) => {
  await openCanvas(page);
  const before = await camera(page);
  const tile = (await tabbableTile(page).boundingBox())!;
  const start = { x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 150, start.y - 60, { steps: 8 });
  await page.mouse.up();
  const after = await settledCamera(page);
  expect(page.url()).toMatch(/\/personen$/);
  expect(after.tx).toBeLessThan(before.tx - 100);

  // Tap the portrait closest to the middle of the screen.
  const viewport = page.viewportSize()!;
  const { slug, x, y } = await page.evaluate(({ width, height }) => {
    const tiles = [...document.querySelectorAll("[data-person]")].map((el) => {
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2;
      const y = r.y + r.height / 2;
      return { slug: el.getAttribute("data-person"), x, y, d: (x - width / 2) ** 2 + (y - height / 2) ** 2 };
    });
    return tiles.sort((a, b) => a.d - b.d)[0]!;
  }, viewport);
  await page.mouse.click(x, y);
  await expect(page).toHaveURL(new RegExp(`/personen/${slug}$`));
});

test("zoom buttons work without pinching (WCAG 2.5.1)", async ({ page }) => {
  await openCanvas(page);
  const start = await camera(page);
  await page.getByRole("button", { name: "Vergrößern" }).click();
  await expect.poll(async () => (await camera(page)).scale).toBeGreaterThan(start.scale);
  await page.getByRole("button", { name: "Verkleinern" }).click();
  await page.getByRole("button", { name: "Verkleinern" }).click();
  await expect.poll(async () => (await camera(page)).scale).toBeLessThan(start.scale);
});

test("wheel pans and Ctrl + wheel zooms (desktop)", async ({ page, isMobile }) => {
  test.skip(isMobile, "no mouse wheel on phones");
  await openCanvas(page);
  const before = await camera(page);
  await page.mouse.move(600, 400);
  await page.mouse.wheel(0, 200);
  await expect.poll(async () => (await camera(page)).ty).toBeLessThan(before.ty - 100);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -200);
  await page.keyboard.up("Control");
  await expect.poll(async () => (await camera(page)).scale).toBeGreaterThan(before.scale);
});

test("the position survives a reload", async ({ page }) => {
  await openCanvas(page);
  await page.mouse.move(300, 400);
  await page.mouse.down();
  await page.mouse.move(100, 250, { steps: 6 });
  await page.mouse.up();
  const before = await settledCamera(page);
  await page.reload();
  await page.locator("[data-cell]").first().waitFor({ state: "attached" });
  const after = await camera(page);
  expect(after.tx).toBeCloseTo(before.tx, 0);
  expect(after.ty).toBeCloseTo(before.ty, 0);
});

test("skip link leads from the canvas to the list view", async ({ page }) => {
  await openCanvas(page);
  const skip = page.getByRole("link", { name: "Zur Listenansicht" });
  await expect(skip).not.toBeInViewport();
  await skip.focus();
  await expect(skip).toBeInViewport();
  await skip.press("Enter");
  await expect(page).toHaveURL(/\/personen\/liste$/);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("shows the pre-rendered centre of the wall and the way to the full list", async ({ page }) => {
    await page.goto("/personen");
    const tiles = page.locator("[data-cell]");
    expect(await tiles.count()).toBeGreaterThan(30);
    // The pre-rendered tiles are real links to the biographies.
    await expect(tiles.first()).toHaveAttribute("href", /^\/personen\/[a-z0-9-]+$/);
    // Without JavaScript the view switch shows all views right away.
    await page.getByRole("group", { name: "Ansicht" }).getByRole("link", { name: "Liste" }).click();
    await expect(page.locator("article[data-vt-item]")).toHaveCount(600);
  });
});

test("the pre-rendered wall is already zoomed for the screen: no jump at hydration", async ({ page }) => {
  await page.goto("/personen");
  // Transform as set by the inline script before hydration …
  const beforeHydration = await page
    .locator(".canvas-world")
    .evaluate((el) => (el as HTMLElement).style.transform);
  await page.waitForLoadState("networkidle");
  const after = await page.locator(".canvas-world").evaluate((el) => (el as HTMLElement).style.transform);
  // … and after the canvas took over: the same scale (the camera may differ by rounding only).
  const scale = (t: string) => Number(/scale\(([\d.]+)\)/.exec(t)?.[1]);
  expect(scale(beforeHydration)).toBeGreaterThan(0);
  expect(Math.abs(scale(after) - scale(beforeHydration))).toBeLessThan(0.001);
});

test("while a biography is open the wall is inert; a click beside the card closes it (desktop)", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "phones show the biography over the whole screen");
  await openCanvas(page);
  const tile = tabbableTile(page);
  const slug = await tile.getAttribute("data-person");
  await tile.click();
  await expect(page).toHaveURL(new RegExp(`/personen/${slug}$`));
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await expect(page.locator("main#main").locator("..")).toHaveAttribute("inert", "");
  await page.mouse.click(20, 450);
  await expect(page).toHaveURL(/\/personen$/);
  await expect(page.locator(`[data-person="${slug}"]`)).toBeFocused();
});

test("a new visit opens in the middle of the wall at reading size", async ({ page }) => {
  await openCanvas(page);
  await expect(page.locator(".canvas-world")).not.toHaveAttribute("data-far", "");
  // A tile with a person sits in the middle of the screen.
  const viewport = page.viewportSize()!;
  const middle = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest("[data-cell]") !== null,
    { x: viewport.width / 2, y: viewport.height / 2 },
  );
  expect(middle).toBe(true);
});

test("seen from afar, a tap zooms in instead of opening", async ({ page }) => {
  await openCanvas(page);
  const zoomOut = page.getByRole("button", { name: "Verkleinern" });
  for (let i = 0; i < 9; i++) await zoomOut.click();
  await expect(page.locator(".canvas-world")).toHaveAttribute("data-far", "");
  await settledCamera(page);
  const box = (await tabbableTile(page).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator(".canvas-world")).not.toHaveAttribute("data-far", "");
  expect(page.url()).toMatch(/\/personen$/);
});

test("screen readers hear first what the wall is and that the list is easier", async ({ page }) => {
  await openCanvas(page);
  await expect(page.locator("main").getByText(/Listenansicht übersichtlicher/)).toContainText(
    "Mit Screenreader ist die Listenansicht übersichtlicher",
  );
  // No extra region around the wall (the page's h1 names it).
  await expect(page.getByRole("region", { name: "Mosaik" })).toHaveCount(0);
});
