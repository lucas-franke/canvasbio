import { expect, test } from "@playwright/test";

test("start page leads to the biographies", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Ihre Stimme" })).toBeVisible();
  await page.getByRole("link", { name: "Biografien entdecken" }).click();
  await expect(page).toHaveURL(/\/personen$/);
  await expect(page.getByRole("heading", { level: 1, name: "Biografien" })).toBeVisible();
});

test("language switch keeps the current page", async ({ page }) => {
  await page.goto("/ueber");
  await page.getByRole("button", { name: "Menü" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/about$/);
  await expect(page.getByRole("heading", { level: 1, name: "About the project" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("menu marks the current page and language", async ({ page }) => {
  await page.goto("/leichte-sprache/ueber");
  await page.getByRole("button", { name: "Menü" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("link", { name: "Über diese Internet-Seite" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(dialog.getByRole("link", { name: "Leichte Sprache" })).toHaveAttribute("aria-current", "page");
});

test("theme choice is applied and persisted", async ({ page }) => {
  await page.goto("/ueber");
  await page.getByRole("button", { name: "Menü" }).click();
  await page.getByRole("radio", { name: "Dunkel" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Menü" }).click();
  await page.getByRole("radio", { name: "Wie Gerät" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
});

test("back link leads to the start page", async ({ page }) => {
  await page.goto("/en/about");
  await page.getByRole("link", { name: "Back to the home page" }).click();
  await expect(page).toHaveURL(/\/en$/);
});

test("unknown URLs show the not-found page", async ({ page }) => {
  await page.goto("/gibt-es-nicht");
  await expect(page.getByRole("heading", { level: 1, name: "Seite nicht gefunden" })).toBeVisible();
});

test("bottom navigation never covers the end of the page content", async ({ page }) => {
  await page.goto("/ueber");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const lastParagraph = page.locator("article p").last();
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  const [p, n] = await Promise.all([lastParagraph.boundingBox(), nav.locator("> div").first().boundingBox()]);
  expect(p!.y + p!.height).toBeLessThanOrEqual(n!.y);
});

test("the accessibility statement is in the menu and filled from the config", async ({ page }) => {
  await page.goto("/personen/liste");
  await page.getByRole("button", { name: "Menü" }).click();
  await page.getByRole("dialog", { name: "Menü" }).getByRole("link", { name: "Barrierefreiheit" }).click();
  await expect(page).toHaveURL(/\/barrierefreiheit$/);
  await expect(page.getByRole("heading", { level: 1, name: "Erklärung zur Barrierefreiheit" })).toBeVisible();
  await expect(page.getByRole("link", { name: "barrierefreiheit@example.org" })).toHaveAttribute(
    "href",
    "mailto:barrierefreiheit@example.org",
  );
  await expect(page.getByText("21. Oktober 2026")).toBeVisible();
  await expect(page.locator("main")).not.toContainText("{{");

  await page.goto("/en/about");
  await page.getByRole("link", { name: "accessibility statement" }).click();
  await expect(page).toHaveURL(/\/en\/accessibility$/);
  await expect(page.getByText("October 21, 2026")).toBeVisible();
});
