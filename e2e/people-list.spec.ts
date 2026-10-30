import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { overlaps, waitForHydration } from "./helpers";

test("list groups people under letter headings", async ({ page }) => {
  await page.goto("/personen/liste");
  await expect(page.getByRole("heading", { level: 1, name: "Biografien als Liste" })).toBeAttached();
  await expect(page.getByRole("heading", { level: 2, name: "A", exact: true })).toBeVisible();
  // Every person has a link with just their name as accessible name.
  await expect(page.getByRole("link", { name: "Clara Zetkin", exact: true })).toBeAttached();
});

test("the letter index jumps to a letter and follows the scrolling", async ({ page }) => {
  await page.goto("/personen/liste");
  const index = page.getByRole("navigation", { name: "Alphabet" });
  // Only letters with entries are offered: each links to its chapter heading.
  for (const link of await index.getByRole("link").all()) {
    const id = (await link.getAttribute("href"))!.slice(1);
    await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
  }
  await index.getByRole("link", { name: "Z", exact: true }).click();
  await expect(page).toHaveURL(/#buchstabe-z$/);
  const heading = page.getByRole("heading", { level: 2, name: "Z", exact: true });
  await expect(heading).toBeFocused();
  await expect(heading).toBeInViewport();
  await expect(index.getByRole("link", { name: "Z", exact: true })).toHaveAttribute("aria-current", "true");
  const axe = await new AxeBuilder({ page })
    .include('nav[aria-label="Alphabet"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);
});

test("sliding along the letter index scrolls with it (desktop)", async ({ page, isMobile }) => {
  test.skip(isMobile, "the same pointer events; Playwright drags with a mouse");
  await page.goto("/personen/liste");
  await waitForHydration(page);
  const index = page.getByRole("navigation", { name: "Alphabet" });
  const from = (await index.getByRole("link", { name: "A", exact: true }).boundingBox())!;
  const to = (await index.getByRole("link", { name: "M", exact: true }).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(page).toHaveURL(/#buchstabe-m$/);
  await expect(page.getByRole("heading", { level: 2, name: "M", exact: true })).toBeFocused();
  await expect(index.getByRole("link", { name: "M", exact: true })).toHaveAttribute("aria-current", "true");
});

test("the index at the edge covers no names in the list", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/personen/liste");
  const index = (await page.getByRole("navigation", { name: "Alphabet" }).locator("ul").boundingBox())!;
  for (const name of await page.locator("main article h3").all()) {
    const box = await name.boundingBox();
    if (box) expect(overlaps(box, index)).toBe(false);
  }
});

test("sorting the list by birth gives decade chapters and survives a biography", async ({ page }) => {
  await page.goto("/personen/liste");
  await waitForHydration(page);
  // Right after loading, WebKit can still drop the change event: retry until it applies.
  await expect(async () => {
    await page.getByLabel("Sortieren").selectOption("born");
    await expect(page).toHaveURL(/sort=born$/, { timeout: 1000 });
  }).toPass();
  const headings = page.locator("main h2");
  await expect(headings.first()).toHaveText(/^\d{4}er$/);
  const first = (await headings.allTextContents())
    .filter((t) => /^\d{4}er$/.test(t))
    .map((t) => Number(t.slice(0, 4)));
  expect(first).toEqual([...first].sort((x, y) => x - y));
  // Opening and closing a biography keeps the order.
  await page.locator("main article a[data-person]").first().click();
  await page.getByRole("link", { name: "Schließen" }).click();
  await expect(page).toHaveURL(/\/personen\/liste\?sort=born$/);
  await expect(page.getByLabel("Sortieren")).toHaveValue("born");
});

test("the view switch shows the active view and opens a dropdown to change it", async ({
  page,
  isMobile,
}) => {
  await page.goto("/personen");
  const button = page.getByRole("button", { name: "Ansicht: Mosaik" });
  await expect(button).toHaveAttribute("aria-expanded", "false");
  // Phones are tapped, like real devices.
  await (isMobile ? button.tap() : button.click());
  const group = page.getByRole("group", { name: "Ansicht" });
  await expect(group.getByRole("link", { name: "Mosaik" })).toHaveAttribute("aria-current", "page");
  await expect(group.getByRole("link", { name: "Mosaik" })).toBeFocused();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  // Each view with icon and visible label; arrow keys move between them.
  await expect(group.getByRole("link")).toHaveText(["Mosaik", "Liste", "Zeitstrahl", "Karte"]);
  await page.keyboard.press("ArrowDown");
  await expect(group.getByRole("link", { name: "Liste" })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(group.getByRole("link", { name: "Mosaik" })).toBeFocused();
  const list = group.getByRole("link", { name: "Liste" });
  await (isMobile ? list.tap() : list.click());
  await expect(page).toHaveURL(/\/personen\/liste$/);
  await expect(page.getByRole("button", { name: "Ansicht: Liste" })).toBeVisible();

  // Escape closes it and returns focus to the button.
  await page.getByRole("button", { name: "Ansicht: Liste" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Ansicht: Liste" })).toBeFocused();
});

test("language switch keeps the list view", async ({ page }) => {
  await page.goto("/personen/liste");
  await page.getByRole("button", { name: "Menü" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/people\/list$/);
  await expect(page.getByRole("heading", { level: 1, name: "Biographies as a list" })).toBeAttached();
});

test("the list offers a random biography without covering any entry", async ({ page }) => {
  await page.goto("/personen/liste");
  const random = page.getByRole("button", { name: "Zufällige Biografie" });
  await expect(random).toBeVisible();
  // Never floating over the entries: it scrolls away with the line above the list.
  await page.evaluate(() => window.scrollTo(0, 2000));
  const box = await random.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box === null || box.y + box.height < 0 || box.y < 140 || box.y > viewport.height).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await random.click();
  await expect(page).toHaveURL(/\/personen\/[a-z0-9-]+$/);
});
