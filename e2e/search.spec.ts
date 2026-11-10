import { expect, test, type Page } from "@playwright/test";

import { switchView, waitForHydration, peopleCount } from "./helpers";

const openPanel = async (page: Page) => {
  // "Suche", or "Suche, 3 Ergebnisse" while a search is active.
  await page.getByRole("button", { name: /^Suche(, |$)/ }).click();
  const dialog = page.getByRole("dialog", { name: "Suche" });
  await expect(dialog).toBeVisible();
  return dialog;
};

const submit = (dialog: ReturnType<Page["getByRole"]>) => dialog.locator('button[type="submit"]');

test("a name that fits exactly one person opens her biography", async ({ page }) => {
  await page.goto("/personen");
  await page.locator("[data-cell]").first().waitFor({ state: "attached" });
  const dialog = await openPanel(page);
  // On every screen: whoever opens the search wants to type.
  await expect(dialog.getByLabel("Nach Namen suchen")).toBeFocused();
  await dialog.getByLabel("Nach Namen suchen").fill("zetkin");
  await expect(submit(dialog)).toHaveText("1 Ergebnis anzeigen");
  await dialog.getByLabel("Nach Namen suchen").press("Enter");
  await expect(page).toHaveURL(/\/personen\/clara-zetkin$/);
  await expect(page.getByRole("heading", { level: 1, name: "Clara Zetkin" })).toBeFocused();
});

test("a search on the canvas highlights the matches and counts live", async ({ page }) => {
  await page.goto("/personen");
  await page.locator("[data-cell]").first().waitFor({ state: "attached" });
  const dialog = await openPanel(page);
  await dialog.getByLabel("Nach Namen suchen").fill("pankhurst");
  await expect(submit(dialog)).toHaveText("3 Ergebnisse anzeigen");
  await submit(dialog).click();

  await expect(page).toHaveURL(/\/personen\?q=pankhurst$/);
  await expect(page.getByRole("heading", { name: "Ergebnisse (3)" })).toBeVisible();
  await expect(page.locator("#main").getByRole("status").first()).toHaveText("3 Personen gefunden");
  // The matches are lifted, one of them is the tile in the tab order; the rest is dimmed.
  const tile = page.locator('[data-cell][tabindex="0"]');
  await expect(tile).toHaveAttribute("data-match", "hit");
  await expect(page.locator('[data-match="miss"]').first()).toBeAttached();
});

test("the results on the canvas and the map lead to the list with the same search", async ({ page }) => {
  for (const path of ["/personen?field=medicine", "/personen/karte?field=medicine"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: /^Ergebnisse \(\d+\)$/ })).toBeVisible();
    await page.getByRole("link", { name: "Als Liste zeigen" }).click();
    await expect(page).toHaveURL(/\/personen\/liste\?field=medicine$/);
    await expect(page.locator("main article").first()).toBeVisible();
  }
  // The list itself needs no such link.
  await expect(page.getByRole("link", { name: "Als Liste zeigen" })).toHaveCount(0);
});

test("an active search marks the search button and names the number of results", async ({ page }) => {
  await page.goto("/personen/liste");
  await waitForHydration(page);
  await expect(page.locator("[data-search-active]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Suche", exact: true })).toBeVisible();

  await page.goto("/personen/liste?field=politics");
  const results = page.getByRole("heading", { name: /^Ergebnisse \(\d+\)$/ });
  await expect(results).toBeVisible();
  const count = (await results.textContent())!.match(/\d+/)![0];
  await expect(page.locator("[data-search-active]")).toBeVisible();
  // Still there once the results bar has scrolled away (phones hide the navigation while
  // scrolling down and bring it back on the way up).
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.evaluate(() => window.scrollBy(0, -60));
  await expect(results).not.toBeInViewport();
  const button = page.getByRole("button", { name: `Suche, ${count} Ergebnisse` });
  await expect(button).toBeInViewport();
  // The panel opens with the search, as before. (From the top: on phones a click's own
  // scrolling would send the navigation away again.)
  await page.evaluate(() => window.scrollTo(0, 0));
  await button.click();
  await expect(
    page.getByRole("dialog", { name: "Suche" }).getByRole("checkbox", { name: /^Politik/ }),
  ).toBeChecked();
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
  const rows = page.locator("main article");
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
  await expect(page.locator("main article").first()).toBeVisible();
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
  await expect(page.locator("main article")).toHaveCount(0);
  await page.getByRole("button", { name: "Suche zurücksetzen" }).click();
  await expect(page).toHaveURL(/\/personen\/liste$/);
  await expect(page.locator("main article")).toHaveCount(await peopleCount(page));
});

test("the search survives opening and closing a biography and switching views", async ({ page }) => {
  await page.goto("/personen/liste?q=zetkin");
  // The pre-rendered list is unfiltered; wait until the search applies after hydration.
  await expect(page.getByRole("heading", { name: "Ergebnisse (1)" })).toBeVisible();
  await page.getByRole("link", { name: "Clara Zetkin", exact: true }).click();
  await expect(page).toHaveURL(/\/personen\/clara-zetkin\?q=zetkin$/);
  await page.getByRole("link", { name: "Schließen" }).click();
  await expect(page).toHaveURL(/\/personen\/liste\?q=zetkin$/);
  await switchView(page, "Mosaik");
  await expect(page).toHaveURL(/\/personen\?q=zetkin$/);
});

test("searching from the start page lands in the list, where the results are together", async ({ page }) => {
  await page.goto("/");
  await waitForHydration(page);
  const dialog = await openPanel(page);
  await dialog.locator("label", { hasText: "Medizin" }).click();
  await submit(dialog).click();
  await expect(page).toHaveURL(/\/personen\/liste\?field=medicine$/);
  await expect(page.getByRole("heading", { name: /^Ergebnisse \(\d+\)$/ })).toBeFocused();
});

test("with nothing entered the panel offers all, and applying it clears a search", async ({ page }) => {
  await page.goto("/personen/liste?q=pankhurst");
  await expect(page.getByRole("heading", { name: "Ergebnisse (3)" })).toBeVisible();
  const dialog = await openPanel(page);
  await dialog.getByRole("button", { name: "Zurücksetzen" }).click();
  await expect(submit(dialog)).toHaveText(`Alle ${await peopleCount(page)} anzeigen`);
  await submit(dialog).click();
  await expect(page).toHaveURL(/\/personen\/liste$/);
  await expect(page.getByRole("heading", { name: /^Ergebnisse/ })).toHaveCount(0);
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

test("name suggestions are alphabetical and lead to all matches when there are more", async ({ page }) => {
  await page.goto("/personen/liste");
  const dialog = await openPanel(page);
  await dialog.getByLabel("Nach Namen suchen").fill("clara");
  const suggestions = dialog.getByRole("region", { name: "Passende Personen" });
  const all = suggestions.getByRole("button", { name: /^Alle \d+ anzeigen$/ });
  await expect(all).toBeVisible();
  const total = Number((await all.textContent())!.match(/\d+/)![0]);
  expect(total).toBeGreaterThan(5);
  await all.click();
  await expect(page).toHaveURL(/\/personen\/liste\?q=clara$/);
  await expect(page.getByRole("heading", { name: `Ergebnisse (${total})` })).toBeFocused();
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
  // The number shown (screen readers get "12 Personen" instead).
  const shown = politics.locator("[aria-hidden=true]").last();
  const before = Number(await shown.textContent());
  expect(before).toBeGreaterThan(10);
  // Narrowing by name updates the counts live.
  await dialog.getByLabel("Nach Namen suchen").fill("zetkin");
  await expect(shown).toHaveText("1");
  await expect(dialog.getByRole("checkbox", { name: "Politik (1 Person)" })).toBeAttached();
});

test("a search keeps the wall; screen readers and arrow keys get only the matches", async ({ page }) => {
  await page.goto("/personen?q=pankhurst");
  await page.locator("[data-cell]").first().waitFor({ state: "attached" });
  // The whole shape stays (the rest is dimmed) …
  expect(await page.locator("[data-cell]").count()).toBeGreaterThanOrEqual(200);
  // … but only the three matches are exposed.
  await expect(page.locator('li:not([aria-hidden="true"]) > a[data-person]')).toHaveCount(3);
  const tile = page.locator('[data-cell][tabindex="0"]');
  await expect(tile).toHaveAttribute("data-match", "hit");
  await tile.focus();
  for (const key of ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"]) {
    await page.keyboard.press(key);
    await expect(page.locator("[data-cell]:focus")).toHaveAttribute("data-match", "hit");
  }
});

test("places with the same name stay apart: Hamburg in Germany and in the United States", async ({
  page,
}) => {
  await page.goto("/personen/liste?place=Hamburg");
  await expect(page.locator("main article h3")).toHaveText(["Clara Gertrud Wichmann"]);
  await page.goto("/personen/liste?place=Hamburg+(Vereinigte+Staaten)");
  await expect(page.locator("main article h3")).toHaveText(["A. Viola Neblett"]);
  // Both are suggested, told apart by the country.
  const dialog = await openPanel(page);
  await dialog.getByRole("combobox", { name: "Ort" }).fill("hamburg");
  const options = dialog.getByRole("listbox", { name: "Ort" }).getByRole("option");
  await expect(options.filter({ hasText: /^Hamburg/ })).toHaveCount(2);
});

test("a suggestion opened from the start page lands on the biography's name", async ({ page }) => {
  await page.goto("/");
  await waitForHydration(page);
  const dialog = await openPanel(page);
  await dialog.getByLabel("Nach Namen suchen").fill("zetkin");
  await dialog.getByRole("link", { name: /Clara Zetkin/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Clara Zetkin" })).toBeFocused();
});

test("after applying a search, focus is on the results heading", async ({ page }) => {
  await page.goto("/personen/liste");
  await waitForHydration(page);
  const dialog = await openPanel(page);
  await dialog.getByLabel("Nach Namen suchen").fill("pankhurst");
  await submit(dialog).click();
  await expect(page.getByRole("heading", { name: "Ergebnisse (3)" })).toBeFocused();
});

test("the two clear buttons in the search panel have distinct names", async ({ page }) => {
  await page.goto("/personen/liste");
  const dialog = await openPanel(page);
  await dialog.getByLabel("Nach Namen suchen").fill("a");
  await dialog.getByRole("combobox", { name: "Ort" }).fill("b");
  await expect(dialog.getByRole("button", { name: "Name löschen" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "„Ort“ löschen" })).toBeVisible();
});
