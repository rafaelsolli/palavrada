import type { FonteDePalavras } from '../nucleo/lexico';
import type { ModoPersistido } from '../nucleo/armazenamento';

export type IdModo = 'diario' | 'livre' | 'livrissimo';

/**
 * Descrição de um modo de jogo.
 *
 * No site atual cada modo é uma classe de ~200 linhas, e as três são quase
 * idênticas: `aoTecla`, `aoEncerrar`, `reconfigurarTimer` e `_copiar` aparecem
 * copiadas byte a byte. O que realmente muda entre eles cabe neste objeto; a
 * mecânica é uma só, em `ControladorJogo`.
 */
export interface ModoDefinicao {
  id: IdModo;
  /** Emoji que identifica o modo em toda a interface. */
  icone: string;
  /** Nome sem o ícone, para compor títulos. */
  nome: string;
  /** Classe CSS do badge de modo no cabeçalho. */
  classe: string;
  /** Qual lista de palavras este modo indexa. */
  fonte: FonteDePalavras;
  /**
   * Parâmetro de URL que identifica o desafio, ou `null` no diário.
   *
   * Ler a URL e montar o link de compartilhamento usam este mesmo campo — é
   * o que impede o modo Livríssimo de voltar a gerar `?l=` e ler `?x=`.
   */
  param: 'w' | 'x' | null;
  /** Onde o resultado é gravado, ou `null` no diário (que guarda sequência). */
  persistencia: ModoPersistido | null;
}

/** `🌞 Desafio Diário` */
export function rotulo(modo: ModoDefinicao): string {
  return `${modo.icone} ${modo.nome}`;
}

/** `🎲 Modo Livre #42` — o diário numera pelo dia, os livres pelo desafio. */
export function rotuloDesafio(modo: ModoDefinicao, indice: number): string {
  return `${rotulo(modo)} #${numeroExibido(modo, indice)}`;
}

/** O diário mostra o número do dia; os livres mostram o índice a partir de 1. */
export function numeroExibido(modo: ModoDefinicao, indice: number): number {
  return modo.param === null ? indice : indice + 1;
}

/** Link que abre exatamente este desafio. */
export function linkDoDesafio(modo: ModoDefinicao, indice: number, base: string): string {
  if (modo.param === null) return base;
  return `${base}?${modo.param}=${indice + 1}`;
}
