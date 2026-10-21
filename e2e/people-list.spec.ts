import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("list groups people under letter headings", async ({ page }) => {
  await page.goto("/personen/liste");
  await expect(page.getByRole("heading", { level: 1, name: "Biografien als Liste" })).toBeAttached();
  await expect(page.getByRole("heading", { level: 2, name: "A", exact: true })).toBeVisible();
  // Every person has a link with just their name as accessible name.
  await expect(page.getByRole("link", { name: "Clara Zetkin", exact: true })).toBeAttached();
});

test("A–Z index jumps to the letter section (desktop)", async ({ page, isMobile }) => {
  test.skip(isMobile, "phones use the A–Z sheet");
  await page.goto("/personen/liste");
  await page
    .getByRole("navigation", { name: "Alphabet" })
    .getByRole("link", { name: "Zu Z springen" })
    .click();
  await expect(page).toHaveURL(/#buchstabe-z$/);
  const heading = page.getByRole("heading", { level: 2, name: "Z", exact: true });
  await expect(heading).toBeInViewport();
  // The sticky index must not cover the heading it jumped to (WCAG 2.4.11).
  const [index, target] = await Promise.all([
    page.getByRole("navigation", { name: "Alphabet" }).boundingBox(),
    heading.boundingBox(),
  ]);
  expect(target!.y).toBeGreaterThanOrEqual(index!.y + index!.height);
});

test("A–Z sheet jumps to the letter section (phone)", async ({ page, isMobile }) => {
  test.skip(!isMobile, "desktop shows the index inline");
  await page.goto("/personen/liste");
  await page.getByRole("button", { name: "A–Z" }).click();
  const sheet = page.getByRole("dialog", { name: "Zu Buchstabe springen" });
  await expect(sheet).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  await sheet.getByRole("link", { name: "Zu M springen" }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/#buchstabe-m$/);
  await expect(page.getByRole("heading", { level: 2, name: "M", exact: true })).toBeInViewport();
});

test("letters without entries are not links", async ({ page, isMobile }) => {
  test.skip(isMobile, "checked on the inline index");
  await page.goto("/personen/liste");
  const index = page.getByRole("navigation", { name: "Alphabet" });
  await expect(index.getByText("Keine Einträge mit Q")).toBeAttached();
  await expect(index.getByRole("link", { name: /\bQ\b/ })).toHaveCount(0);
});

test("view toggle switches between portraits and list", async ({ page, isMobile }) => {
  await page.goto("/personen");
  const toggle = page.getByRole("group", { name: "Ansicht" });
  await expect(toggle.getByRole("link", { name: "Bilder" })).toHaveAttribute("aria-current", "page");
  // Phones are tapped, like real devices.
  const list = toggle.getByRole("link", { name: "Liste" });
  await (isMobile ? list.tap() : list.click());
  await expect(page).toHaveURL(/\/personen\/liste$/);
  await expect(
    page.getByRole("group", { name: "Ansicht" }).getByRole("link", { name: "Liste" }),
  ).toHaveAttribute("aria-current", "page");
});

test("language switch keeps the list view", async ({ page }) => {
  await page.goto("/personen/liste");
  await page.getByRole("button", { name: "Menü" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/people\/list$/);
  await expect(page.getByRole("heading", { level: 1, name: "Biographies as a list" })).toBeAttached();
});
