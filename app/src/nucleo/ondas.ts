/**
 * Conversão entre palavras e ondas.
 *
 * Cada letra vale a sua posição no alfabeto (A = 0 … Z = 25); a palavra vira a
 * lista desses valores, e o "delta" entre dois palpites é a soma das distâncias
 * posição a posição. É a única regra matemática do jogo.
 */

export const TAMANHO_PALAVRA = 5;

const CODIGO_A = 65;

/** Remove acentos, força maiúsculas e descarta tudo que não for A–Z. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

/** Valor de uma única letra já normalizada. Retorna `null` se não for A–Z. */
export function valorLetra(letra: string): number | null {
  const limpa = normalizar(letra);
  if (limpa.length !== 1) return null;
  return limpa.charCodeAt(0) - CODIGO_A;
}

/**
 * Valores de cada letra da palavra.
 *
 * Lança se a palavra não tiver exatamente 5 letras depois de normalizada — o
 * resto do jogo assume esse tamanho, e falhar aqui é melhor do que propagar um
 * `NaN` até o desenho da curva.
 */
export function valoresPalavra(palavra: string): number[] {
  const limpa = normalizar(palavra);
  if (limpa.length !== TAMANHO_PALAVRA) {
    throw new Error(
      `Palavra deve ter ${TAMANHO_PALAVRA} letras após normalizar: "${palavra}" virou "${limpa}"`,
    );
  }
  return [...limpa].map((l) => l.charCodeAt(0) - CODIGO_A);
}

/** Distância total entre duas ondas: soma das diferenças absolutas por posição. */
export function delta(valores: readonly number[], alvo: readonly number[]): number {
  return valores.reduce((soma, v, i) => soma + Math.abs(v - (alvo[i] ?? 0)), 0);
}

/**
 * Faixa qualitativa de um delta.
 *
 * Fonte única dos limiares 10/20/40, que no código legado apareciam repetidos em
 * cinco lugares (cor do histórico, bolinhas do modal e os três textos de
 * compartilhamento). Cor e emoji derivam daqui, na camada de UI.
 */
export type FaixaDelta = 'otimo' | 'bom' | 'medio' | 'ruim';

export function faixaDelta(valorDelta: number, ganhou = false): FaixaDelta {
  if (ganhou || valorDelta < 10) return 'otimo';
  if (valorDelta < 20) return 'bom';
  if (valorDelta < 40) return 'medio';
  return 'ruim';
}
