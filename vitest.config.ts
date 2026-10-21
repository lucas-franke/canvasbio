import { defineConfig } from "vitest/config";

import { cnAlias } from "./vite.config.ts";

// Separate from vite.config.ts so the React Router plugin doesn't run during unit tests.
export default defineConfig({
  resolve: { tsconfigPaths: true, alias: [cnAlias] },
  test: {
    include: ["app/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
  },
});
