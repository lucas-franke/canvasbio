import { describe, expect, it } from "vitest";

import { cleanDescription, feminine } from "./descriptions";

describe("feminine", () => {
  it("turns masculine role words into the feminine form", () => {
    expect(feminine("Suffragette, Abstinenzler")).toBe("Suffragette, Abstinenzlerin");
    expect(feminine("Journalistin, PR-Berater")).toBe("Journalistin, PR-Beraterin");
    expect(feminine("Menschenrechtlerin, Defectologist")).toBe("Menschenrechtlerin, Defektologin");
  });

  it("leaves feminine words and compound ellipses alone", () => {
    expect(feminine("Politikerin, Aktivistin")).toBe("Politikerin, Aktivistin");
    expect(feminine("Journalistin sowie Bürger- und Frauenrechtlerin")).toBe(
      "Journalistin sowie Bürger- und Frauenrechtlerin",
    );
  });

  it("makes the adjective agree with the feminine noun", () => {
    expect(feminine("Portugiesischer Feminist")).toBe("Portugiesische Feministin");
    expect(feminine("Belgischer Politiker")).toBe("Belgische Politikerin");
    expect(feminine("Peruanischer Lehrerin und Journalistin")).toBe("Peruanische Lehrerin und Journalistin");
  });
});

describe("cleanDescription", () => {
  it("drops the person's own life dates, which the page shows anyway", () => {
    expect(cleanDescription("(1855-1934) feminist teacher", { born: "1855", died: "1934" })).toBe(
      "feminist teacher",
    );
    expect(cleanDescription("British anarchist (1854-1944), editor", { born: "1854", died: "1944" })).toBe(
      "British anarchist, editor",
    );
    expect(
      cleanDescription("Aktivistin; Krankenschwester und Wohltäterin, 1822-1913", {
        born: "1822",
        died: "1913",
      }),
    ).toBe("Aktivistin; Krankenschwester und Wohltäterin");
    expect(cleanDescription("1983-2016, Chilean activist", { born: "1983", died: "2016" })).toBe(
      "Chilean activist",
    );
    expect(cleanDescription("1840-1928", { born: "1840", died: "1928" })).toBe("");
    // Reference-book style with the name in front.
    expect(
      cleanDescription("Murray, Eunice Guthrie (1878–1960), suffragist and author", {
        born: "1878",
        died: "1960",
      }),
    ).toBe("suffragist and author");
  });

  it("keeps other year ranges, such as terms of office", () => {
    expect(
      cleanDescription("Prime Minister of Ceylon from 1960–65, 1970–77, 1994–2000", {
        born: "1916",
        died: "2000",
      }),
    ).toBe("Prime Minister of Ceylon from 1960–65, 1970–77, 1994–2000");
    expect(
      cleanDescription("United States Secretary of Labor 1933–1945", { born: "1880", died: "1965" }),
    ).toBe("United States Secretary of Labor 1933–1945");
    expect(
      cleanDescription("Survivor of the Titanic (1867–1932), activist", { born: "1867", died: "1932" }),
    ).toBe("Survivor of the Titanic, activist");
  });

  it("drops template leftovers and soft hyphens", () => {
    expect(
      cleanDescription("Chinesische Revolutionärin und Feministin | geboren: 1904 | gestorben: 1928"),
    ).toBe("Chinesische Revolutionärin und Feministin");
    expect(cleanDescription(["Ärztin, Of", "fi", "zie", "rin"].join(String.fromCharCode(0xad)))).toBe(
      "Ärztin, Offizierin",
    );
  });
});
