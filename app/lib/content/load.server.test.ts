import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import siteConfig from "../../../site.config";
import { createFsContentAdapter } from "./fs-adapter.server";
import { parseFrontmatter } from "./frontmatter";
import { loadContent } from "./load.server";

const taxonomy = {
  field: { politics: { de: "Politik", en: "Politics", "de-LS": "Politik" } },
  place: { berlin: { de: "Berlin", en: "Berlin", "de-LS": "Berlin" } },
};

const person = (slug: string, overrides: Record<string, unknown> = {}) => ({
  slug,
  name: { display: "Hedwig Dohm", sort: "Dohm, Hedwig" },
  born: { date: "1831-09-20", place: "berlin" },
  portrait: {
    file: "portrait.jpg",
    credit: "Unbekannt",
    license: { name: "Public domain" },
    sourceUrl: "https://commons.wikimedia.org/wiki/File:X.jpg",
  },
  facets: { field: ["politics"], place: ["berlin"] },
  prominence: 0.5,
  sources: [{ label: "Wikidata", url: "https://www.wikidata.org/wiki/Q1" }],
  ...overrides,
});

const text = (summary = "Frauenrechtlerin") =>
  `---\nsummary: [${summary}]\nportraitAlt: Porträt\nfacts: []\ntimeline: []\n---\n\nLebensgeschichte.\n`;

let root: string;

async function addPerson(
  slug: string,
  data: object,
  files: Record<string, string> = { "de.md": text(), "en.md": text("Activist") },
  portrait = true,
) {
  const dir = path.join(root, "people", slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "person.json"), JSON.stringify(data));
  for (const [name, body] of Object.entries(files)) await writeFile(path.join(dir, name), body);
  if (portrait) await writeFile(path.join(dir, "portrait.jpg"), "");
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "canvasbio-content-"));
  await writeFile(path.join(root, "taxonomy.json"), JSON.stringify(taxonomy));
});
afterEach(() => rm(root, { recursive: true, force: true }));

describe("parseFrontmatter", () => {
  it("splits YAML and body", () => {
    expect(parseFrontmatter("---\na: 1\n---\n\nText")).toEqual({ data: { a: 1 }, body: "Text" });
  });

  it("handles CRLF line endings and a BOM", () => {
    expect(parseFrontmatter("﻿---\r\na: 1\r\n---\r\nText")).toEqual({ data: { a: 1 }, body: "Text" });
  });
});

describe("loadContent", () => {
  it("accepts valid content without issues", async () => {
    await addPerson("hedwig-dohm", person("hedwig-dohm"));
    const { people, issues } = await loadContent(root, siteConfig);
    expect(issues).toEqual([]);
    expect(people.get("hedwig-dohm")?.texts.size).toBe(2);
  });

  it("reports every problem instead of stopping at the first", async () => {
    await addPerson("wrong-folder", person("other-slug"));
    await addPerson("no-portrait", person("no-portrait"), undefined, false);
    await addPerson("bad-facet", person("bad-facet", { facets: { field: ["unknown"], color: ["red"] } }));
    await addPerson("missing-en", person("missing-en"), { "de.md": text() });
    await addPerson("bad-text", person("bad-text"), { "de.md": "---\nsummary: []\n---\n", "en.md": text() });

    const messages = (await loadContent(root, siteConfig)).issues.map((i) => `${i.file} ${i.message}`);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/slug "other-slug" does not match/),
        expect.stringMatching(/portrait "portrait.jpg" is missing/),
        expect.stringMatching(/"field.unknown" is missing from taxonomy/),
        expect.stringMatching(/facet "color" is not defined in site.config/),
        expect.stringMatching(/missing-en[\\/]en\.md required translation is missing/),
        expect.stringMatching(/bad-text[\\/]de\.md .*summary/),
      ]),
    );
  });

  it("does not require optional locales such as Leichte Sprache", async () => {
    await addPerson("hedwig-dohm", person("hedwig-dohm"));
    const { issues } = await loadContent(root, siteConfig);
    expect(issues.filter((i) => i.file.includes("de-LS"))).toEqual([]);
  });
});

describe("fs content adapter", () => {
  const image = { width: 640, height: 800, lqip: "data:image/webp;base64,", color: "#806040", hash: "abc" };
  const adapterFor = async (manifest: object) => {
    const manifestFile = path.join(root, "portraits.json");
    await writeFile(manifestFile, JSON.stringify(manifest));
    return createFsContentAdapter(root, siteConfig, manifestFile);
  };

  it("falls back to the default locale and says so", async () => {
    await addPerson("hedwig-dohm", person("hedwig-dohm"));
    const adapter = await adapterFor({ "hedwig-dohm": image });
    const easy = await adapter.getPerson("hedwig-dohm", "de-LS");
    expect(easy?.locale).toBe("de");
    expect(easy?.image).toEqual(image);
    expect((await adapter.listPeople("en"))[0].textLocale).toBe("en");
  });

  it("refuses to serve invalid content", async () => {
    await addPerson("wrong-folder", person("other-slug"));
    await expect((await adapterFor({})).listSlugs()).rejects.toThrow(/invalid/);
  });

  it("asks for build:images when portraits are missing", async () => {
    await addPerson("hedwig-dohm", person("hedwig-dohm"));
    await expect((await adapterFor({})).listSlugs()).rejects.toThrow(/build:images/);
  });
});
