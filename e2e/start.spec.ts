import { expect, test, type Page } from "@playwright/test";

import { switchView } from "./helpers";

const worldTransform = (page: Page) =>
  page
    .locator(".canvas-world")
    .first()
    .evaluate((el) => (el as HTMLElement).style.transform);

const translation = (transform: string) =>
  transform
    .match(/-?\d+(\.\d+)?/g)!
    .slice(0, 2)
    .map(Number);

test("the start page shows the living wall as a decorative backdrop", async ({ page }) => {
  await page.goto("/");
  const backdrop = page.locator(".canvas-world").first().locator("xpath=ancestor::*[@inert]").first();
  await expect(backdrop).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("[data-cell]").first()).toBeAttached();
  // Nothing in it can be focused, and screen readers don't see it.
  await expect(page.getByRole("link", { name: "Clara Zetkin" })).toHaveCount(0);

  // It drifts slowly.
  const before = await worldTransform(page);
  await page.waitForTimeout(1200);
  expect(await worldTransform(page)).not.toBe(before);
});

test("light mode: the wall fades into the light page, not into a dark stage", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 240, 226)");
  await expect(page.locator("div.bg-page").first()).toHaveCSS("background-color", "rgb(247, 240, 226)");
});

test("with reduced motion the backdrop stands still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-cell]").first()).toBeAttached();
  const before = await worldTransform(page);
  await page.waitForTimeout(1200);
  expect(await worldTransform(page)).toBe(before);
});

test("discovering the biographies continues the wall right where it was", async ({ page }) => {
  await page.goto("/");
  // Once the wall drifts, the page is hydrated and the link navigates in the app.
  const start = await worldTransform(page);
  await expect.poll(() => worldTransform(page)).not.toBe(start);
  const [bx, by] = translation(await worldTransform(page));
  await page.getByRole("link", { name: /Biografien entdecken/ }).click();
  await expect(page).toHaveURL(/\/personen$/);
  // The interactive wall (not the backdrop) starts at the backdrop's position (it drifts ~10 px per second).
  const wall = page.getByRole("region", { name: "Mosaik" }).locator(".canvas-world");
  await expect(wall).toBeAttached();
  const [x, y] = translation(await wall.evaluate((el) => (el as HTMLElement).style.transform));
  expect(Math.hypot(x! - bx!, y! - by!)).toBeLessThan(20);
  expect(await page.evaluate(() => sessionStorage.getItem("canvas:continue"))).toBeNull();
  // A later, new visit (not a reload) starts in the middle again.
  await page.goto("/personen/liste");
  await switchView(page, "Mosaik");
  const fresh = page.getByRole("region", { name: "Mosaik" }).locator(".canvas-world");
  await expect(fresh).toBeAttached();
  const [cx, cy] = translation(await fresh.evaluate((el) => (el as HTMLElement).style.transform));
  expect(Math.hypot(x! - cx!, y! - cy!)).toBeGreaterThan(1);
});
