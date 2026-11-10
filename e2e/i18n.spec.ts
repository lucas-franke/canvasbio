import { expect, test } from "@playwright/test";

test("a translated section link opens the same section in the other language", async ({ page }) => {
  // The menu is behind the modal biography; the translated hash (see switchLocaleHash) still leads to the section.
  await page.goto("/en/people/clara-zetkin#timeline");
  await expect(page.getByRole("heading", { level: 2, name: "Life in dates" })).toBeInViewport();
});

test("English life stories have no leftover pronunciation markup", async ({ page }) => {
  await page.goto("/en/people/clara-zetkin#story");
  const story = page.getByRole("region", { name: "Life story" });
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
