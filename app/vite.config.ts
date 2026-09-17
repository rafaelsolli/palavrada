import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// `base` muda conforme o alvo do deploy:
//   staging  → /beta/  (padrão; convive com o site legado na raiz)
//   produção → /       (definido por BASE_PUBLICA no workflow, na virada)
export default defineConfig({
  base: process.env.BASE_PUBLICA ?? '/beta/',
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    // O teste de paridade da pontuação percorre ~870k combinações; o runner do
    // CI é bem mais lento que a máquina local.
    testTimeout: 20_000,
  },
});
