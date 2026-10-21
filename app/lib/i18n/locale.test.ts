import { describe, expect, it } from "vitest";

import {
  isListPath,
  listPath,
  localeFromPathname,
  pagePath,
  parsePath,
  switchLocaleHash,
  switchLocalePath,
} from "./locale";

describe("list view paths", () => {
  it("builds and recognizes the list view", () => {
    expect(listPath("de")).toBe("/personen/liste");
    expect(listPath("en")).toBe("/en/people/list");
    expect(isListPath("/en/people/list")).toBe(true);
    expect(isListPath("/personen")).toBe(false);
    expect(isListPath("/personen/hedwig-dohm")).toBe(false);
  });
});

describe("localeFromPathname", () => {
  it("detects prefixed locales and falls back to the default", () => {
    expect(localeFromPathname("/")).toBe("de");
    expect(localeFromPathname("/personen")).toBe("de");
    expect(localeFromPathname("/en/people")).toBe("en");
    expect(localeFromPathname("/leichte-sprache")).toBe("de-LS");
  });
});

describe("parsePath", () => {
  it("recognizes pages and trailing segments", () => {
    expect(parsePath("/")).toEqual({ locale: "de", page: "start", rest: [] });
    expect(parsePath("/en/")).toEqual({ locale: "en", page: "start", rest: [] });
    expect(parsePath("/personen/hedwig-dohm/lebenslauf")).toEqual({
      locale: "de",
      page: "people",
      rest: ["hedwig-dohm", "lebenslauf"],
    });
    expect(parsePath("/leichte-sprache/ueber")).toEqual({ locale: "de-LS", page: "about", rest: [] });
  });

  it("does not match a page segment of another locale", () => {
    expect(parsePath("/people").page).toBeNull();
  });
});

describe("pagePath", () => {
  it("builds localized URLs", () => {
    expect(pagePath("de", "start")).toBe("/");
    expect(pagePath("en", "start")).toBe("/en");
    expect(pagePath("de", "people", "hedwig-dohm")).toBe("/personen/hedwig-dohm");
    expect(pagePath("en", "about")).toBe("/en/about");
    expect(pagePath("de-LS", "people")).toBe("/leichte-sprache/personen");
  });
});

describe("switchLocalePath", () => {
  it("keeps the page and translates segments", () => {
    expect(switchLocalePath("/personen", "en")).toBe("/en/people");
    expect(switchLocalePath("/en/about", "de")).toBe("/ueber");
    expect(switchLocalePath("/en", "de-LS")).toBe("/leichte-sprache");
  });

  it("keeps the person", () => {
    expect(switchLocalePath("/en/people/hedwig-dohm", "de")).toBe("/personen/hedwig-dohm");
    expect(switchLocalePath("/personen/hedwig-dohm", "de-LS")).toBe("/leichte-sprache/personen/hedwig-dohm");
  });

  it("translates the list and timeline views", () => {
    expect(switchLocalePath("/personen/liste", "en")).toBe("/en/people/list");
    expect(switchLocalePath("/en/people/timeline", "de")).toBe("/personen/zeitstrahl");
  });

  it("translates the list sub-path", () => {
    expect(switchLocalePath("/personen/liste", "en")).toBe("/en/people/list");
    expect(switchLocalePath("/en/people/list", "de-LS")).toBe("/leichte-sprache/personen/liste");
  });

  it("falls back to the start page for unknown paths", () => {
    expect(switchLocalePath("/irgendwas", "en")).toBe("/en");
  });
});

describe("switchLocaleHash", () => {
  it("translates biography tabs and keeps other anchors", () => {
    expect(switchLocaleHash("#lebenslauf", "de", "en")).toBe("#timeline");
    expect(switchLocaleHash("#story", "en", "de-LS")).toBe("#geschichte");
    expect(switchLocaleHash("#lebenslauf", "de", "de-LS")).toBe("#jahre");
    expect(switchLocaleHash("#fn-1", "de", "en")).toBe("#fn-1");
    expect(switchLocaleHash("", "de", "en")).toBe("");
  });
});
