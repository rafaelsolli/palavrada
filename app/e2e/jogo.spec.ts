import { test, expect } from '@playwright/test';
import { abrirJogo, lerCanvas, opcao, perto, teclarNaTela } from './apoio';

/**
 * O que só um navegador de verdade responde.
 *
 * Nada aqui repete a suíte do Vitest: regra de jogo, pontuação e persistência já
 * são cobertas lá, mais rápido. Aqui ficam o bundle montar, o canvas desenhar e
 * o layout caber na tela.
 */

test('o aplicativo monta e não deixa erro no console', async ({ page }) => {
  // Este teste sozinho já teria pego o bundle que subia a página em branco.
  const erros: string[] = [];
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  page.on('pageerror', (e) => erros.push(e.message));

  await abrirJogo(page);

  await expect(page.getByText('PalavRada')).toBeVisible();
  await expect(page.getByText(/Desafio Diário/)).toBeVisible();
  await expect(page.locator('.teclado button')).toHaveCount(28);
  expect(erros).toEqual([]);
});

test('a onda-alvo é realmente desenhada no canvas', async ({ page }) => {
  await abrirJogo(page);
  const canvas = page.locator('.wave-card canvas');
  await expect(canvas).toBeVisible();

  const { opacos, cores } = await lerCanvas(page, '.wave-card canvas');
  expect(opacos).toBeGreaterThan(200);
  // A curva do alvo é azul (#3b82f6 = 59,130,246).
  expect(cores.some((c) => perto(c, [59, 130, 246]))).toBe(true);
});

test('um palpite acrescenta a sua curva ao gráfico', async ({ page }) => {
  await abrirJogo(page);
  const antes = await lerCanvas(page, '.wave-card canvas');

  await teclarNaTela(page, 'M', 'U', 'N', 'D', 'O', 'ENTER');
  await expect(page.locator('.h-item, .item').first()).toBeVisible();

  const depois = await lerCanvas(page, '.wave-card canvas');
  expect(depois.opacos).toBeGreaterThan(antes.opacos);
  // A curva do último palpite é rosa (#f472b6 = 244,114,182).
  expect(depois.cores.some((c) => perto(c, [244, 114, 182]))).toBe(true);
});

test('a miniatura do histórico também desenha', async ({ page }) => {
  await abrirJogo(page);
  await teclarNaTela(page, 'M', 'U', 'N', 'D', 'O', 'ENTER');

  const mini = page.locator('.mini canvas').first();
  await expect(mini).toBeVisible();
  const { opacos } = await lerCanvas(page, '.mini canvas');
  expect(opacos).toBeGreaterThan(50);
});

test('ligar as bolinhas muda o desenho na hora', async ({ page }) => {
  await abrirJogo(page);
  const antes = await lerCanvas(page, '.wave-card canvas');

  await page.getByRole('button', { name: 'Configurações' }).click();
  await opcao(page, 'Bolinhas nas curvas').click();
  await page.getByRole('button', { name: 'Aplicar' }).click();

  await expect
    .poll(async () => (await lerCanvas(page, '.wave-card canvas')).opacos)
    .toBeGreaterThan(antes.opacos);
});

test('as réguas horizontais aparecem e somem conforme a configuração', async ({ page }) => {
  await abrirJogo(page);

  await page.getByRole('button', { name: 'Configurações' }).click();
  const reguas = opcao(page, 'Réguas horizontais');
  await expect(reguas).toHaveText('5');
  // Cicla 0 → 5 → 10 … voltando para 0.
  for (let i = 0; i < 5; i++) await reguas.click();
  await expect(reguas).toHaveText('0');
  await page.getByRole('button', { name: 'Aplicar' }).click();

  const semReguas = await lerCanvas(page, '.wave-card canvas');

  await page.getByRole('button', { name: 'Configurações' }).click();
  for (let i = 0; i < 5; i++) await opcao(page, 'Réguas horizontais').click();
  await page.getByRole('button', { name: 'Aplicar' }).click();

  await expect
    .poll(async () => (await lerCanvas(page, '.wave-card canvas')).opacos)
    .toBeGreaterThan(semReguas.opacos);
});

test('o teclado físico joga a partida inteira', async ({ page }) => {
  await abrirJogo(page);

  await page.keyboard.type('mundo');
  await expect(page.getByLabel('Letra 1')).toHaveText('M');

  await page.keyboard.press('Backspace');
  await expect(page.getByLabel('Letra 5')).toHaveText('');

  await page.keyboard.type('o');
  await page.keyboard.press('Enter');
  await expect(page.getByText('MUNDO')).toBeVisible();
});

test('o modal de resultado aparece ao fim e traz a palavra', async ({ page }) => {
  await abrirJogo(page);

  // Seis palpites errados encerram a partida.
  for (const palavra of ['ABANO', 'ABONO', 'ABRIL', 'ABRIR', 'ABUSO', 'ACARO']) {
    await teclarNaTela(page, ...palavra.split(''), 'ENTER');
  }

  await expect(page.getByText('a palavra era')).toBeVisible({ timeout: 6000 });
  await expect(page.getByText('Próxima palavra em')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Compartilhar' })).toBeVisible();
});
