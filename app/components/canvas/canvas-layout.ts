import { siteConfig } from "~/lib/config";
import { finiteMinZoom, type ZoomLimits } from "~/lib/canvas/camera";
import { createLayout, type CanvasLayout } from "~/lib/canvas/layout";

const { canvas: config } = siteConfig;

/**
 * The layout of the wall from site.config. Shared by the canvas and the start page backdrop,
 * so both show the same wall.
 */
export function canvasLayout(count: number): CanvasLayout {
  return createLayout(count, {
    tileSize: config.tileSize,
    gap: config.gap,
    rowOffset: config.rowOffset,
    wrap: config.wrap,
  });
}

/** Zoom limits: on a finite wall low enough for all of it to fit on a laptop screen. */
export function canvasLimits(layout: CanvasLayout): ZoomLimits {
  return { minZoom: finiteMinZoom(layout, config.minZoom), maxZoom: config.maxZoom };
}
