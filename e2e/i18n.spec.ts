import { expect, test } from "@playwright/test";

test("a translated tab link opens the same tab in the other language", async ({ page }) => {
  // The menu is behind the modal biography; the translated hash (see switchLocaleHash) still opens the tab.
  await page.goto("/en/people/clara-zetkin#timeline");
  await expect(page.getByRole("tab", { name: "Timeline" })).toHaveAttribute("aria-selected", "true");
});

test("Leichte Sprache marks who has a text in Leichte Sprache", async ({ page }) => {
  await page.goto("/leichte-sprache/personen/liste");
  const row = (name: string) => page.locator("article[data-vt-item]").filter({ hasText: name });
  await expect(row("Clara Zetkin").getByText("In Leichter Sprache")).toBeVisible();
  await expect(row("Jane Addams").getByText("In Leichter Sprache")).toHaveCount(0);
  // Not in the other languages, where every biography exists.
  await page.goto("/personen/liste");
  await expect(page.getByText("In Leichter Sprache")).toHaveCount(0);
});

test("English life stories have no leftover pronunciation markup", async ({ page }) => {
  await page.goto("/en/people/clara-zetkin#story");
  const story = page.getByRole("tabpanel", { name: "Life story" });
  await expect(story).toContainText("Clara Zetkin (née Eißner; 5 July 1857");
  await expect(story).not.toContainText("(;");
});

test("dates are formatted in the page language", async ({ page }) => {
  await page.goto("/en/people/clara-zetkin");
  await expect(page.getByText("July 5, 1857").first()).toBeVisible();
  await page.goto("/personen/clara-zetkin");
  await expect(page.getByText("5. Juli 1857").first()).toBeVisible();
});

test("the browser bar colour follows the theme", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
});
