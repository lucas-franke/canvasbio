import type { ColorTokens, SiteConfig } from "~/lib/config/schema";

const toKebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function colorVars(tokens: ColorTokens): string {
  return Object.entries(tokens)
    .map(([name, value]) => `--c-${toKebab(name)}:${value};`)
    .join("");
}

/**
 * Turns the theme from site.config into CSS custom properties.
 * Tailwind utilities and shadcn variables in app.css only reference these,
 * so a project re-themes by editing the config alone.
 *
 * Dark mode: follows the OS unless data-theme="light|dark" overrides it — on <html>
 * for the whole page, or on any element to force a theme for that subtree.
 */
export function themeToCss(theme: SiteConfig["theme"]): string {
  const { light, dark } = theme.colors;
  const base =
    `--font-heading-family:${theme.fonts.heading};` +
    `--font-body-family:${theme.fonts.body};` +
    `--font-wordmark-family:${theme.fonts.wordmark};` +
    `--radius:${theme.radius}rem;` +
    (theme.portraitTint
      ? `--tint-color:${theme.portraitTint.color ?? "var(--c-accent)"};` +
        `--tint-blend:${theme.portraitTint.blend};--tint-opacity:${theme.portraitTint.opacity};`
      : "");
  const lightVars = `${colorVars(light)}color-scheme:light;`;
  const darkVars = `${colorVars(dark)}color-scheme:dark;`;

  return [
    `:root{${base}}`,
    `:root,[data-theme="light"]{${lightVars}}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${darkVars}}}`,
    `[data-theme="dark"]{${darkVars}}`,
  ].join("\n");
}
