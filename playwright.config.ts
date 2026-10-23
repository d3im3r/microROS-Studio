import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3101",
    headless: true,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
    viewport: { width: 1440, height: 1080 }
  },
  webServer: { command: "npm run dev -- --webpack --hostname 127.0.0.1 --port 3101", url: "http://127.0.0.1:3101", env: { NEXT_E2E: "1" }, reuseExistingServer: false, timeout: 120000 }
});
