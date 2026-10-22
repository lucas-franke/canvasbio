import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { waitForHydration } from "./helpers";

test("list groups people under letter headings", async ({ page }) => {
  await page.goto("/personen/liste");
  await expect(page.getByRole("heading", { level: 1, name: "Biografien als Liste" })).toBeAttached();
  await expect(page.getByRole("heading", { level: 2, name: "A", exact: true })).toBeVisible();
  // Every person has a link with just their name as accessible name.
  await expect(page.getByRole("link", { name: "Clara Zetkin", exact: true })).toBeAttached();
});

test("wide screens: the letter rail jumps to a letter and follows the scrolling", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "phones use the chapter sheet");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/personen/liste");
  const rail = page.getByRole("navigation", { name: "Alphabet" });
  // Only letters with entries are offered.
  await expect(rail.getByRole("link", { name: "Q", exact: true })).toHaveCount(0);
  await rail.getByRole("link", { name: "Z", exact: true }).click();
  await expect(page).toHaveURL(/#buchstabe-z$/);
  const heading = page.getByRole("heading", { level: 2, name: "Z", exact: true });
  await expect(heading).toBeFocused();
  await expect(heading).toBeInViewport();
  await expect(rail.getByRole("link", { name: "Z", exact: true })).toHaveAttribute("aria-current", "true");
});

test("narrower screens: the chapter sheet jumps to a letter, the bar stays in reach", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 860 });
  await page.goto("/personen/liste");
  await page.getByRole("button", { name: "Alphabet" }).click();
  const sheet = page.getByRole("dialog", { name: "Springen zu: Alphabet" });
  await expect(sheet).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  await sheet.getByRole("link", { name: "M", exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/#buchstabe-m$/);
  const heading = page.getByRole("heading", { level: 2, name: "M", exact: true });
  await expect(heading).toBeInViewport();
  // The sticky bar (order, chapters) doesn't cover the heading it jumped to (WCAG 2.4.11).
  const bar = await page.getByRole("button", { name: "Alphabet" }).boundingBox();
  expect((await heading.boundingBox())!.y).toBeGreaterThanOrEqual(bar!.y + bar!.height);
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

test("the view switch shows the active view and unfolds to change it", async ({ page, isMobile }) => {
  await page.goto("/personen");
  const button = page.getByRole("button", { name: "Ansicht: Mosaik" });
  await expect(button).toHaveAttribute("aria-expanded", "false");
  // Phones are tapped, like real devices.
  await (isMobile ? button.tap() : button.click());
  const group = page.getByRole("group", { name: "Ansicht" });
  await expect(group.getByRole("link", { name: "Mosaik" })).toHaveAttribute("aria-current", "page");
  await expect(group.getByRole("link", { name: "Mosaik" })).toBeFocused();
  const list = group.getByRole("link", { name: "Liste" });
  await (isMobile ? list.tap() : list.click());
  await expect(page).toHaveURL(/\/personen\/liste$/);
  await expect(page.getByRole("button", { name: "Ansicht: Liste" })).toBeVisible();

  // Escape folds it again and returns focus to the button.
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
  // Never floating over the entries: it scrolls away, or rides in the slim bar at the top.
  await page.evaluate(() => window.scrollTo(0, 2000));
  const box = await random.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box === null || box.y + box.height < 0 || box.y < 140 || box.y > viewport.height).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await random.click();
  await expect(page).toHaveURL(/\/personen\/[a-z0-9-]+$/);
});
