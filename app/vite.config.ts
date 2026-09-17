import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// `base` muda conforme o alvo do deploy:
//   staging  → /beta/  (padrão; convive com o site legado na raiz)
//   produção → /       (definido por BASE_PUBLICA no workflow, na virada)
export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PUBLICA ?? '/beta/',
  plugins: [svelte()],
  resolve: {
    // Sem isto os testes carregam a build de servidor do Svelte, que não sabe
    // montar componentes. Só vale no modo de teste.
    conditions: mode === 'test' ? ['browser'] : [],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/teste/preparo.ts'],
    // O teste de paridade da pontuação percorre ~870k combinações; o runner do
    // CI é bem mais lento que a máquina local.
    testTimeout: 20_000,
  },
}));
