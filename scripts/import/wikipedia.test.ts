import { describe, expect, it } from "vitest";

import { cleanExtractText } from "./wikipedia";

describe("cleanExtractText", () => {
  it.each([
    [
      "Clara Zetkin (; German: [ˈtsɛtkiːn]; née Eißner [ˈaɪsnɐ]; 5 July 1857 – 20 June 1933) was",
      "Clara Zetkin (née Eißner; 5 July 1857 – 20 June 1933) was",
    ],
    [
      "Jane Addams (; née Perkins; July 3, 1860 – August 17, 1935)",
      "Jane Addams (née Perkins; July 3, 1860 – August 17, 1935)",
    ],
    [
      "Annie Besant ['besənt] (gebürtig Annie Wood; * 1. Oktober 1847)",
      "Annie Besant (gebürtig Annie Wood; * 1. Oktober 1847)",
    ],
    ["Ellen Key (Aussprache [ˌɛlːən ˈkɛʝː], * 11. Dezember 1849 auf", "Ellen Key (* 11. Dezember 1849 auf"],
    ["George Sand ([ʒɔʁʒ sɑ̃d]) ist das Pseudonym", "George Sand ist das Pseudonym"],
    ["Marie Juchacz ([ˈjʊxatʃ]; geborene Gohlke; * 15. März", "Marie Juchacz (geborene Gohlke; * 15. März"],
    ["Ethel Mary Smyth [smaɪθ] (* 23. April 1858", "Ethel Mary Smyth (* 23. April 1858"],
    [
      "Aletta Henriëtte Jacobs (Dutch pronunciation: [aːˈlɛtaː ˈjaːkɔps]; 9 February 1854",
      "Aletta Henriëtte Jacobs (9 February 1854",
    ],
    ["George Sand (French: [ʒɔʁʒ(ə) sɑ̃d]), was", "George Sand, was"],
  ])("cleans %s", (input, expected) => {
    expect(cleanExtractText(input)).toBe(expected);
  });

  it("keeps editorial brackets and normal text", () => {
    const text =
      "„der starke Arm der Regierung […] über die Grenzen“. Auch er [Hardy] ist ihr gegenüber (1902, Berlin).";
    expect(cleanExtractText(text)).toBe(text);
    // Spaced ellipses and doubled spaces in quotes are left alone.
    const quote = "“the world ... and gambling . .”  Während sie";
    expect(cleanExtractText(quote)).toBe(quote);
    expect(cleanExtractText("S. 29 [Institut für Zeitgeschichte München – Archiv, Sign. EO 227/5].")).toBe(
      "S. 29 [Institut für Zeitgeschichte München – Archiv, Sign. EO 227/5].",
    );
  });
});
