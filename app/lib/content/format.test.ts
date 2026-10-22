import { describe, expect, it } from "vitest";

import { formatPartialDate, indexLetter, slugify, sortName, yearOf } from "./format";

describe("formatPartialDate", () => {
  it("shows only the known precision", () => {
    expect(formatPartialDate("1831-09-20", "de")).toBe("20. September 1831");
    expect(formatPartialDate("1831-09", "de")).toBe("September 1831");
    expect(formatPartialDate("1831", "de")).toBe("1831");
    expect(formatPartialDate("1831-09-20", "en")).toBe("September 20, 1831");
  });

  it("localises years before the common era", () => {
    expect(formatPartialDate("-0050", "de")).toBe("50 v. Chr.");
    expect(formatPartialDate("-0050", "en")).toBe("50 BC");
  });

  it("extracts the year", () => {
    expect(yearOf("1831-09-20")).toBe("1831");
  });
});

describe("sortName", () => {
  it("puts the family name first", () => {
    expect(sortName("Clara Zetkin")).toBe("Zetkin, Clara");
    expect(sortName("Louise Otto-Peters")).toBe("Otto-Peters, Louise");
  });

  it("keeps name particles with the given name", () => {
    expect(sortName("Bertha von Suttner")).toBe("Suttner, Bertha von");
    expect(sortName("Marie von Ebner-Eschenbach")).toBe("Ebner-Eschenbach, Marie von");
  });

  it("leaves single names alone", () => {
    expect(sortName("Colette")).toBe("Colette");
  });
});

describe("slugify", () => {
  it("transliterates German characters and strips accents", () => {
    expect(slugify("Gertrud Bäumer")).toBe("gertrud-baeumer");
    expect(slugify("Hedwig Dohm")).toBe("hedwig-dohm");
    expect(slugify("Olympe de Gouges")).toBe("olympe-de-gouges");
    expect(slugify("Ida Bøckmann")).toBe("ida-bockmann");
    expect(slugify("  Marie   Curie! ")).toBe("marie-curie");
  });
});

describe("indexLetter", () => {
  it("groups umlauts and accents under the base letter", () => {
    expect(indexLetter("Ähnlich")).toBe("A");
    expect(indexLetter("Émilie")).toBe("E");
    expect(indexLetter("zetkin")).toBe("Z");
    expect(indexLetter("1848")).toBe("#");
  });
});
