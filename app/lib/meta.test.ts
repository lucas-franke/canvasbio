import { describe, expect, it } from "vitest";

import { siteConfig } from "~/lib/config";

import { pageMeta } from "./meta";

const canonical = (path: string) =>
  pageMeta({ locale: "de", path }).find((tag) => "rel" in tag && tag.rel === "canonical");

describe.runIf(siteConfig.siteUrl)("pageMeta canonical URL", () => {
  it("is the same with and without a trailing slash (pre-render vs. browser)", () => {
    expect(canonical("/personen/clara-zetkin")).toEqual(canonical("/personen/clara-zetkin/"));
  });

  it("uses the folder form that static hosts redirect to", () => {
    expect(canonical("/personen/clara-zetkin")).toMatchObject({
      href: new URL("/personen/clara-zetkin/", siteConfig.siteUrl).href,
    });
  });

  it("keeps the root as it is", () => {
    expect(canonical("/")).toMatchObject({ href: new URL("/", siteConfig.siteUrl).href });
  });
});
