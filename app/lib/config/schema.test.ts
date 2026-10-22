import { describe, expect, it } from "vitest";

import siteConfig from "../../../site.config";
import { defineSiteConfig, type SiteConfigInput } from "./schema";

const clone = (): SiteConfigInput => structuredClone(siteConfig);

describe("defineSiteConfig", () => {
  it("accepts the project config", () => {
    expect(() => defineSiteConfig(clone())).not.toThrow();
  });

  it("rejects a defaultLocale that isn't configured", () => {
    const input = clone();
    input.defaultLocale = "fr";
    expect(() => defineSiteConfig(input)).toThrow(/defaultLocale/);
  });

  it("rejects missing translations", () => {
    const input = clone();
    input.start.cta = { de: "Los" };
    expect(() => defineSiteConfig(input)).toThrow(/config\.start\.cta: en/);
  });

  it("rejects colors that aren't 6-digit hex", () => {
    const input = clone();
    input.theme.colors.light.accent = "red";
    expect(() => defineSiteConfig(input)).toThrow();
  });

  it("rejects an inverted zoom range", () => {
    const input = clone();
    input.canvas.minZoom = 3;
    expect(() => defineSiteConfig(input)).toThrow(/minZoom/);
  });
});
