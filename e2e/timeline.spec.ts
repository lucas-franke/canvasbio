import { expect, test } from "@playwright/test";

import { switchView, waitForHydration } from "./helpers";

test("the timeline lists people by year of birth, grouped by decade", async ({ page }) => {
  await page.goto("/personen/liste");
  await switchView(page, "Zeitstrahl");
  await expect(page).toHaveURL(/\/personen\/zeitstrahl$/);
  await expect(page).toHaveTitle(/^Biografien als Zeitstrahl – /);
  await expect(page.getByRole("button", { name: "Ansicht: Zeitstrahl" })).toBeVisible();

  const decades = await page.locator("main h2").allTextContents();
  const years = decades.filter((d) => /^\d{4}er$/.test(d)).map((d) => Number(d.slice(0, 4)));
  expect(years.length).toBeGreaterThan(5);
  expect(years).toEqual([...years].sort((a, b) => a - b));

  // Within a decade, the years of birth go up.
  const firstDecade = page.locator('main section:has(h2[id^="jahrzehnt-"])').first();
  const births = (await firstDecade.locator("article").allTextContents()).map((t) =>
    Number(t.match(/(\d{4})–/)![1]),
  );
  expect(births).toEqual([...births].sort((a, b) => a - b));
});

test("opening a person from the timeline and closing returns there", async ({ page }) => {
  await page.goto("/personen/zeitstrahl");
  await page.getByRole("link", { name: "Clara Zetkin", exact: true }).click();
  await expect(page).toHaveURL(/\/personen\/clara-zetkin$/);
  await expect(page.getByRole("heading", { level: 1, name: "Clara Zetkin" })).toBeFocused();
  await page.getByRole("link", { name: "Schließen" }).click();
  await expect(page).toHaveURL(/\/personen\/zeitstrahl$/);
  await expect(page.getByRole("link", { name: "Clara Zetkin", exact: true })).toBeFocused();
});

test("the timeline follows the search and keeps it when switching views", async ({ page }) => {
  await page.goto("/personen/zeitstrahl?q=pankhurst");
  await expect(page.getByRole("heading", { name: "Ergebnisse (3)" })).toBeVisible();
  // Mother first, then the daughters by year of birth.
  await expect(page.locator("main article h3")).toHaveText([
    "Emmeline Pankhurst",
    "Christabel Pankhurst",
    "Sylvia Pankhurst",
  ]);
  await switchView(page, "Liste");
  await expect(page).toHaveURL(/\/personen\/liste\?q=pankhurst$/);
});

test("language switch keeps the timeline (desktop)", async ({ page, isMobile }) => {
  test.skip(isMobile, "same menu on phones; covered by the navigation tests");
  await page.goto("/personen/zeitstrahl");
  await page.getByRole("button", { name: "Menü" }).click();
  await page.getByRole("dialog", { name: "Menü" }).getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/people\/timeline$/);
  await expect(page.locator('main h2[id^="jahrzehnt-"]').first()).toHaveText(/^\d{4}s$/);
});

test("pointing at a person highlights who lived at the same time (desktop)", async ({ page, isMobile }) => {
  test.skip(isMobile, "hover needs a mouse");
  await page.goto("/personen/zeitstrahl");
  // Key dates are listed as text (the marks on the axis are decoration).
  await expect(page.getByRole("heading", { name: "Wichtige Daten" })).toBeVisible();
  await expect(page.getByText("Frauenwahlrecht in Deutschland")).toBeVisible();

  const bar = (name: string) =>
    page
      .locator("article")
      .filter({ has: page.getByRole("link", { name, exact: true }) })
      .locator("[aria-hidden] > span")
      .last();
  await page.getByRole("link", { name: "Clara Zetkin", exact: true }).hover();
  // Flora Tristan (1803–1844) died before Clara Zetkin (1857–1933) was born.
  await expect(bar("Flora Tristan")).toHaveCSS("opacity", "0.25");
  await expect(bar("Harriet Martineau")).toHaveCSS("opacity", "1");
});

test("the decade index jumps to a chapter and follows the scrolling", async ({ page }) => {
  await page.goto("/personen/zeitstrahl");
  const index = page.getByRole("navigation", { name: "Jahrzehnte" });
  // The index shows "1870"; screen readers hear the full label.
  const link = index.getByRole("link", { name: "1870er", exact: true });
  await expect(link).toHaveAccessibleName("1870er");
  await link.click();
  const heading = page.getByRole("heading", { level: 2, name: "1870er" });
  await expect(heading).toBeFocused();
  await expect(heading).toBeInViewport();
  await expect(link).toHaveAttribute("aria-current", "true");
  await expect(page).toHaveURL(/#jahrzehnt-1870$/);
});

test("the timeline can be sorted by year of death and by life span", async ({ page }) => {
  await page.goto("/personen/zeitstrahl?sort=died");
  await waitForHydration(page);
  await expect(page.locator('main h2[id^="tod-"]').first()).toHaveText(/^Gestorben in den \d{4}er-Jahren$/);
  await page.getByLabel("Sortieren").selectOption("age");
  await expect(page).toHaveURL(/sort=age$/);
  // Longest lives first: everyone from 100 years on in one chapter, then by decades.
  await expect(page.locator('main h2[id^="alter-"]').first()).toHaveText("100+");
  await expect(page.locator('main h2[id^="alter-"]').nth(1)).toHaveText(/^90 bis 99 Jahre alt geworden$/);
  // Unknown values come last.
  await expect(page.locator("main h2").last()).toHaveText("Lebensdauer unbekannt");
});
