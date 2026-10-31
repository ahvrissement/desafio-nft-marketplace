import { defineConfig, devices } from '@playwright/test'

// Testes E2E: rodam contra o BUILD de produção (vite preview), com o MSW
// ligado, como no deploy. Cada teste abre um contexto novo do navegador:
// localStorage vazio = banco do mock no cenário padrão (estado isolado).
const PORT = 4173

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    // Regressão visual: tolera só diferença de antialiasing.
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' },
  },
  // Relatório HTML + traces das falhas (README).
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // Mobile: só os testes marcados com @mobile (fluxos principais + visuais).
    { name: 'mobile', grep: /@mobile/, use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
