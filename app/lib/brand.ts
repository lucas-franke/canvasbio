/** Monogram of the wordmark: "Ihre Stimme" → "IS", "Her Voice" → "HV", single words → first letter. */
export function brandInitials(wordmark: string): string {
  return wordmark
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}
