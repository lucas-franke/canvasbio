import { expect, test } from "@playwright/test";

import { waitForHydration } from "./helpers";

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

test("phones: the wall behind an open biography loads no portraits until it is closed", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "the sheet covers the wall on phones only");
  const thumbnails = new Set<string>();
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (/\/portraits\/[^/]+\/sq-/.test(pathname)) thumbnails.add(pathname);
  });
  await page.goto("/personen/anita-augspurg");
  await expect(heading(page, "Anita Augspurg")).toBeVisible();
  // The wall behind is there (its tiles are links), only without pictures.
  await expect(page.locator("[data-person]").first()).toBeAttached();
  await page.waitForTimeout(1500);
  // The biography's own small portraits (related people) don't count, only the wall's.
  const own = await page
    .getByRole("dialog")
    .locator("img")
    .evaluateAll((imgs) => imgs.map((img) => (img as HTMLImageElement).currentSrc).filter(Boolean));
  const ownPaths = new Set(own.map((src) => new URL(src).pathname));
  const wall = () => [...thumbnails].filter((path) => !ownPaths.has(path)).length;
  expect(wall()).toBe(0);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/personen$/);
  await expect.poll(wall).toBeGreaterThan(0);
});

/** Scrolls the biography (the sheet or card scrolls, not the page). */
const scrollBiography = (page: import("@playwright/test").Page, top: number) =>
  page.locator(".detail-scroller").evaluate((el, y) => el.scrollTo(0, y), top);

test("the biography is one page; section links jump there and name the section in the address", async ({
  page,
}) => {
  await page.goto("/personen/clara-zetkin");
  await waitForHydration(page);
  // Everything can be read without choosing a section first.
  await expect(page.getByRole("tablist")).toHaveCount(0);
  for (const name of ["Lebensgeschichte", "Lebenslauf", "Quellen"]) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
  }

  // Phones show the section links once the portrait has scrolled away.
  await scrollBiography(page, 600);
  const sections = page.getByRole("navigation", { name: "Abschnitte" });
  await sections.getByRole("link", { name: "Lebenslauf" }).click();
  await expect(page).toHaveURL(/#lebenslauf$/);
  const heading = page.getByRole("heading", { level: 2, name: "Lebenslauf", exact: true });
  await expect(heading).toBeFocused();
  await expect(heading).toBeInViewport();
  await expect(sections.getByRole("link", { name: "Lebenslauf" })).toHaveAttribute("aria-current", "true");

  await sections.getByRole("link", { name: "Überblick" }).click();
  await expect(page).toHaveURL(/\/personen\/clara-zetkin$/);
  await expect(page.getByRole("heading", { level: 1, name: "Clara Zetkin" })).toBeFocused();
});

test("a deep link with hash starts at that section", async ({ page }) => {
  await page.goto("/personen/clara-zetkin#geschichte");
  await expect(page.getByRole("heading", { level: 2, name: "Lebensgeschichte" })).toBeInViewport();
  await expect(page.getByRole("heading", { level: 2, name: "Quellen" })).toBeVisible();
});

test("a life in dates that only repeats birth and death is left out", async ({ page }) => {
  // Two entries (born, died): the key facts already say that.
  await page.goto("/personen/ada-wells");
  await expect(page.getByRole("heading", { level: 2, name: "Lebensgeschichte" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Lebenslauf" })).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Abschnitte" }).getByRole("link", { name: "Lebenslauf" }),
  ).toHaveCount(0);
});

test("unknown person shows the not-found page, which can be closed", async ({ page }) => {
  await page.goto("/personen/gibt-es-nicht");
  await expect(page.getByRole("heading", { level: 1, name: "Seite nicht gefunden" })).toBeVisible();
  await page.getByRole("link", { name: "Schließen" }).click();
  await expect(page).toHaveURL(/\/personen$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("while reading, the section links stay in reach in one opaque line with share and close", async ({
  page,
}) => {
  for (const width of [360, 375, page.viewportSize()!.width]) {
    await page.setViewportSize({ width, height: page.viewportSize()!.height });
    await page.goto("/personen/clara-zetkin#geschichte");
    await waitForHydration(page);
    const close = page.getByRole("link", { name: "Schließen" });
    const share = page.getByRole("button", { name: "Teilen" });
    const sections = page.getByRole("navigation", { name: "Abschnitte" });
    const centre = async (l: typeof close) => {
      const box = (await l.boundingBox())!;
      return box.y + box.height / 2;
    };
    // Same line once scrolled (scrolled again while the page may still reset it on load).
    await expect
      .poll(async () => {
        await scrollBiography(page, 2000);
        return Math.abs((await centre(close)) - (await centre(sections)));
      })
      .toBeLessThan(6);
    const bar = page.locator(".detail-bar");
    await expect(bar).toHaveAttribute("data-solid", "");
    // Opaque: the text below does not show through.
    expect(await bar.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toMatch(
      /, 0\)$|transparent/,
    );
    const s = (await share.boundingBox())!;
    const c = (await close.boundingBox())!;
    const n = (await sections.boundingBox())!;
    // Side by side: the links end before share, share before close.
    expect(n.x + n.width).toBeLessThanOrEqual(s.x);
    expect(s.x + s.width).toBeLessThanOrEqual(c.x);
    // From 375 px (iPhone SE) all links fit; narrower, the row scrolls sideways a little.
    if (width >= 375) expect(await sections.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
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

test("previous and next continue in list order and say which order that is", async ({ page }) => {
  await page.goto("/personen/liste");
  await page.getByRole("link", { name: "Clara Zetkin", exact: true }).click();
  const more = page.getByRole("navigation", { name: "Weitere Biografien" });
  await expect(more.getByText("Name A–Z", { exact: true })).toBeVisible();
  await expect(more.getByRole("link", { name: /Vorherige/ })).toBeVisible();
  await expect(more.getByRole("link", { name: /Nächste/ })).toBeVisible();
  await expect(more.getByRole("button", { name: "Zufällige Biografie", exact: true })).toBeVisible();
});

test("within a search, previous and next stay in the results and say so", async ({ page }) => {
  await page.goto("/personen/liste?q=clara");
  await expect(page.getByRole("heading", { name: /^Ergebnisse/ })).toBeVisible();
  await page.getByRole("link", { name: "Clara Zetkin", exact: true }).click();
  const more = page.getByRole("navigation", { name: "Weitere Biografien" });
  await expect(more.getByText(/^Sie blättern in \d+ Suchergebnissen\./)).toBeVisible();
  await expect(more.getByRole("button", { name: "Zufällige Biografie aus den Ergebnissen" })).toBeVisible();
  // Within the search results: the next one is also a "Clara".
  await more.getByRole("link", { name: /Nächste/ }).click();
  await expect(page).toHaveURL(/\/personen\/[a-z-]+\?q=clara$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Clara|Klara|Klára/);
  // The way out keeps the biography open and drops the search.
  await page
    .getByRole("navigation", { name: "Weitere Biografien" })
    .getByRole("link", { name: "Alle Biografien" })
    .click();
  await expect(page).toHaveURL(/\/personen\/[a-z-]+$/);
});

test("from the mosaic there is no previous or next: its order means nothing to a reader", async ({
  page,
}) => {
  await page.goto("/personen");
  await page.locator("[data-cell]").first().waitFor({ state: "attached" });
  await waitForHydration(page);
  await page.getByRole("button", { name: "Zufällige Biografie" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  const more = page.getByRole("navigation", { name: "Weitere Biografien" });
  await expect(more.getByRole("button", { name: "Zufällige Biografie", exact: true })).toBeVisible();
  await expect(more.getByRole("link", { name: /Vorherige|Nächste/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Ähnliche Biografien" })).toBeVisible();
});

test("closing goes back in history: the back button does not reopen the biography", async ({ page }) => {
  await page.goto("/ueber");
  await page.goto("/personen/liste");
  await waitForHydration(page);
  await page.getByRole("link", { name: "Clara Zetkin", exact: true }).click();
  await expect(heading(page, "Clara Zetkin")).toBeFocused();
  await page.getByRole("link", { name: "Schließen" }).click();
  await expect(page).toHaveURL(/\/personen\/liste$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // Back leaves the list for the page before it.
  await page.goBack();
  await expect(page).toHaveURL(/\/ueber$/);
});

test("after several biographies in a row, closing returns to the overview in one step", async ({ page }) => {
  await page.goto("/ueber");
  await page.goto("/personen/liste");
  await waitForHydration(page);
  await page.getByRole("link", { name: "Clara Zetkin", exact: true }).click();
  await expect(heading(page, "Clara Zetkin")).toBeFocused();
  const more = page.getByRole("navigation", { name: "Weitere Biografien" });
  for (let i = 0; i < 2; i++) {
    const before = page.url();
    await more.getByRole("link", { name: /Nächste/ }).click();
    await expect(page).not.toHaveURL(before);
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  }
  // The back button steps through the biographies read …
  const third = page.url();
  await page.goBack();
  await expect(page).not.toHaveURL(third);
  await expect(page.getByRole("dialog")).toBeVisible();
  // … and closing returns to the list, with the page before it one step back.
  await page.getByRole("link", { name: "Schließen" }).click();
  await expect(page).toHaveURL(/\/personen\/liste$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/ueber$/);
});

test("a biography opened directly says which collection it belongs to; closing replaces it", async ({
  page,
}) => {
  await page.goto("/ueber");
  await page.goto("/personen/clara-zetkin");
  await waitForHydration(page);
  const arrival = page.getByRole("complementary", { name: "Lauter Frauen" });
  await expect(arrival).toContainText(/Eine von \d+ Biografien bei Lauter Frauen/);
  await arrival.getByRole("link", { name: "Alle Biografien entdecken" }).click();
  await expect(page).toHaveURL(/\/personen$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/ueber$/);

  // Opened from an overview, the reader knows where they are: no such note.
  await page.goto("/personen/liste");
  await waitForHydration(page);
  await page.getByRole("link", { name: "Clara Zetkin", exact: true }).click();
  await expect(heading(page, "Clara Zetkin")).toBeFocused();
  await expect(page.getByRole("complementary", { name: "Lauter Frauen" })).toHaveCount(0);
});

test("share copies the address where there is no share sheet", async ({ page, browserName, context }) => {
  test.skip(browserName !== "chromium", "clipboard permission can only be granted in Chromium");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });
  await page.goto("/personen/clara-zetkin#lebenslauf");
  await waitForHydration(page);
  await page.getByRole("button", { name: "Teilen" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Link kopiert" })).toBeAttached();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
    /\/personen\/clara-zetkin#lebenslauf$/,
  );
});

test("closing animation ends off screen and stays there (no flash)", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName !== "chromium" || isMobile,
    "checks the view transition animations in Chromium (wide screens)",
  );
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

test("phones: the sheet slides down before it closes, without a view transition", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "the sheet only exists on phones");
  await page.goto("/personen/liste");
  await page.getByRole("link", { name: "Clara Zetkin", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Clara Zetkin" })).toBeFocused();
  await page.getByRole("link", { name: "Schließen" }).click();
  // Still open while it slides out, held at the end of its animation until it is gone.
  const dialog = page.getByRole("dialog");
  const fill = await dialog.evaluate((el) =>
    el.getAnimations().map((a) => a.effect!.getComputedTiming().fill),
  );
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

test("life story shows a table of contents for longer stories", async ({ page }) => {
  await page.goto("/personen/ada-wells#geschichte");
  const panel = page.getByRole("region", { name: "Lebensgeschichte" });
  const outline = panel.getByRole("navigation", { name: "Inhalt" });
  await expect(outline).toBeVisible();
  const entries = outline.getByRole("link");
  expect(await entries.count()).toBeGreaterThanOrEqual(3);

  const target = (await entries.nth(1).textContent())!;
  await entries.nth(1).click();
  // Jumps without changing the address (the hash names the section) and moves focus there.
  await expect(page).toHaveURL(/#geschichte$/);
  await expect(panel.getByRole("heading", { name: target, exact: true })).toBeFocused();
  await expect(panel.getByRole("heading", { name: target, exact: true })).toBeInViewport();
});

test("printing a biography prints all sections without navigation", async ({ page, isMobile }) => {
  test.skip(isMobile, "print layout is the same on every device");
  await page.goto("/personen/clara-zetkin");
  await expect(heading(page, "Clara Zetkin")).toBeVisible();
  await page.emulateMedia({ media: "print" });
  for (const name of ["Lebensgeschichte", "Lebenslauf", "Quellen"]) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("navigation", { name: "Hauptnavigation" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Abschnitte" })).toBeHidden();
  await expect(page.getByRole("link", { name: "Schließen" })).toBeHidden();
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

test("a life story only in another language says so in the page's language", async ({ page }) => {
  await page.goto("/personen/a-viola-neblett");
  await waitForHydration(page);
  await expect(page.getByText("Dieser Text liegt nur auf Englisch vor.")).toBeVisible();
  await page.goto("/en/people/a-viola-neblett");
  await expect(page.getByText(/only available in/)).toHaveCount(0);
});
