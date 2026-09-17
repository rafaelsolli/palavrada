import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [svelte()],
  // Sem a condição "browser" os testes carregam a build de servidor do Svelte,
  // que não sabe montar componentes. Fora do teste o campo é omitido de
  // propósito: passar uma lista vazia apaga as condições padrão do Vite e o
  // build de produção acaba resolvendo essa mesma build de servidor.
  ...(mode === 'test' ? { resolve: { conditions: ['browser'] } } : {}),
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
