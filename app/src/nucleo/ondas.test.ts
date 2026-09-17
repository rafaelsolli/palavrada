import { describe, it, expect } from 'vitest';
import {
  normalizar,
  valorLetra,
  valoresPalavra,
  delta,
  faixaDelta,
  TAMANHO_PALAVRA,
} from './ondas';

describe('normalizar', () => {
  it('remove acentos e cedilha', () => {
    expect(normalizar('ação')).toBe('ACAO');
    expect(normalizar('Vôrtex')).toBe('VORTEX');
    expect(normalizar('ÂNGULO')).toBe('ANGULO');
  });

  it('descarta o que não for letra', () => {
    expect(normalizar('a-b c1')).toBe('ABC');
    expect(normalizar('')).toBe('');
  });
});

describe('valorLetra', () => {
  it('mapeia A=0 até Z=25', () => {
    expect(valorLetra('A')).toBe(0);
    expect(valorLetra('M')).toBe(12);
    expect(valorLetra('Z')).toBe(25);
  });

  it('aceita minúscula e acentuada', () => {
    expect(valorLetra('a')).toBe(0);
    expect(valorLetra('é')).toBe(4);
  });

  it('devolve null em vez de NaN quando não é uma letra', () => {
    expect(valorLetra('1')).toBeNull();
    expect(valorLetra('')).toBeNull();
    expect(valorLetra('AB')).toBeNull();
  });
});

describe('valoresPalavra', () => {
  it('converte a palavra inteira', () => {
    expect(valoresPalavra('VERSO')).toEqual([21, 4, 17, 18, 14]);
  });

  it('rejeita palavra que não fica com 5 letras após normalizar', () => {
    // "AÇÃO" tem 4 letras normalizadas — no código legado isso virava NaN
    // silencioso no delta.
    expect(() => valoresPalavra('AÇÃO')).toThrow(/5 letras/);
    expect(() => valoresPalavra('PALAVRA')).toThrow(/5 letras/);
  });
});

describe('delta', () => {
  it('é zero para a mesma palavra', () => {
    const v = valoresPalavra('VERSO');
    expect(delta(v, v)).toBe(0);
  });

  it('soma as distâncias posição a posição', () => {
    expect(delta(valoresPalavra('ABCDE'), valoresPalavra('ABCDF'))).toBe(1);
    expect(delta(valoresPalavra('AAAAA'), valoresPalavra('ZZZZZ'))).toBe(125);
  });

  it('é simétrico', () => {
    const a = valoresPalavra('CASAS');
    const b = valoresPalavra('MUNDO');
    expect(delta(a, b)).toBe(delta(b, a));
  });
});

describe('faixaDelta', () => {
  it('classifica pelos limiares 10/20/40', () => {
    expect(faixaDelta(0)).toBe('otimo');
    expect(faixaDelta(9)).toBe('otimo');
    expect(faixaDelta(10)).toBe('bom');
    expect(faixaDelta(19)).toBe('bom');
    expect(faixaDelta(20)).toBe('medio');
    expect(faixaDelta(39)).toBe('medio');
    expect(faixaDelta(40)).toBe('ruim');
  });

  it('vitória é sempre ótimo, mesmo com delta alto', () => {
    expect(faixaDelta(99, true)).toBe('otimo');
  });
});

it('o tamanho da palavra é 5', () => {
  expect(TAMANHO_PALAVRA).toBe(5);
});
