import { expect, test, type Page } from "@playwright/test";

/*
 * WCAG checks axe can't do on its own: reflow, text spacing, visible focus, forced colours.
 * They depend on the viewport, so they run in the desktop project only.
 */
test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, "viewport-specific checks run on desktop");
});

const pages = [
  "/",
  "/ueber",
  "/barrierefreiheit",
  "/personen",
  "/personen/liste",
  "/personen/zeitstrahl",
  "/personen/clara-zetkin",
];

async function settle(page: Page, path: string) {
  await page.goto(path);
  if (path === "/personen") await page.locator("[data-cell]").first().waitFor({ state: "attached" });
}

for (const path of pages) {
  test(`reflow: ${path} needs no horizontal scrolling at 320 px (WCAG 1.4.10)`, async ({ page }) => {
    // 320 CSS px equals 1280 px at 400 % zoom.
    await page.setViewportSize({ width: 320, height: 640 });
    await settle(page, path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    // The two navigation groups sit side by side without covering each other.
    const pills = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Hauptnavigation"]');
      const box = (selector: string) =>
        nav?.querySelector(selector)?.getBoundingClientRect().toJSON() as DOMRect;
      return nav && { start: box(":scope > div:first-child > *"), end: box(":scope > div:last-child > *") };
    });
    if (pills) expect(pills.start.right).toBeLessThanOrEqual(pills.end.left);
  });
}

/** Elements whose text is cut off: overflow hidden/clip and content larger than the box. */
async function clippedText(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((el) => {
        const style = getComputedStyle(el);
        if (!/(hidden|clip)/.test(style.overflowX + style.overflowY)) return false;
        if (style.position === "absolute" && el.clientWidth <= 1) return false; // sr-only
        // Intended: the canvas viewport clips the endless wall; long tile names end with "…"
        // (the link keeps the full name).
        if (el.closest("[data-cell]") || el.matches(".canvas-world, .canvas-world *")) return false;
        if (el.querySelector(".canvas-world")) return false;
        // Decorative duplicates: the compact name in the biography bar repeats the h1 and ends
        // with "…" when space runs out.
        if (el.closest('[aria-hidden="true"]')) return false;
        const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());
        if (!hasText) return false;
        return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
      })
      .map(
        (el) =>
          `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 3).join(".")}: ${el.textContent?.trim().slice(0, 40)}`,
      ),
  );
}

const textSpacing = `
  * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
  p { margin-bottom: 2em !important; }
`;

for (const path of pages) {
  test(`text spacing: ${path} loses no content (WCAG 1.4.12)`, async ({ page }) => {
    await settle(page, path);
    await page.addStyleTag({ content: textSpacing });
    expect(await clippedText(page)).toEqual([]);
  });
}

test("text spacing: the search panel and the menu lose no content (WCAG 1.4.12)", async ({ page }) => {
  await settle(page, "/personen");
  await page.addStyleTag({ content: textSpacing });
  await page.getByRole("button", { name: "Suche", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Suche" })).toBeVisible();
  expect(await clippedText(page)).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Menü" }).click();
  await expect(page.getByRole("dialog", { name: "Menü" })).toBeVisible();
  expect(await clippedText(page)).toEqual([]);
});

/** Whether the focused element (or its ::after, used by list rows) shows an indicator. */
async function focusIndicator(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return { name: "body", visible: false };
    const visible = (style: CSSStyleDeclaration) =>
      (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== "none";
    const name = `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}"`;
    return { name, visible: visible(getComputedStyle(el)) || visible(getComputedStyle(el, "::after")) };
  });
}

for (const path of ["/", "/personen", "/personen/liste", "/personen/clara-zetkin"]) {
  test(`keyboard: every focus stop on ${path} is visibly focused (WCAG 2.4.7)`, async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === "webkit", "Safari tab-to-links is an OS setting");
    await settle(page, path);
    const missing: string[] = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const { name, visible } = await focusIndicator(page);
      // Past the last element, focus leaves the page for the browser's own controls.
      if (name === "body") break;
      if (!visible) missing.push(name);
    }
    expect(missing).toEqual([]);
  });
}

test("forced colours (Windows high contrast): focus stays visible", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/personen/liste");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const { visible } = await focusIndicator(page);
  expect(visible).toBe(true);
});
