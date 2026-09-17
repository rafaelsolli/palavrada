import type { Page } from '@playwright/test';

/** Marca o tutorial como visto antes de a página carregar. */
export async function semTutorial(page: Page) {
  await page.addInitScript(() => localStorage.setItem('palavrada.tutorial', '1'));
}

/** Abre o jogo e espera a grade aparecer. */
export async function abrirJogo(page: Page, caminho = '') {
  await semTutorial(page);
  await page.goto(caminho);
  await page.getByLabel('Letra 1').first().waitFor();
}

/** Digita usando o teclado virtual da página. */
export async function teclarNaTela(page: Page, ...teclas: string[]) {
  for (const t of teclas) {
    await page.locator('.teclado button', { hasText: new RegExp(`^${t}$`) }).first().click();
  }
}

/** Botão de ciclo de uma opção. O nome acessível é "<opção> <valor>". */
export function opcao(page: Page, rotulo: string) {
  return page.getByRole('button', { name: new RegExp(`^${rotulo}\\b`) });
}

export interface Pixels {
  opacos: number;
  cores: string[];
}

/**
 * Lê os pixels realmente desenhados no canvas.
 *
 * É o que prova que a onda apareceu: no jsdom o contexto 2d nem existe, então
 * toda a camada de desenho passava sem verificação nenhuma.
 */
export async function lerCanvas(page: Page, seletor = 'canvas'): Promise<Pixels> {
  return page.evaluate((s) => {
    const canvas = document.querySelector<HTMLCanvasElement>(s);
    if (!canvas) throw new Error(`canvas não encontrado: ${s}`);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('sem contexto 2d');

    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const contagem = new Map<string, number>();
    let opacos = 0;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]!;
      if (alpha < 40) continue;
      opacos++;
      const cor = `${data[i]},${data[i + 1]},${data[i + 2]}`;
      contagem.set(cor, (contagem.get(cor) ?? 0) + 1);
    }

    const cores = [...contagem.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([cor]) => cor);

    return { opacos, cores };
  }, seletor);
}

/** Distância entre duas cores RGB, para tolerar antialiasing. */
export function perto(cor: string, alvo: [number, number, number], tolerancia = 60): boolean {
  const [r, g, b] = cor.split(',').map(Number) as [number, number, number];
  return (
    Math.abs(r - alvo[0]) <= tolerancia &&
    Math.abs(g - alvo[1]) <= tolerancia &&
    Math.abs(b - alvo[2]) <= tolerancia
  );
}
