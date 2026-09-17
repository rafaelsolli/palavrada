import { test } from '@playwright/test';
import { abrirJogo, teclarNaTela } from './apoio';

/**
 * Captura telas para conferência visual. Não afirma nada — serve para olhar.
 * Rode com `npx playwright test e2e/telas.spec.ts`; as imagens ficam em
 * e2e-screenshots/, fora do controle de versão.
 */
const pasta = 'e2e-screenshots';

test('captura as telas principais', async ({ page }, info) => {
  const nome = (n: string) => `${pasta}/${info.project.name}-${n}.png`;

  await abrirJogo(page);
  await page.screenshot({ path: nome('1-inicio') });

  await teclarNaTela(page, 'M', 'U', 'N', 'D', 'O', 'ENTER');
  await teclarNaTela(page, 'C', 'A', 'S', 'A', 'S', 'ENTER');
  await page.waitForTimeout(200);
  await page.screenshot({ path: nome('2-jogando') });

  await page.getByRole('button', { name: 'Configurações' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: nome('3-configuracoes') });
  await page.getByRole('button', { name: 'Fechar' }).click();

  await page.getByRole('button', { name: 'Como jogar' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: nome('4-ajuda') });
  await page.getByRole('button', { name: 'Fechar' }).click();

  await page.getByRole('button', { name: /Modo Livre/ }).first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: nome('5-seletor') });
  await page.getByRole('button', { name: 'Fechar' }).click();

  for (const palavra of ['ABANO', 'ABONO', 'ABRIL', 'ABRIR']) {
    await teclarNaTela(page, ...palavra.split(''), 'ENTER');
  }
  await page.waitForTimeout(1800);
  await page.screenshot({ path: nome('6-resultado') });
});
