import { expect, test, type Page } from "@playwright/test";

const openPanel = async (page: Page) => {
  await page.getByRole("button", { name: "Suche", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Suche" });
  await expect(dialog).toBeVisible();
  return dialog;
};

const submit = (dialog: ReturnType<Page["getByRole"]>) => dialog.locator('button[type="submit"]');

test("name search on the canvas highlights the match and counts live", async ({ page }) => {
  await page.goto("/personen");
  await page.locator("[data-cell]").first().waitFor({ state: "attached" });
  const dialog = await openPanel(page);
  await expect(dialog.getByLabel("Nach Namen suchen")).toBeFocused();
  await dialog.getByLabel("Nach Namen suchen").fill("zetkin");
  await expect(submit(dialog)).toHaveText("1 Ergebnis anzeigen");
  await submit(dialog).click();

  await expect(page).toHaveURL(/\/personen\?q=zetkin$/);
  await expect(page.getByRole("heading", { name: "Ergebnisse (1)" })).toBeVisible();
  await expect(page.locator("#main").getByRole("status").first()).toHaveText("1 Person gefunden");
  // The match is lifted and becomes the tile in the tab order; the rest is dimmed.
  const hit = page.locator('[data-person="clara-zetkin"]');
  await expect(hit).toHaveAttribute("data-match", "hit");
  await expect(hit).toHaveAttribute("tabindex", "0");
  await expect(page.locator('[data-match="miss"]').first()).toBeAttached();
});

test("field filter narrows the list; typos and umlauts are forgiven", async ({ page }) => {
  await page.goto("/personen/liste");
  const dialog = await openPanel(page);
  await dialog.locator("label", { hasText: "Politik" }).click();
  await expect(dialog.getByRole("checkbox", { name: "Politik" })).toBeChecked();
  await submit(dialog).click();
  await expect(page).toHaveURL(/\/personen\/liste\?field=politics$/);

  const heading = page.getByRole("heading", { name: /^Ergebnisse \(\d+\)$/ });
  await expect(heading).toBeVisible();
  const rows = page.locator("article[data-vt-item]");
  const count = await rows.count();
  expect(count).toBeGreaterThan(5);
  await expect(page.getByRole("heading", { name: `Ergebnisse (${count})` })).toBeVisible();
  for (const tags of await rows.locator("ul").allTextContents()) expect(tags).toContain("Politik");

  await page.goto("/personen/liste?q=zetkni");
  await expect(page.getByRole("link", { name: "Clara Zetkin", exact: true })).toBeVisible();
  await page.goto("/personen/liste?q=stuerzl");
  await expect(page.getByRole("link", { name: "Adele Stürzl", exact: true })).toBeVisible();
});

test("place filter matches the place names", async ({ page }) => {
  await page.goto("/personen/liste?place=Berlin");
  await expect(page.getByRole("button", { name: "Filter „Berlin“ entfernen" })).toBeVisible();
  await expect(page.locator("article[data-vt-item]").first()).toBeVisible();
});

test("place suggestions work as a combobox with keyboard and pointer", async ({ page }) => {
  await page.goto("/personen/liste");
  const dialog = await openPanel(page);
  const place = dialog.getByRole("combobox", { name: "Ort" });
  const options = dialog.getByRole("listbox", { name: "Ort" }).getByRole("option");

  await place.fill("berl");
  await expect(place).toHaveAttribute("aria-expanded", "true");
  await expect(options.first()).toContainText("Berlin");
  // Keyboard: arrow to the first suggestion, Enter picks it (and doesn't submit).
  await place.press("ArrowDown");
  await expect(place).toHaveAttribute("aria-activedescendant", (await options.first().getAttribute("id"))!);
  await place.press("Enter");
  await expect(place).toHaveValue("Berlin");
  await expect(place).toHaveAttribute("aria-expanded", "false");
  await expect(dialog).toBeVisible();

  // Escape closes only the list, not the panel.
  await place.fill("ham");
  await expect(place).toHaveAttribute("aria-expanded", "true");
  await place.press("Escape");
  await expect(place).toHaveAttribute("aria-expanded", "false");
  await page.waitForTimeout(500);
  await expect(dialog).toBeVisible();

  // Pointer: pick from the list.
  await place.fill("ber");
  await options.filter({ hasText: "Berlin" }).click();
  await expect(place).toHaveValue("Berlin");
  await submit(dialog).click();
  await expect(page).toHaveURL(/place=Berlin/);
});

test("removing a filter chip updates the results and keeps focus in the bar", async ({ page }) => {
  await page.goto("/personen/liste?q=clara&field=politics");
  await page.getByRole("button", { name: "Filter „Politik“ entfernen" }).click();
  await expect(page).toHaveURL(/\/personen\/liste\?q=clara$/);
  await expect(page.getByRole("heading", { name: /^Ergebnisse \(\d+\)$/ })).toBeFocused();

  await page.getByRole("button", { name: "Filter „Name: clara“ entfernen" }).click();
  await expect(page).toHaveURL(/\/personen\/liste$/);
  await expect(page.getByRole("button", { name: "Suche", exact: true })).toBeFocused();
});

test("no results: message and reset", async ({ page }) => {
  await page.goto("/personen/liste?q=xyzxyz");
  await expect(page.getByRole("heading", { name: "Keine Personen gefunden" })).toBeVisible();
  await expect(page.locator("article[data-vt-item]")).toHaveCount(0);
  await page.getByRole("button", { name: "Suche zurücksetzen" }).click();
  await expect(page).toHaveURL(/\/personen\/liste$/);
  await expect(page.locator("article[data-vt-item]")).toHaveCount(200);
});

test("the search survives opening and closing a biography and switching views", async ({ page }) => {
  await page.goto("/personen/liste?q=zetkin");
  // The pre-rendered list is unfiltered; wait until the search applies after hydration.
  await expect(page.getByRole("heading", { name: "Ergebnisse (1)" })).toBeVisible();
  await page.getByRole("link", { name: "Clara Zetkin", exact: true }).click();
  await expect(page).toHaveURL(/\/personen\/clara-zetkin\?q=zetkin$/);
  await page.getByRole("link", { name: "Schließen" }).click();
  await expect(page).toHaveURL(/\/personen\/liste\?q=zetkin$/);
  await page.getByRole("group", { name: "Ansicht" }).getByRole("link", { name: "Bilder" }).click();
  await expect(page).toHaveURL(/\/personen\?q=zetkin$/);
});

test("searching from the start page opens the overview", async ({ page }) => {
  await page.goto("/");
  const dialog = await openPanel(page);
  await dialog.getByLabel("Nach Namen suchen").fill("dohm");
  await submit(dialog).click();
  await expect(page).toHaveURL(/\/personen\?q=dohm$/);
});

test("previous/next match move through the results on the canvas", async ({ page }) => {
  await page.goto("/personen?field=politics");
  await page.locator("[data-cell]").first().waitFor({ state: "attached" });
  await page.getByRole("button", { name: "Nächster Treffer" }).click();
  await expect(page.getByText(/^Treffer 1 von \d+: /)).toBeAttached();
  await page.getByRole("button", { name: "Nächster Treffer" }).click();
  await expect(page.getByText(/^Treffer 2 von \d+: /)).toBeAttached();
  await page.getByRole("button", { name: "Vorheriger Treffer" }).click();
  await expect(page.getByText(/^Treffer 1 von \d+: /)).toBeAttached();
});

test("typing a name suggests people to open directly", async ({ page }) => {
  await page.goto("/personen/liste");
  const dialog = await openPanel(page);
  await dialog.getByLabel("Nach Namen suchen").fill("zetk");
  const suggestions = dialog.getByRole("region", { name: "Passende Personen" });
  await suggestions.getByRole("link", { name: /Clara Zetkin/ }).click();
  await expect(page).toHaveURL(/\/personen\/clara-zetkin$/);
  await expect(page.getByRole("dialog", { name: "Suche" })).toHaveCount(0);
});

test("filter chips show how many people each would find", async ({ page }) => {
  await page.goto("/personen/liste");
  const dialog = await openPanel(page);
  const politics = dialog.locator("label", { hasText: "Politik" });
  const before = Number(await politics.locator("span").last().textContent());
  expect(before).toBeGreaterThan(10);
  // Narrowing by name updates the counts live.
  await dialog.getByLabel("Nach Namen suchen").fill("zetkin");
  await expect(politics.locator("span").last()).toHaveText("1");
});
