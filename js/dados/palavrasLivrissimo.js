import { PALAVRAS } from './palavras.js';
import { VALIDAS_SET } from './validador.js';

const _curadas = new Set(PALAVRAS.map(p => p.toUpperCase()));
export const PALAVRAS_LIVRISSIMO = [...VALIDAS_SET].filter(w => !_curadas.has(w)).sort();
