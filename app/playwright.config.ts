import { defineConfig, devices } from '@playwright/test';

/**
 * Testes em navegador de verdade, contra o build publicado.
 *
 * Complementam a suíte do Vitest, que roda no jsdom e por isso não enxerga
 * canvas, layout nem se o bundle realmente monta — foi justamente um bundle que
 * não montava que deixou o beta em branco sem nenhum teste acusar.
 */
const PORTA = 4173;

export default defineConfig({
  testDir: './e2e',
  // telas.spec.ts só captura imagens para conferência humana; não afirma nada.
  testIgnore: process.env.CI ? ['**/telas.spec.ts'] : [],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `http://localhost:${PORTA}/`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],

  webServer: {
    command: `npm run build && npm run preview -- --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
