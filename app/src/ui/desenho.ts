import { faixaDelta, type FaixaDelta } from '../nucleo/ondas';
import type { Config } from '../config/definicoes';
import type { Tentativa } from '../nucleo/partida';

/**
 * Desenho das ondas no canvas.
 *
 * Porte de js/nucleo/canvas.js, com uma diferença: nada aqui procura elementos
 * por id nem lê configuração global. Recebe contexto, dimensões e dados, o que
 * torna a geometria testável e permite desenhar em qualquer canvas.
 */

export const MARGEM = 16;
export const ALTURA_PRINCIPAL = 150;
const MARGEM_MINI = 6;
const VALOR_MAXIMO = 25;

export const COR = {
  alvo: '#3b82f6',
  ultimo: '#f472b6',
  anterior: '#2a3a50',
  vitoria: '#10b981',
  guia: 'rgba(59,130,246,0.15)',
  eixo: 'rgba(59,130,246,0.45)',
} as const;

/** Mesmas cores que o histórico usa nas bordas, derivadas da faixa do delta. */
export const COR_FAIXA: Record<FaixaDelta, string> = {
  otimo: 'rgba(16, 185, 129, 0.7)',
  bom: 'rgba(250, 204, 21, 0.7)',
  medio: 'rgba(249, 115, 22, 0.7)',
  ruim: 'rgba(239, 68, 68, 0.7)',
};

export function corDoDelta(delta: number, ganhou = false): string {
  return COR_FAIXA[faixaDelta(delta, ganhou)];
}

export interface Ponto {
  x: number;
  y: number;
}

/** Distribui os valores no retângulo útil: A embaixo, Z em cima. */
export function pontos(
  valores: readonly number[],
  largura: number,
  altura: number,
  margem = MARGEM,
): Ponto[] {
  if (valores.length < 2) return [];
  const passoX = (largura - margem * 2) / (valores.length - 1);
  const alturaUtil = altura - margem * 2;
  return valores.map((v, i) => ({
    x: margem + i * passoX,
    y: margem + (1 - v / VALOR_MAXIMO) * alturaUtil,
  }));
}

/**
 * Prepara o canvas para a densidade da tela e devolve o contexto já escalado.
 * Sem isto a curva sai serrilhada em telas retina.
 */
export function prepararCanvas(
  canvas: HTMLCanvasElement,
  largura: number,
  altura: number,
): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${largura}px`;
  canvas.style.height = `${altura}px`;
  canvas.width = Math.round(largura * dpr);
  canvas.height = Math.round(altura * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, largura, altura);
  return ctx;
}

function curva(
  ctx: CanvasRenderingContext2D,
  p: readonly Ponto[],
  cor: string,
  espessura: number,
  alpha: number,
): void {
  if (p.length < 2) return;
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.lineWidth = espessura;
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p[0]!.x, p[0]!.y);
  for (let i = 0; i < p.length - 1; i++) {
    const meio = (p[i]!.x + p[i + 1]!.x) / 2;
    ctx.bezierCurveTo(meio, p[i]!.y, meio, p[i + 1]!.y, p[i + 1]!.x, p[i + 1]!.y);
  }
  ctx.stroke();
  ctx.restore();
}

function guias(ctx: CanvasRenderingContext2D, largura: number, altura: number, quantas: number): void {
  if (quantas <= 0) return;
  ctx.save();
  ctx.strokeStyle = COR.guia;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 7]);
  for (let i = 0; i < quantas; i++) {
    const v = quantas === 1 ? VALOR_MAXIMO / 2 : (i / (quantas - 1)) * VALOR_MAXIMO;
    const y = MARGEM + (1 - v / VALOR_MAXIMO) * (altura - MARGEM * 2);
    ctx.beginPath();
    ctx.moveTo(MARGEM, y);
    ctx.lineTo(largura - MARGEM, y);
    ctx.stroke();
  }
  ctx.restore();
}

function eixoY(ctx: CanvasRenderingContext2D, altura: number, quantas: number): void {
  if (quantas <= 0) return;
  ctx.save();
  ctx.font = '9px Space Grotesk, sans-serif';
  ctx.fillStyle = COR.eixo;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < quantas; i++) {
    const v = quantas === 1 ? 0 : Math.round((i / (quantas - 1)) * VALOR_MAXIMO);
    const y = MARGEM + (1 - v / VALOR_MAXIMO) * (altura - MARGEM * 2);
    ctx.fillText(String.fromCharCode(65 + v), MARGEM - 3, y);
  }
  ctx.restore();
}

function bolinhas(ctx: CanvasRenderingContext2D, p: readonly Ponto[], cor: string): void {
  ctx.save();
  ctx.fillStyle = cor;
  ctx.globalAlpha = 0.9;
  for (const { x, y } of p) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function letras(
  ctx: CanvasRenderingContext2D,
  p: readonly Ponto[],
  palavra: string,
  cor: string,
): void {
  ctx.save();
  ctx.font = 'bold 10px Space Grotesk, sans-serif';
  ctx.fillStyle = cor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.globalAlpha = 0.9;
  [...palavra].forEach((letra, i) => {
    const ponto = p[i];
    if (ponto) ctx.fillText(letra, ponto.x, ponto.y - 4);
  });
  ctx.restore();
}

/**
 * Quais palpites aparecem, e qual deles é "o último".
 *
 * Palpites penalizados (palavras inválidas) não viram onda, então o destaque vai
 * para a última tentativa que de fato tem curva.
 */
export function selecionarVisiveis(
  tentativas: readonly Tentativa[],
  maxPalpites: number,
): { visiveis: Tentativa[]; ultimo: Tentativa | null } {
  const ultimo = [...tentativas].reverse().find((t) => !t.penalizada) ?? null;
  const visiveis = maxPalpites === 0 ? [] : tentativas.slice(-maxPalpites);
  return { visiveis, ultimo };
}

export interface DadosPrincipal {
  tentativas: readonly Tentativa[];
  valoresAlvo: readonly number[];
  config: Config;
}

export function desenharPrincipal(
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  dados: DadosPrincipal,
): void {
  const { config: c, tentativas, valoresAlvo } = dados;

  guias(ctx, largura, altura, c.regraHorizontal);
  eixoY(ctx, altura, c.eixoY);

  const { visiveis, ultimo } = selecionarVisiveis(tentativas, c.maxPalpites);
  const ganhou = ultimo?.ganhou ?? false;

  for (const t of visiveis) {
    if (t.penalizada || !t.visivel || t === ultimo) continue;
    curva(ctx, pontos(t.valores, largura, altura), COR.anterior, 1.5, 0.7);
  }

  if (ultimo && ultimo.visivel && visiveis.includes(ultimo)) {
    const cor = ganhou ? COR.vitoria : COR.ultimo;
    const p = pontos(ultimo.valores, largura, altura);
    curva(ctx, p, cor, 2.2, 0.95);
    if (c.bolinhas) bolinhas(ctx, p, cor);
    if (c.letrasNoGrafico) letras(ctx, p, ultimo.palavra, cor);
  }

  const corAlvo = ganhou ? COR.vitoria : COR.alvo;
  const pAlvo = pontos(valoresAlvo, largura, altura);
  curva(ctx, pAlvo, corAlvo, 2.5, 0.9);
  if (c.bolinhas) bolinhas(ctx, pAlvo, corAlvo);
}

export function desenharMini(
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  tentativa: Tentativa,
  valoresAlvo: readonly number[] | null,
): void {
  if (valoresAlvo) {
    curva(ctx, pontos(valoresAlvo, largura, altura, MARGEM_MINI), COR.alvo, 1.2, 0.45);
  }
  curva(
    ctx,
    pontos(tentativa.valores, largura, altura, MARGEM_MINI),
    corDoDelta(tentativa.delta, tentativa.ganhou),
    2.5,
    1,
  );
}
