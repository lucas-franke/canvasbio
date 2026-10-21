import { describe, expect, it } from "vitest";

import siteConfig from "../../../site.config";
import { checkContrast, contrastRatio, relativeLuminance } from "./contrast";

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    // #767676 on white is the classic 4.5:1 boundary gray.
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#a8513e", "#fbf5e9")).toBeCloseTo(contrastRatio("#fbf5e9", "#a8513e"), 10);
  });

  it("computes relative luminance", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 10);
  });
});

describe("site theme", () => {
  it.each(["light", "dark"] as const)("meets WCAG 2.2 AA in %s mode", (mode) => {
    const failures = checkContrast(siteConfig.theme.colors[mode]).filter((r) => !r.pass);
    expect(failures).toEqual([]);
  });

  it("uses the best of focus ring and halo", () => {
    const tokens = {
      ...siteConfig.theme.colors.light,
      focus: "#000000",
      focusHalo: "#ffffff",
      stage: "#000000",
    };
    const stageFocus = checkContrast(tokens).find(
      (r) => r.background === "stage" && Array.isArray(r.foreground),
    );
    expect(stageFocus?.pass).toBe(true);
  });
});
