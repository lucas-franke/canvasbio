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
  await expect(page.getByRole("heading", { level: 2, name: "Biografie", exact: true })).toBeHidden();

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

test("on phones closing and the tabs stay in reach while reading", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the sticky bar matters in the full-screen dialog");
  await page.goto("/personen/clara-zetkin#geschichte");
  await page.locator('[role="dialog"]').evaluate((el) => el.scrollTo(0, 2000));
  await expect(page.getByRole("link", { name: "Schließen" })).toBeInViewport();
  await expect(page.getByRole("tablist", { name: "Abschnitte" })).toBeInViewport();
});

test("if the overview data can't be loaded, an error with retry is shown", async ({ page, isMobile }) => {
  test.skip(isMobile, "the overview is behind the dialog on phones");
  await page.route("**/data/people-de.json", (route) => route.abort());
  await page.goto("/personen/clara-zetkin");
  const alert = page.getByRole("alert").filter({ hasText: "Die Übersicht konnte nicht geladen werden" });
  await expect(alert).toBeVisible();
  await page.unroute("**/data/people-de.json");
  await alert.getByRole("button", { name: "Erneut versuchen" }).click();
  await expect(page.locator("[data-cell]").first()).toBeAttached();
});

test("previous and next continue in list order", async ({ page }) => {
  await page.goto("/personen/liste?q=clara");
  await expect(page.getByRole("heading", { name: /^Ergebnisse/ })).toBeVisible();
  await page.getByRole("link", { name: "Clara Zetkin", exact: true }).click();
  const more = page.getByRole("navigation", { name: "Weitere Biografien" });
  // Within the search results: the next one is also a "Clara".
  await more.getByRole("link", { name: /Nächste/ }).click();
  await expect(page).toHaveURL(/\/personen\/[a-z-]+\?q=clara$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Clara|Klara|Klára/);
});

test("closing animation ends off screen and stays there (no flash)", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "checks the view transition animations in Chromium");
  await page.goto("/personen/liste");
  await page.getByRole("link", { name: "Clara Zetkin", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Clara Zetkin" })).toBeFocused();
  // Record the fill mode of the closing panel's animation once the transition is ready.
  await page.evaluate(() => {
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((...args: Parameters<typeof start>) => {
      const transition = start(...args);
      void transition.ready.then(() => {
        (window as unknown as { fills: string[] }).fills = document
          .getAnimations()
          .filter((a) => (a.effect as KeyframeEffect).pseudoElement?.includes("old(detail-panel)"))
          .map((a) => String(a.effect!.getComputedTiming().fill));
      });
      return transition;
    }) as typeof document.startViewTransition;
  });
  await page.getByRole("link", { name: "Schließen" }).click();
  const fills = await page.waitForFunction(() => (window as unknown as { fills?: string[] }).fills);
  expect(await fills.jsonValue()).toEqual(["forwards"]);
});

test("related biographies link to people with something in common", async ({ page }) => {
  await page.goto("/personen/liste");
  await page.getByRole("link", { name: "Clara Zetkin", exact: true }).click();
  await expect(heading(page, "Clara Zetkin")).toBeFocused();
  const related = page.getByRole("region", { name: "Ähnliche Biografien" });
  const links = related.getByRole("link");
  await expect(links).toHaveCount(4);
  // Each entry says why it is related (a shared field, place or era).
  await expect(links.first()).toContainText(/\d{4}.*·/);
  const name = (await links.first().locator(".font-heading").textContent())!;
  await links.first().click();
  await expect(heading(page, name)).toBeFocused();
});

test("life story shows reading time and a table of contents for longer stories", async ({ page }) => {
  await page.goto("/personen/ada-wells#geschichte");
  const panel = page.getByRole("tabpanel", { name: "Lebensgeschichte" });
  // 742 words at 200 words per minute.
  await expect(panel.getByText("4 Minuten Lesezeit")).toBeVisible();
  const outline = panel.getByRole("navigation", { name: "Inhalt" });
  const entries = outline.getByRole("link");
  expect(await entries.count()).toBeGreaterThanOrEqual(3);

  const target = (await entries.nth(1).textContent())!;
  await entries.nth(1).click();
  // Jumps without changing the tab (the hash selects tabs) and moves focus to the section.
  await expect(page).toHaveURL(/#geschichte$/);
  await expect(panel.getByRole("heading", { name: target, exact: true })).toBeFocused();
  await expect(panel.getByRole("heading", { name: target, exact: true })).toBeInViewport();
});

test("printing a biography prints all sections without navigation", async ({ page, isMobile }) => {
  test.skip(isMobile, "print layout is the same on every device");
  await page.goto("/personen/clara-zetkin");
  await expect(heading(page, "Clara Zetkin")).toBeVisible();
  await page.emulateMedia({ media: "print" });
  for (const name of ["Biografie", "Lebensgeschichte", "Lebenslauf"]) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("navigation", { name: "Hauptnavigation" })).toBeHidden();
  await expect(page.getByRole("tablist")).toBeHidden();
  await expect(page.locator("#main")).toBeHidden();
});

test("swiping the biography sheet down closes it (phones)", async ({ page, browserName, isMobile }) => {
  test.skip(!isMobile || browserName !== "chromium", "touch input via CDP (Chromium phone)");
  await page.goto("/personen/liste");
  await page.getByRole("link", { name: "Helen Keller", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Helen Keller" });
  await expect(dialog).toBeVisible();

  const cdp = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", y: number) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x: 200, y }],
    });
  // A short pull springs back.
  await touch("touchStart", 300);
  await touch("touchMove", 315);
  await touch("touchMove", 330);
  await touch("touchEnd", 330);
  await page.waitForTimeout(400);
  await expect(dialog).toBeVisible();

  await touch("touchStart", 300);
  for (let y = 320; y <= 600; y += 40) await touch("touchMove", y);
  await touch("touchEnd", 600);
  await expect(page).toHaveURL(/\/personen\/liste$/);
  await expect(dialog).toBeHidden();
});
