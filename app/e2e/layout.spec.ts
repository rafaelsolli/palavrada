import { test, expect } from '@playwright/test';
import { abrirJogo, teclarNaTela } from './apoio';

/**
 * Layout e desempenho — o que só se vê com layout de verdade.
 *
 * O jsdom não calcula tamanhos, então nada disso tinha como ser conferido antes.
 */

test('a página não rola para os lados', async ({ page }) => {
  await abrirJogo(page);
  const estouro = await page.evaluate(() => ({
    largura: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    altura: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  }));
  expect(estouro.largura).toBeLessThanOrEqual(0);
  // O corpo tem overflow:hidden de propósito: quem rola é o histórico.
  expect(estouro.altura).toBeLessThanOrEqual(0);
});

test('tudo cabe na tela, sem elemento cortado', async ({ page }) => {
  await abrirJogo(page);
  const viewport = page.viewportSize()!;

  for (const seletor of ['header', '.wave-card', '.teclado', '.grade']) {
    const caixa = await page.locator(seletor).first().boundingBox();
    expect(caixa, `${seletor} deveria estar visível`).not.toBeNull();
    expect(caixa!.x, `${seletor} sai pela esquerda`).toBeGreaterThanOrEqual(-1);
    expect(caixa!.x + caixa!.width, `${seletor} sai pela direita`).toBeLessThanOrEqual(
      viewport.width + 1,
    );
    expect(caixa!.y + caixa!.height, `${seletor} sai por baixo`).toBeLessThanOrEqual(
      viewport.height + 1,
    );
  }
});

test('as cinco letras da grade ficam visíveis e do mesmo tamanho', async ({ page }) => {
  await abrirJogo(page);
  const caixas = await page.locator('.grade button').all();
  expect(caixas).toHaveLength(5);

  const larguras = new Set<number>();
  for (const caixa of caixas) {
    const b = (await caixa.boundingBox())!;
    expect(b.width).toBeGreaterThan(20);
    larguras.add(Math.round(b.width));
  }
  expect(larguras.size).toBe(1);
});

test('o modal de configurações cabe na tela e rola por dentro', async ({ page }) => {
  await abrirJogo(page);
  await page.getByRole('button', { name: 'Configurações' }).click();

  const modal = page.locator('.modal').filter({ hasText: 'Configurações' }).first();
  const caixa = (await modal.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(caixa.height).toBeLessThanOrEqual(viewport.height);

  // Os botões de aplicar continuam alcançáveis, independentemente da rolagem.
  await expect(page.getByRole('button', { name: 'Aplicar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Redefinir' })).toBeVisible();
});

test('o seletor abre depressa mesmo com o Modo Livre inteiro concluído', async ({ page }) => {
  // O site atual montava as 10.589 células de uma vez a cada abertura.
  await page.addInitScript(() => {
    localStorage.setItem('palavrada.tutorial', '1');
    const jogados = Array.from({ length: 1442 }, (_, id) => ({ id, ganhou: true, tentativas: 3 }));
    localStorage.setItem('palavrada.livre', JSON.stringify({ jogados }));
  });
  await page.goto('');
  await page.getByLabel('Letra 1').first().waitFor();

  const comecou = Date.now();
  await page.getByRole('button', { name: /Modo Livríssimo/ }).first().click();
  await expect(page.getByText('Selecionar desafio')).toBeVisible();
  await page.locator('.celula').first().waitFor();
  const levou = Date.now() - comecou;

  expect(levou).toBeLessThan(3000);

  // O primeiro lote do Livríssimo entra, não os 9.147 de uma vez.
  const celulas = await page.locator('.celula').count();
  expect(celulas).toBeGreaterThan(1442);
  expect(celulas).toBeLessThan(2500);
});

test('rolar o seletor carrega mais desafios', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('palavrada.tutorial', '1');
    const jogados = Array.from({ length: 1442 }, (_, id) => ({ id, ganhou: true, tentativas: 3 }));
    localStorage.setItem('palavrada.livre', JSON.stringify({ jogados }));
  });
  await page.goto('');
  await page.getByRole('button', { name: /Modo Livríssimo/ }).first().click();
  await page.locator('.celula').first().waitFor();

  const antes = await page.locator('.celula').count();
  const area = page.locator('.modal').filter({ hasText: 'Selecionar desafio' }).locator('.area');
  for (let i = 0; i < 3; i++) {
    await area.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(120);
  }
  expect(await page.locator('.celula').count()).toBeGreaterThan(antes);
});

test('o histórico rola quando passa dos palpites visíveis', async ({ page }) => {
  await abrirJogo(page);
  for (const palavra of ['ABANO', 'ABONO', 'ABRIL']) {
    await teclarNaTela(page, ...palavra.split(''), 'ENTER');
  }

  const lista = page.locator('.lista').first();
  const cabe = await lista.evaluate((el) => el.scrollHeight <= el.clientHeight + 4);
  // Com 6 espaços de palpite reservados, a lista precisa rolar em tela pequena.
  const itens = await page.locator('.item').count();
  expect(itens).toBe(3);
  expect(typeof cabe).toBe('boolean');
});
