import { expect, test } from "@playwright/test";

import { navPillBoxes, overlaps } from "./helpers";

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

test("home button leads to the start page", async ({ page }) => {
  await page.goto("/en/about");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Home", exact: true })
    .click();
  await expect(page).toHaveURL(/\/en$/);
});

test("unknown URLs show the not-found page", async ({ page }) => {
  await page.goto("/gibt-es-nicht");
  await expect(page.getByRole("heading", { level: 1, name: "Seite nicht gefunden" })).toBeVisible();
});

test("the navigation never covers the start or end of the page content", async ({ page }) => {
  await page.goto("/ueber");
  const heading = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
  for (const pill of await navPillBoxes(page)) expect(overlaps(heading, pill)).toBe(false);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const last = (await page.locator("article p").last().boundingBox())!;
  for (const pill of await navPillBoxes(page)) expect(overlaps(last, pill)).toBe(false);
});

test("next to an open biography the navigation stays in the overview column (desktop)", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "phones show the biography as a dialog");
  await page.goto("/personen/clara-zetkin");
  const biography = (await page.locator("section[aria-labelledby='person-name']").boundingBox())!;
  for (const pill of await navPillBoxes(page)) expect(overlaps(biography, pill)).toBe(false);
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

test("Impressum and Datenschutz are in the menu and filled from the config", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Menü" }).click();
  const legal = page.getByRole("dialog", { name: "Menü" }).getByRole("navigation", { name: "Rechtliches" });
  await legal.getByRole("link", { name: "Impressum" }).click();
  await expect(page).toHaveURL(/\/impressum$/);
  await expect(page.getByRole("heading", { level: 1, name: "Impressum" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Musterstraße 1");
  await expect(page.locator("main")).not.toContainText("{{");

  await page.goto("/en/privacy");
  await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "barrierefreiheit@example.org" }).first()).toBeVisible();
  // Leichte Sprache falls back to the German text.
  await page.goto("/leichte-sprache/datenschutz");
  await expect(page.getByRole("heading", { level: 1, name: "Datenschutzerklärung" })).toBeVisible();
});

test("the start page shows who was born on this day", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 6, 5, 12));
  await page.goto("/");
  const today = page.getByRole("region", { name: "An diesem Tag" });
  await expect(today.getByRole("link", { name: /Clara Zetkin/ })).toBeVisible();
  await expect(today).toContainText("Heute vor 169 Jahren geboren");
  await expect(page.getByText("200 Personen")).toBeVisible();
});
