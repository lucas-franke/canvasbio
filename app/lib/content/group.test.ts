import { describe, expect, it } from "vitest";

import { groupByLetter } from "./group";

const person = (sort: string) => ({ name: { sort } });

describe("groupByLetter", () => {
  it("groups by first letter in alphabetical order", () => {
    const groups = groupByLetter([
      person("Zetkin, Clara"),
      person("Augspurg, Anita"),
      person("Anthony, Susan"),
    ]);
    expect(groups.map((g) => g.letter)).toEqual(["A", "Z"]);
    expect(groups[0].items.map((p) => p.name.sort)).toEqual(["Augspurg, Anita", "Anthony, Susan"]);
  });

  it("puts umlauts under their base letter and non-letters last", () => {
    const groups = groupByLetter([person("Bäumer, Gertrud"), person("1848"), person("Otto-Peters, Louise")]);
    expect(groups.map((g) => g.letter)).toEqual(["B", "O", "#"]);
  });
});
