import { indexLetter } from "./format";

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export interface LetterGroup<T> {
  letter: string;
  items: T[];
}

/**
 * Groups people by the first letter of their sort name ("Dohm, Hedwig" → D),
 * keeping the incoming order inside each group. Non-letters go to "#" at the end.
 */
export function groupByLetter<T extends { name: { sort: string } }>(items: T[]): LetterGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const letter = indexLetter(item.name.sort);
    groups.set(letter, [...(groups.get(letter) ?? []), item]);
  }
  return [...ALPHABET, "#"]
    .filter((l) => groups.has(l))
    .map((letter) => ({ letter, items: groups.get(letter)! }));
}
