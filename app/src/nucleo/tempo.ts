/**
 * Datas e durações do jogo.
 *
 * `Relogio` existe só para os testes poderem controlar o tempo; em produção é
 * sempre `Date.now`.
 */
export type Relogio = () => number;

const ORIGEM_ANO = 2024;
const MS_POR_DIA = 86_400_000;

/**
 * Número do desafio diário: dias cheios desde 01/01/2024, no fuso local.
 *
 * O cálculo precisa continuar idêntico ao do site atual — se mudar, todo mundo
 * acorda com uma palavra diferente. Coberto por teste de paridade.
 */
export function numeroDoDia(agora: Relogio = Date.now): number {
  const origem = new Date(ORIGEM_ANO, 0, 1);
  const hoje = new Date(agora());
  hoje.setHours(0, 0, 0, 0);
  return Math.floor((hoje.getTime() - origem.getTime()) / MS_POR_DIA);
}

/** Segundos que faltam para a virada do dia local. */
export function segundosAteMeiaNoite(agora: Relogio = Date.now): number {
  const instante = new Date(agora());
  const meiaNoite = new Date(instante);
  meiaNoite.setHours(24, 0, 0, 0);
  return Math.floor((meiaNoite.getTime() - instante.getTime()) / 1000);
}

/** `H:MM:SS` — usado na contagem regressiva do modal de resultado. */
export function formatarContagem(segundos: number): string {
  const seguro = Math.max(0, segundos);
  const h = Math.floor(seguro / 3600);
  const m = Math.floor((seguro % 3600) / 60);
  const s = seguro % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/** `M:SS` acima de um minuto, `S` abaixo — usado no contador de tempo limite. */
export function formatarDuracao(segundos: number): string {
  const seguro = Math.max(0, segundos);
  const m = Math.floor(seguro / 60);
  const s = seguro % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : String(s);
}
