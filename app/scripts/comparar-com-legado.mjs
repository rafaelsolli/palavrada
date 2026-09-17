/**
 * Compara a tela do beta com a do site publicado, pixel a pixel.
 *
 * Ferramenta para a virada: se as duas telas coincidem, a troca não muda nada
 * para quem joga. A comparação usa densidade de tela inteira de propósito — com
 * densidade fracionária, o arredondamento do buffer do canvas gera diferença
 * subpixel que não significa nada.
 *
 * Uso: npm run preview  (noutro terminal)
 *      node scripts/comparar-com-legado.mjs
 *
 * Precisa do ImageMagick para o cálculo da diferença.
 */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const LEGADO = process.env.URL_LEGADO ?? 'https://palavrada.com.br/';
const NOVO = process.env.URL_NOVO ?? 'http://localhost:4173/beta/';
const PASTA = 'e2e-screenshots';
const TELAS = [
  { nome: 'celular', viewport: { width: 412, height: 900 }, isMobile: true },
  { nome: 'desktop', viewport: { width: 1280, height: 900 }, isMobile: false },
];

mkdirSync(PASTA, { recursive: true });
const navegador = await chromium.launch();

for (const tela of TELAS) {
  for (const [rotulo, url] of [
    ['legado', LEGADO],
    ['novo', NOVO],
  ]) {
    const ctx = await navegador.newContext({
      viewport: tela.viewport,
      deviceScaleFactor: 1,
      isMobile: tela.isMobile,
      hasTouch: tela.isMobile,
    });
    const page = await ctx.newPage();
    // Estado limpo e idêntico nos dois lados.
    await page.addInitScript(() => localStorage.setItem('palavrada.tutorial', '1'));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${PASTA}/${tela.nome}-${rotulo}.png` });
    await ctx.close();
  }

  const a = `${PASTA}/${tela.nome}-legado.png`;
  const b = `${PASTA}/${tela.nome}-novo.png`;
  const diff = `${PASTA}/${tela.nome}-diferenca.png`;

  let diferentes = 0;
  try {
    execFileSync('compare', ['-metric', 'AE', a, b, diff], { stdio: 'pipe' });
  } catch (erro) {
    diferentes = Number.parseInt(String(erro.stderr ?? '0'), 10) || 0;
  }
  const total = Number(
    execFileSync('magick', ['identify', '-format', '%[fx:w*h]', a], { encoding: 'utf8' }),
  );
  const pct = ((diferentes / total) * 100).toFixed(3);
  const sinal = diferentes === 0 ? '✓' : '·';
  console.log(`${sinal} ${tela.nome.padEnd(8)} ${diferentes} de ${total} pixels (${pct}%)`);
  if (diferentes > 0) console.log(`  diferença salva em ${diff}`);
}

await navegador.close();
