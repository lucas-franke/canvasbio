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
  { foreground: "text", background: "page", min: 4.5, usage: "Fließtext auf Seite" },
  { foreground: "text", background: "surface", min: 4.5, usage: "Fließtext auf Karte" },
  { foreground: "emphasis", background: "page", min: 4.5, usage: "Überschrift auf Seite" },
  { foreground: "emphasis", background: "surface", min: 4.5, usage: "Überschrift auf Karte" },
  { foreground: "muted", background: "page", min: 4.5, usage: "Nebentext auf Seite" },
  { foreground: "muted", background: "surface", min: 4.5, usage: "Nebentext auf Karte" },
  { foreground: "accent", background: "page", min: 4.5, usage: "Akzenttext/Links auf Seite" },
  { foreground: "accent", background: "surface", min: 4.5, usage: "Akzenttext/Zitat auf Karte" },
  { foreground: "accentForeground", background: "accent", min: 4.5, usage: "Text auf Primärbutton" },
  { foreground: "accent", background: "surface", min: 3, usage: "Primärbutton-Fläche auf Karte" },
  { foreground: "stageForeground", background: "stage", min: 4.5, usage: "Text auf dunkler Bühne" },
  { foreground: "accentOnStage", background: "stage", min: 4.5, usage: "Wortmarke auf Bühne" },
  { foreground: "navForeground", background: "nav", min: 4.5, usage: "Navigationsleiste" },
  {
    foreground: "borderControl",
    background: "surface",
    min: 3,
    usage: "Rahmen von Eingabefeldern/Chips auf Karte",
  },
  {
    foreground: "borderControl",
    background: "page",
    min: 3,
    usage: "Rahmen von Eingabefeldern/Chips auf Seite",
  },
  // Focus indicator = ring + halo; one of them has to stand out on every background (SC 2.4.7/2.4.13).
  ...(["page", "surface", "stage", "nav", "accent"] as const).map((background): ContrastRequirement => ({
    foreground: ["focus", "focusHalo"],
    background,
    min: 3,
    usage: `Fokusindikator auf ${background}`,
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
