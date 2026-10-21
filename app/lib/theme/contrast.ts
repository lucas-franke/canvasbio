import type { ColorTokens } from "~/lib/config/schema";

/** WCAG 2.x relative luminance of a #rrggbb color. */
export function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colors (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

type TokenName = keyof ColorTokens;

export interface ContrastRequirement {
  /** Several tokens = the best of them counts (e.g. focus ring + halo). */
  foreground: TokenName | TokenName[];
  background: TokenName;
  /** 4.5 for normal text (SC 1.4.3), 3 for large text and UI components (SC 1.4.11). */
  min: 4.5 | 3;
  usage: string;
}

/**
 * Every foreground/background combination the UI actually uses.
 * New combinations in components must be added here so the build guards them.
 */
export const contrastRequirements: ContrastRequirement[] = [
  { foreground: "text", background: "page", min: 4.5, usage: "body text on page" },
  { foreground: "text", background: "surface", min: 4.5, usage: "body text on card" },
  { foreground: "emphasis", background: "page", min: 4.5, usage: "heading on page" },
  { foreground: "emphasis", background: "surface", min: 4.5, usage: "heading on card" },
  { foreground: "muted", background: "page", min: 4.5, usage: "secondary text on page" },
  { foreground: "muted", background: "surface", min: 4.5, usage: "secondary text on card" },
  { foreground: "accent", background: "page", min: 4.5, usage: "accent text/links on page" },
  { foreground: "accent", background: "surface", min: 4.5, usage: "accent text/quote on card" },
  { foreground: "accentForeground", background: "accent", min: 4.5, usage: "text on primary button" },
  { foreground: "accent", background: "surface", min: 3, usage: "primary button surface on card" },
  { foreground: "stageForeground", background: "stage", min: 4.5, usage: "text on dark stage" },
  { foreground: "accentOnStage", background: "stage", min: 4.5, usage: "wordmark on stage" },
  { foreground: "navForeground", background: "nav", min: 4.5, usage: "Navigationsleiste" },
  {
    foreground: "borderControl",
    background: "surface",
    min: 3,
    usage: "input/chip borders on card",
  },
  {
    foreground: "borderControl",
    background: "page",
    min: 3,
    usage: "input/chip borders on page",
  },
  // Focus indicator = ring + halo; one of them has to stand out on every background (SC 2.4.7/2.4.13).
  ...(["page", "surface", "stage", "nav", "accent"] as const).map((background): ContrastRequirement => ({
    foreground: ["focus", "focusHalo"],
    background,
    min: 3,
    usage: `focus indicator on ${background}`,
  })),
  { foreground: "focus", background: "focusHalo", min: 3, usage: "Fokusring gegen Halo" },
];

export interface ContrastResult extends ContrastRequirement {
  ratio: number;
  pass: boolean;
}

export function checkContrast(tokens: ColorTokens): ContrastResult[] {
  return contrastRequirements.map((req) => {
    const foregrounds = Array.isArray(req.foreground) ? req.foreground : [req.foreground];
    const ratio = Math.max(...foregrounds.map((fg) => contrastRatio(tokens[fg], tokens[req.background])));
    return { ...req, ratio, pass: ratio >= req.min };
  });
}
