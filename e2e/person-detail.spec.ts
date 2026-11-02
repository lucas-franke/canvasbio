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

test("desktop: the biography is a centred dialog, a click outside closes it", async ({ page, isMobile }) => {
  test.skip(isMobile, "phones show the biography over the whole screen");
  await page.goto("/personen/liste");
  await page.getByRole("link", { name: "Helen Keller", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Helen Keller" });
  await expect(heading(page, "Helen Keller")).toBeFocused();
  const box = (await dialog.boundingBox())!;
  const viewport = page.viewportSize()!;
  // Centred in the layer it sits in (which leaves out a reserved scrollbar gutter).
  const layer = await dialog.evaluate((el) => {
    const r = el.closest(".fixed")!.getBoundingClientRect();
    return r.x + r.width / 2;
  });
  expect(Math.abs(box.x + box.width / 2 - layer)).toBeLessThan(2);
  expect(box.width).toBeLessThan(viewport.width);

  // Clicking the dimmed backdrop beside the card closes it; focus returns to the person.
  await page.mouse.click(Math.max(4, box.x / 2), viewport.height / 2);
  await expect(page).toHaveURL(/\/personen\/liste$/);
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Helen Keller", exact: true })).toBeFocused();
});

test("the biography is a modal dialog on every screen", async ({ page }) => {
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

test("unknown person shows the not-found page", async ({ page }) => {
  await page.goto("/personen/gibt-es-nicht");
  await expect(page.getByRole("heading", { level: 1, name: "Seite nicht gefunden" })).toBeVisible();
});

test("while reading, the tabs stay in reach in one line with the close button", async ({ page }) => {
  for (const width of [360, 375, page.viewportSize()!.width]) {
    await page.setViewportSize({ width, height: page.viewportSize()!.height });
    await page.goto("/personen/clara-zetkin#geschichte");
    await expect(page.getByRole("tab", { name: "Lebensgeschichte" })).toHaveAttribute("aria-selected", "true");
    const close = page.getByRole("link", { name: "Schließen" });
    const tabs = page.getByRole("tablist", { name: "Abschnitte" });
    const centre = async (l: typeof close) => {
      const box = (await l.boundingBox())!;
      return box.y + box.height / 2;
    };
    // Same line once scrolled (scrolled again while the page may still reset it on load).
    await expect
      .poll(async () => {
        await page.locator(".detail-scroller").evaluate((el) => el.scrollTo(0, 2000));
        return Math.abs((await centre(close)) - (await centre(tabs)));
      })
      .toBeLessThan(6);
    const c = (await close.boundingBox())!;
    const t = (await tabs.boundingBox())!;
    // Side by side: the tabs end before the button.
    expect(t.x + t.width).toBeLessThanOrEqual(c.x);
    // From 375 px (iPhone SE) all tabs fit; narrower, the list scrolls sideways a little.
    if (width >= 375) expect(await tabs.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
});

test("if the overview data cannot be loaded, the biography still works and closing loads the overview", async ({
  page,
}) => {
  await page.route("**/data/people-de.json", (route) => route.abort());
  await page.goto("/personen/clara-zetkin");
  // The biography is pre-rendered and readable; the overview behind it shows the error.
  await expect(heading(page, "Clara Zetkin")).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "Die Übersicht konnte nicht geladen werden" }),
  ).toBeAttached();
  // Closing navigates to the overview route, which brings its own data.
  await page.getByRole("link", { name: "Schließen" }).click();
  await expect(page.locator("[data-cell]").first()).toBeAttached();
});

test("the search panel offers a retry when the overview data cannot be loaded", async ({ page }) => {
  await page.route("**/data/people-de.json", (route) => route.abort());
  await page.goto("/ueber");
  await page.getByRole("button", { name: "Suche", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Suche" });
  const alert = panel.getByRole("alert").filter({ hasText: "Die Übersicht konnte nicht geladen werden" });
  await expect(alert).toBeVisible();
  await page.unroute("**/data/people-de.json");
  await alert.getByRole("button", { name: "Erneut versuchen" }).click();
  await expect(panel.getByLabel("Nach Namen suchen")).toBeVisible();
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

test("closing animation ends off screen and stays there (no flash)", async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== "chromium" || isMobile, "checks the view transition animations in Chromium (wide screens)");
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

test("phones: the sheet slides down before it closes, without a view transition", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the sheet only exists on phones");
  await page.goto("/personen/liste");
  await page.getByRole("link", { name: "Clara Zetkin", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Clara Zetkin" })).toBeFocused();
  await page.getByRole("link", { name: "Schließen" }).click();
  // Still open while it slides out, held at the end of its animation until it is gone.
  const dialog = page.getByRole("dialog");
  const fill = await dialog.evaluate((el) => el.getAnimations().map((a) => a.effect!.getComputedTiming().fill));
  expect(fill).toEqual(["forwards"]);
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/personen\/liste$/);
  await expect(page.getByRole("link", { name: "Clara Zetkin", exact: true })).toBeFocused();
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

test("desktop: the dialog scrolls inside its rounded card, with a thin scrollbar", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "phones show the biography over the whole screen");
  await page.goto("/personen/clara-zetkin#geschichte");
  const card = page.getByRole("dialog", { name: "Clara Zetkin" });
  const scroller = card.locator(".detail-scroller");
  // The card clips (rounded corners) and doesn't scroll itself; the inner area does.
  await expect(card).toHaveCSS("overflow-y", "hidden");
  await expect(scroller).toHaveCSS("overflow-y", "auto");
  await expect(scroller).toHaveCSS("scrollbar-width", "thin");
  expect(await scroller.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
});
