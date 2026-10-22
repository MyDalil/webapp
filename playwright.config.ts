import { defineConfig, devices } from '@playwright/test'

/**
 * Parcours essentiels de DALIL, joués par la CI avant toute fusion (voir .github/workflows/ci.yml).
 * Local : `pnpm build && pnpm test:e2e` (base Postgres migrée dans DALIL_DATABASE_URL).
 * Contre un déploiement : `E2E_BASE_URL=https://… pnpm test:e2e` (aucun serveur local lancé).
 */
const PORT = Number(process.env.E2E_PORT) || 3100
const external = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: external || `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    extraHTTPHeaders: process.env.VERCEL_BYPASS ? { 'x-vercel-protection-bypass': process.env.VERCEL_BYPASS } : undefined,
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : undefined,
  },
  projects: [
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: external ? undefined : { command: `pnpm start -p ${PORT}`, port: PORT, reuseExistingServer: !process.env.CI, timeout: 120_000 },
})
