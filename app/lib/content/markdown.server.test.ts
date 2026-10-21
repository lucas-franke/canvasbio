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

describe("renderMarkdown headings", () => {
  it("adds unique ids and reports the headings when asked", async () => {
    const headings: { id: string; text: string; level: number }[] = [];
    const html = await renderMarkdown(
      "## Leben\n\nText[^1]\n\n## Frühe *Jahre*\n\n## Leben\n\n[^1]: Quelle.",
      {
        headingOffset: 1,
        headingIdPrefix: "story-",
        headings,
      },
    );
    expect(headings).toEqual([
      { id: "story-leben", text: "Leben", level: 3 },
      { id: "story-fruehe-jahre", text: "Frühe Jahre", level: 3 },
      { id: "story-leben-2", text: "Leben", level: 3 },
    ]);
    expect(html).toContain('<h3 id="story-leben">Leben</h3>');
    // The footnote heading keeps its own id (aria-labelledby of the footnote section).
    expect(html).toContain('id="user-content-footnote-label"');
  });
});
