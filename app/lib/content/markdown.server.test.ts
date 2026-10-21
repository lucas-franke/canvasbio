import { describe, expect, it } from "vitest";

import { renderMarkdown } from "./markdown.server";

describe("renderMarkdown", () => {
  it("renders paragraphs and shifts headings", async () => {
    const html = await renderMarkdown("## Leben\n\nText", { headingOffset: 1 });
    expect(html).toContain("<h3>Leben</h3>");
    expect(html).toContain("<p>Text</p>");
  });

  it("caps heading levels at h6", async () => {
    expect(await renderMarkdown("###### Tief", { headingOffset: 2 })).toContain("<h6>Tief</h6>");
  });

  it("renders footnotes with a labelled section", async () => {
    const html = await renderMarkdown("Satz.[^1]\n\n[^1]: Quelle.", { footnoteLabel: "Anmerkungen" });
    expect(html).toMatch(/<sup><a href="#user-content-fn-1"/);
    expect(html).toContain("Anmerkungen");
    expect(html).toContain("Quelle.");
  });

  it("strips scripts and event handlers", async () => {
    const html = await renderMarkdown('<script>alert(1)</script><img src="x" onerror="alert(1)">\n\nOk');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
  });
});
