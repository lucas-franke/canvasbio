import { describe, expect, it } from "vitest";

import { constrainCamera, defaultScale, revealRect, screenToWorld, worldToScreen, zoomAt } from "./camera";
import { createLayout } from "./layout";

const viewport = { width: 800, height: 600 };
const limits = { minZoom: 0.4, maxZoom: 2.5 };

describe("camera", () => {
  it("converts between screen and world", () => {
    const camera = { x: 100, y: -50, scale: 2 };
    expect(worldToScreen(camera, viewport, 100, -50)).toEqual({ x: 400, y: 300 });
    const world = screenToWorld(camera, viewport, 123, 456);
    expect(worldToScreen(camera, viewport, world.x, world.y)).toEqual({ x: 123, y: 456 });
  });

  it("zooms around the pointer: the world point under it stays put", () => {
    const camera = { x: 30, y: 40, scale: 1 };
    const before = screenToWorld(camera, viewport, 600, 150);
    const zoomed = zoomAt(camera, viewport, 600, 150, 2, limits);
    expect(zoomed.scale).toBe(2);
    const after = screenToWorld(zoomed, viewport, 600, 150);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("clamps zoom to the configured limits", () => {
    const camera = { x: 0, y: 0, scale: 1 };
    expect(zoomAt(camera, viewport, 0, 0, 10, limits).scale).toBe(2.5);
    expect(zoomAt(camera, viewport, 0, 0, 0.01, limits).scale).toBe(0.4);
  });

  it("starts with three columns on a phone and more on a desktop", () => {
    const layout = createLayout(200, { tileSize: 240, gap: 32, rowOffset: 0.5, wrap: true });
    const phone = defaultScale(layout, { width: 390, height: 844 }, limits);
    const desktop = defaultScale(layout, { width: 1440, height: 900 }, limits);
    expect(390 / (layout.pitch * phone)).toBeGreaterThanOrEqual(2.5);
    expect(390 / (layout.pitch * phone)).toBeLessThanOrEqual(3.5);
    expect(1440 / (layout.pitch * desktop)).toBeGreaterThanOrEqual(5);
  });

  it("keeps the camera within the pattern without wrap", () => {
    const layout = createLayout(20, { tileSize: 100, gap: 20, rowOffset: 0.5, wrap: false });
    expect(constrainCamera(layout, { x: -500, y: 99999, scale: 1 })).toMatchObject({ x: 0 });
    const wrapping = createLayout(20, { tileSize: 100, gap: 20, rowOffset: 0.5, wrap: true });
    expect(constrainCamera(wrapping, { x: -500, y: 99999, scale: 1 })).toEqual({
      x: -500,
      y: 99999,
      scale: 1,
    });
  });
});

describe("revealRect", () => {
  const insets = { top: 80, right: 60, bottom: 100, left: 20 };
  const camera = { x: 0, y: 0, scale: 1 };

  it("doesn't move when the rectangle is already in the safe area", () => {
    expect(revealRect(camera, viewport, insets, { x: -50, y: -50, width: 100, height: 100 })).toBe(camera);
  });

  it("pans just enough to clear the bottom nav and the right controls", () => {
    // Rect spans screen x 650–750, y 450–550: under the controls and the nav.
    const moved = revealRect(camera, viewport, insets, { x: 250, y: 150, width: 100, height: 100 });
    const corner = worldToScreen(moved, viewport, 350, 250);
    expect(corner.x).toBeCloseTo(viewport.width - insets.right);
    expect(corner.y).toBeCloseTo(viewport.height - insets.bottom);
  });

  it("accounts for zoom", () => {
    const zoomed = { x: 0, y: 0, scale: 2 };
    const moved = revealRect(zoomed, viewport, insets, { x: -300, y: 0, width: 50, height: 50 });
    expect(worldToScreen(moved, viewport, -300, 0).x).toBeCloseTo(insets.left);
  });
});
