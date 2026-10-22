import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { openCanvasControls } from "./helpers";

/** WCAG 2.2 AA, including the 2.1/2.2 additions (e.g. target-size). */
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const routes = [
  "/",
  "/personen",
  "/personen/liste",
  "/en/people/list",
  "/personen/zeitstrahl",
  "/en/people/timeline",
  "/leichte-sprache/personen",
  "/personen/clara-zetkin",
  "/en/people/helen-keller",
  "/leichte-sprache/personen/clara-zetkin",
  "/leichte-sprache/personen/jane-addams",
  "/ueber",
  "/en",
  "/en/about",
  "/leichte-sprache",
  "/leichte-sprache/ueber",
  "/barrierefreiheit",
  "/en/accessibility",
  "/leichte-sprache/barrierefreiheit",
  "/impressum",
  "/datenschutz",
  "/en/legal-notice",
  "/gibt-es-nicht",
  "/styleguide",
];

/**
 * Runs axe in three passes. Content scrolls underneath the fixed bottom navigation and the
 * floating random button, and axe's target-size rule then reports whatever link happens to sit
 * behind them at the current scroll position. Being covered is SC 2.4.11 (handled via padding), not target size, so target size
 * is checked separately: content targets with the floating nav hidden, nav targets on their own.
 */
async function expectNoViolations(page: Page) {
  const floatingNav =
    'nav[aria-label="Hauptnavigation"], nav[aria-label="Main navigation"], nav[aria-label="Haupt-Menü"], [data-floating]';
  const all = await new AxeBuilder({ page }).withTags(wcagTags).disableRules(["target-size"]).analyze();

  const hideNav = await page.addStyleTag({ content: `${floatingNav} { visibility: hidden !important; }` });
  const content = await new AxeBuilder({ page }).withRules(["target-size"]).analyze();
  await hideNav.evaluate((el) => (el as HTMLStyleElement).remove());
  all.violations.push(...content.violations);

  if ((await page.locator(floatingNav).count()) > 0) {
    const nav = await new AxeBuilder({ page }).withRules(["target-size"]).include(floatingNav).analyze();
    all.violations.push(...nav.violations);
  }

  const results = all;
  const summary = results.violations.map((v) => ({
    id: v.id,
    help: v.help,
    nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
  }));
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
}

for (const path of routes) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`axe: ${path} (${colorScheme}) has no WCAG 2.2 AA violations`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(path);
      if (/^\/(en\/|leichte-sprache\/)?(personen|people)$/.test(path)) {
        await page.locator("[data-cell]").first().waitFor();
      }
      await expectNoViolations(page);
    });
  }
}

/** Interactive states (panels, search, preferences), each checked in light and dark. */
const states: { name: string; run: (page: Page, isMobile: boolean) => Promise<void> }[] = [
  ...["/personen?field=politics", "/personen/liste?q=clara&field=politics", "/personen/liste?q=xyzxyz"].map(
    (path) => ({
      name: `search results ${path}`,
      run: async (page: Page) => {
        await page.goto(path);
        await expect(page.getByRole("heading", { name: /^(Ergebnisse|Keine Personen)/ })).toBeVisible();
      },
    }),
  ),
  {
    name: "open search panel",
    run: async (page) => {
      await page.goto("/personen");
      await page.getByRole("button", { name: "Suche", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Suche" })).toBeVisible();
    },
  },
  {
    name: "canvas with open direction pad",
    run: async (page, isMobile) => {
      await page.goto("/personen");
      await openCanvasControls(page, isMobile);
      await page.getByRole("button", { name: "Verschieben" }).click();
      await expect(page.getByRole("button", { name: "Nach links" })).toBeVisible();
    },
  },
  {
    name: "open menu",
    run: async (page) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Menü" }).click();
      await expect(page.getByRole("dialog", { name: "Menü" })).toBeVisible();
    },
  },
];

for (const state of states) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`axe: ${state.name} (${colorScheme}) has no WCAG 2.2 AA violations`, async ({ page, isMobile }) => {
      await page.emulateMedia({ colorScheme });
      await state.run(page, isMobile);
      await expectNoViolations(page);
    });
  }
}

test("skip link is the first focusable element and moves focus to main", async ({ page, browserName }) => {
  // WebKit only tabs to links when "Press Tab to highlight each item" is enabled.
  test.skip(browserName === "webkit", "Safari tab-to-links is an OS setting");
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Zum Inhalt springen" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("html lang follows the locale", async ({ page }) => {
  for (const [path, lang] of [
    ["/", "de"],
    ["/en", "en"],
    ["/leichte-sprache", "de"],
  ]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
  }
});

test("stored theme preference is applied before paint", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
