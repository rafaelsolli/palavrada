/**
 * Palavra do Desafio Diário.
 *
 * Embaralhamento inteiro de Knuth seguido de um xor-shift, exatamente como no
 * site atual. Cada operação importa: `>>> 16` converte para uint32 e `^` para
 * int32, então trocar a ordem ou usar aritmética de ponto flutuante mudaria a
 * palavra de todo mundo. Coberto por teste de paridade.
 */
const KNUTH = 2654435761;

export function palavraDoDia(dia: number, palavras: readonly string[]): string {
  if (!palavras.length) throw new Error('lista de palavras vazia');
  let h = dia * KNUTH;
  h = h ^ (h >>> 16);
  return palavras[Math.abs(h) % palavras.length]!;
}
