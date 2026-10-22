import { defineConfig, devices } from "@playwright/test";

// Dedicated port: 4173 (Vite's default) is often taken by other local projects.
const port = Number(process.env.E2E_PORT ?? 4319);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  // Tests run against the static production build, like the real deployment.
  webServer: {
    command: `npm run build && npm run preview -- --port ${port}`,
    url: `http://localhost:${port}`,
    // Never reuse: a foreign server on the port would silently be tested instead.
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-android", use: { ...devices["Pixel 7"] } },
    { name: "mobile-ios", use: { ...devices["iPhone 15"] } },
  ],
});
