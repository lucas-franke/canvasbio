import { expect, test, type Page } from "@playwright/test";

const waitForCanvas = (page: Page) => page.locator("[data-cell]").first().waitFor({ state: "attached" });

test("random biography from the canvas: the tile pulses, then the biography opens", async ({ page }) => {
  await page.goto("/personen");
  await waitForCanvas(page);
  await page.getByRole("button", { name: "Zufällige Biografie" }).click();
  await expect(page.locator("[data-pulse]")).toHaveCount(1);
  await expect(page).toHaveURL(/\/personen\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
});

test("with reduced motion it opens right away, without pulsing", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/personen");
  await waitForCanvas(page);
  await page.getByRole("button", { name: "Zufällige Biografie" }).click();
  await expect(page).toHaveURL(/\/personen\/[a-z0-9-]+$/, { timeout: 1000 });
  await expect(page.locator("[data-pulse]")).toHaveCount(0);
});

test("with a search, the random pick comes from the results", async ({ page }) => {
  await page.goto("/personen?q=zetkin");
  await waitForCanvas(page);
  await page.getByRole("button", { name: "Zufällige Biografie" }).click();
  await expect(page).toHaveURL(/\/personen\/clara-zetkin\?q=zetkin$/);

  await page.goto("/personen/liste?q=zetkin");
  await expect(page.getByRole("heading", { name: "Ergebnisse (1)" })).toBeVisible();
  await page.getByRole("button", { name: "Zufällige Biografie" }).click();
  await expect(page).toHaveURL(/\/personen\/clara-zetkin\?q=zetkin$/);
});

test("no random button when the search has no results", async ({ page }) => {
  await page.goto("/personen?q=xyzxyz");
  await expect(page.getByRole("heading", { name: "Keine Personen gefunden" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Zufällige Biografie" })).toHaveCount(0);
});
