/**
 * Validates everything in content/ against the schemas and site.config.ts.
 * Exits with code 1 on errors so broken content can't be built or deployed.
 */
import path from "node:path";

import { loadContent } from "../app/lib/content/load.server";
import siteConfig from "../site.config";

const { people, taxonomy, issues } = await loadContent(path.resolve("content"), siteConfig);

const errors = issues.filter((i) => i.level === "error");
const warnings = issues.filter((i) => i.level === "warning");

for (const issue of issues) {
  console.log(`${issue.level === "error" ? "✗" : "!"} ${issue.file}: ${issue.message}`);
}

const localeCounts = siteConfig.locales
  .map((l) => `${l.code}: ${[...people.values()].filter((p) => p.texts.has(l.code)).length}`)
  .join(", ");
console.log(
  `\n${people.size} Personen (${localeCounts}), ${Object.values(taxonomy).reduce((n, v) => n + Object.keys(v).length, 0)} Taxonomie-Einträge`,
);
console.log(`${errors.length} Fehler, ${warnings.length} Warnungen`);
if (errors.length > 0) process.exit(1);
