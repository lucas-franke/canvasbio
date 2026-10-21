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

test("hide names: names disappear visually, stay accessible, and the choice is remembered", async ({
  page,
}) => {
  await page.goto("/personen");
  await waitForCanvas(page);
  const toggle = page.getByRole("button", { name: "Namen ausblenden" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  const tile = page.locator('[data-cell][tabindex="0"]');
  const name = tile.locator(".canvas-tile-name");
  await expect(name).toHaveCSS("opacity", "0");
  // The link keeps its accessible name.
  await expect(tile).toHaveAccessibleName(/\S/);

  // Keyboard focus reveals the name.
  await tile.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("[data-cell]:focus .canvas-tile-name")).toHaveCSS("opacity", "1");

  await page.reload();
  await waitForCanvas(page);
  await expect(page.getByRole("button", { name: "Namen ausblenden" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
