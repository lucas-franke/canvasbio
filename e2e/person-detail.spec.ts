import { expect, test } from "@playwright/test";

const heading = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("heading", { level: 1, name, exact: true });

test("opening a biography from the list keeps the list and moves focus", async ({ page }) => {
  await page.goto("/personen/liste");
  await page.getByRole("link", { name: "Clara Zetkin", exact: true }).click();
  await expect(page).toHaveURL(/\/personen\/clara-zetkin$/);
  await expect(heading(page, "Clara Zetkin")).toBeFocused();
  await expect(page).toHaveTitle(/^Clara Zetkin – /);

  await page.getByRole("link", { name: "Schließen" }).click();
  await expect(page).toHaveURL(/\/personen\/liste$/);
  // Focus returns to the person in the overview (WCAG 2.4.3).
  await expect(page.getByRole("link", { name: "Clara Zetkin", exact: true })).toBeFocused();
});

test("split view: the overview stays usable next to the biography (desktop)", async ({ page, isMobile }) => {
  test.skip(isMobile, "phones show the biography as a dialog");
  await page.goto("/personen/liste");
  await page.getByRole("link", { name: "Helen Keller", exact: true }).click();
  await expect(heading(page, "Helen Keller")).toBeVisible();
  // The opened person is marked in the overview, and another one can be opened directly.
  await expect(page.locator('[data-person="helen-keller"]')).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Anita Augspurg", exact: true }).click();
  await expect(heading(page, "Anita Augspurg")).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("small screens show the biography as a modal dialog", async ({ page, isMobile }) => {
  test.skip(!isMobile, "desktop uses the split view");
  await page.goto("/personen/liste");
  await page.getByRole("link", { name: "Helen Keller", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Helen Keller" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(page.locator("main#main").locator("..")).toHaveAttribute("inert", "");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/personen\/liste$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("direct load renders the biography and loads the overview", async ({ page, isMobile }) => {
  await page.goto("/personen/anita-augspurg");
  await expect(heading(page, "Anita Augspurg")).toBeVisible();
  if (!isMobile) {
    // The overview (portrait canvas) comes from the static JSON after hydration.
    await expect(page.locator("[data-person]").first()).toBeVisible();
  }
});

test("tabs switch sections, sync the URL hash and support arrow keys", async ({ page }) => {
  await page.goto("/personen/clara-zetkin");
  const tabs = page.getByRole("tablist", { name: "Abschnitte" });
  await expect(tabs.getByRole("tab", { name: "Biografie" })).toHaveAttribute("aria-selected", "true");

  await tabs.getByRole("tab", { name: "Lebenslauf" }).click();
  await expect(page).toHaveURL(/#lebenslauf$/);
  await expect(page.getByRole("tabpanel", { name: "Lebenslauf" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Biografie" })).toBeHidden();

  await tabs.getByRole("tab", { name: "Lebenslauf" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(tabs.getByRole("tab", { name: "Lebensgeschichte" })).toBeFocused();
});

test("a deep link with hash opens that tab", async ({ page }) => {
  await page.goto("/personen/clara-zetkin#geschichte");
  await expect(page.getByRole("tab", { name: "Lebensgeschichte" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { level: 2, name: "Lebensgeschichte" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Quellen" })).toBeVisible();
});

test("missing Leichte Sprache text shows a notice and is marked as German", async ({ page }) => {
  await page.goto("/leichte-sprache/personen/jane-addams");
  await expect(page.getByText("Diesen Text gibt es noch nicht in Leichter Sprache.")).toBeVisible();
  await page.goto("/leichte-sprache/personen/clara-zetkin");
  await expect(page.getByText("Diesen Text gibt es noch nicht")).toHaveCount(0);
  await expect(page.getByText("Clara Zetkin hat viele Jahre eine Zeitung gemacht.")).toBeAttached();
});

test("language switch keeps the biography (desktop)", async ({ page, isMobile }) => {
  // On phones the biography is a modal dialog; the menu behind it is inert until it's closed.
  test.skip(isMobile, "menu is behind the modal biography");
  await page.goto("/personen/helen-keller");
  await page.getByRole("button", { name: "Menü" }).click();
  await page.getByRole("dialog", { name: "Menü" }).getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/people\/helen-keller$/);
  await expect(heading(page, "Helen Keller")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Life story" })).toBeVisible();
});

test("unknown person shows the not-found page", async ({ page }) => {
  await page.goto("/personen/gibt-es-nicht");
  await expect(page.getByRole("heading", { level: 1, name: "Seite nicht gefunden" })).toBeVisible();
});
