import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import { config } from '../config/estado.svelte';

/**
 * Preparo comum dos testes.
 *
 * O jsdom não implementa canvas nem as APIs de compartilhamento; aqui elas viram
 * dublês silenciosos, para que os componentes sigam o mesmo caminho de
 * degradação que já precisam ter em navegadores reais.
 */

const LEXICO: Record<string, string> = {
  curadas: readFileSync('public/lexico/curadas.txt', 'utf8'),
  validas: readFileSync('public/lexico/validas.txt', 'utf8'),
};

// Sem contexto 2d: os componentes de onda têm de sair de cena sem quebrar.
HTMLCanvasElement.prototype.getContext = (() => null) as never;
Element.prototype.scrollIntoView = () => {};

// `bind:clientWidth` usa ResizeObserver, que o jsdom não implementa. O dublê
// nunca dispara, então as medidas ficam em zero e os canvas não desenham — que
// é exatamente o caminho já previsto para quando não há contexto 2d.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as never;

beforeEach(() => {
  localStorage.clear();
  // A store é um singleton de módulo, compartilhado por todos os casos do
  // arquivo: sem recarregar, a configuração aplicada num teste vaza no seguinte.
  config.recarregar();

  vi.stubGlobal('fetch', async (url: string) => {
    const nome = String(url).split('/').pop()?.replace('.txt', '') ?? '';
    const texto = LEXICO[nome];
    return { ok: texto !== undefined, text: async () => texto ?? '' } as Response;
  });
});

// Desmonta o que foi renderizado, inclusive quando o teste falha no meio —
// senão o DOM de um caso vaza para o seguinte.
afterEach(cleanup);
