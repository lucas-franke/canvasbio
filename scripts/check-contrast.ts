/**
 * Checks all color token pairs of site.config.ts against WCAG 2.2 AA
 * (SC 1.4.3 text, SC 1.4.11 non-text). Exits with code 1 on failure,
 * so a project theme with insufficient contrast cannot be built.
 */
import siteConfig from "../site.config";
import { checkContrast } from "../app/lib/theme/contrast";

let failed = 0;

for (const mode of ["light", "dark"] as const) {
  console.log(`\n${mode.toUpperCase()}`);
  for (const r of checkContrast(siteConfig.theme.colors[mode])) {
    const mark = r.pass ? "✓" : "✗";
    const ratio = r.ratio.toFixed(2).padStart(5);
    const fg = Array.isArray(r.foreground) ? r.foreground.join("|") : r.foreground;
    console.log(`  ${mark} ${ratio}:1 (min ${r.min}) ${fg} auf ${r.background} – ${r.usage}`);
    if (!r.pass) failed++;
  }
}

if (failed > 0) {
  console.error(
    `\n${failed} Farbpaar(e) unterschreiten WCAG 2.2 AA. Bitte theme.colors in site.config.ts anpassen.`,
  );
  process.exit(1);
}
console.log("\nAlle Farbpaare erfüllen WCAG 2.2 AA.");
