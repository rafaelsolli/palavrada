import type { ModoDefinicao, IdModo } from './tipos';

export const DIARIO: ModoDefinicao = {
  id: 'diario',
  icone: '🌞',
  nome: 'Desafio Diário',
  classe: 'diario',
  fonte: 'curadas',
  param: null,
  persistencia: null,
};

export const LIVRE: ModoDefinicao = {
  id: 'livre',
  icone: '🎲',
  nome: 'Modo Livre',
  classe: 'livre',
  fonte: 'curadas',
  param: 'w',
  persistencia: 'livre',
};

export const LIVRISSIMO: ModoDefinicao = {
  id: 'livrissimo',
  icone: '💀',
  nome: 'Modo Livríssimo',
  classe: 'livrissimo',
  fonte: 'livrissimo',
  param: 'x',
  persistencia: 'livrissimo',
};

export const MODOS: Record<IdModo, ModoDefinicao> = {
  diario: DIARIO,
  livre: LIVRE,
  livrissimo: LIVRISSIMO,
};
