import { expect, test } from "@playwright/test";

const heading = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("heading", { level: 1, name, exact: true });

test("bookmarking biographies fills the bookmark list", async ({ page }) => {
  await page.goto("/personen/liste");
  for (const name of ["Clara Zetkin", "Helen Keller"]) {
    await page.getByRole("link", { name, exact: true }).click();
    await expect(heading(page, name)).toBeFocused();
    const save = page.getByRole("button", { name: "Merken" });
    await expect(save).toHaveAttribute("aria-pressed", "false");
    await save.click();
    await expect(save).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("status").filter({ hasText: "Auf die Merkliste gesetzt" })).toBeAttached();
    await page.getByRole("link", { name: "Schließen" }).click();
    await expect(page).toHaveURL(/\/personen\/liste$/);
    // Focus returns once the closing transition is done (clicking during it can crash WebKit).
    await expect(page.getByRole("link", { name, exact: true })).toBeFocused();
  }

  // The list marks saved people (for screen readers too).
  await expect(page.getByRole("heading", { level: 3, name: /^Clara Zetkin ?, Gemerkt$/ })).toBeVisible();

  await page.getByRole("button", { name: "Menü" }).click();
  await page.getByRole("dialog", { name: "Menü" }).getByRole("link", { name: "Merkliste (2)" }).click();
  await expect(page).toHaveURL(/\/personen\/liste\?saved=1$/);
  await expect(page.getByRole("heading", { name: "Ergebnisse (2)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Filter „Merkliste“ entfernen" })).toBeVisible();

  // Survives a reload; removing a bookmark updates the filtered list.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Ergebnisse (2)" })).toBeVisible();
  await page.getByRole("link", { name: "Helen Keller", exact: true }).click();
  await expect(heading(page, "Helen Keller")).toBeFocused();
  await page.getByRole("button", { name: "Merken" }).click();
  await expect(page.getByRole("button", { name: "Merken" })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("link", { name: "Schließen" }).click();
  await expect(page.getByRole("heading", { name: "Ergebnisse (1)" })).toBeVisible();
});

test("the search panel offers the bookmark filter once something is saved", async ({ page }) => {
  await page.goto("/personen/liste");
  await page.getByRole("button", { name: "Suche", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Suche" });
  await expect(panel.getByRole("checkbox", { name: /Nur gemerkte Biografien/ })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.evaluate(() => localStorage.setItem("bookmarks", JSON.stringify(["clara-zetkin"])));
  await page.reload();
  await page.getByRole("button", { name: "Suche", exact: true }).click();
  await panel.getByText("Nur gemerkte Biografien").click();
  await expect(panel.getByRole("button", { name: "1 Ergebnis anzeigen" })).toBeVisible();
  await panel.getByRole("button", { name: "1 Ergebnis anzeigen" }).click();
  await expect(page).toHaveURL(/saved=1/);
  await expect(page.getByRole("link", { name: "Clara Zetkin", exact: true })).toBeVisible();
});

test("an empty bookmark list explains how to add people", async ({ page }) => {
  await page.goto("/personen/liste?saved=1");
  await expect(page.getByRole("heading", { name: "Keine Personen gefunden" })).toBeVisible();
  await expect(page.getByText("Ihre Merkliste ist leer.")).toBeVisible();
});
