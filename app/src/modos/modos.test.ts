import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { palavraDoDia } from './palavraDoDia';
import { DIARIO, LIVRE, LIVRISSIMO } from './definicoes';
import { rotulo, rotuloDesafio, numeroExibido, linkDoDesafio } from './tipos';
import { lerDesafioDaUrl, resolverModo, type ContextoResolucao } from './resolver';
import { bolinhas, textoCompartilhamento, textoProgresso } from './compartilhar';
import type { Tentativa } from '../nucleo/partida';

const curadas = readFileSync('public/lexico/curadas.txt', 'utf8').trim().split('\n');

describe('palavraDoDia', () => {
  /** Réplica exata de `palavraDoDia` do site legado. */
  function legado(dia: number, palavras: readonly string[]): string {
    const n = dia;
    let h = n * 2654435761;
    h = h ^ (h >>> 16);
    return palavras[Math.abs(h) % palavras.length]!;
  }

  it('é determinística', () => {
    expect(palavraDoDia(640, curadas)).toBe(palavraDoDia(640, curadas));
  });

  it('bate com o legado em 2000 dias seguidos', () => {
    // Blindagem da virada: divergir aqui troca a palavra do dia de todo mundo.
    const divergentes: number[] = [];
    for (let dia = 0; dia < 2000; dia++) {
      if (palavraDoDia(dia, curadas) !== legado(dia, curadas)) divergentes.push(dia);
    }
    expect(divergentes).toEqual([]);
  });

  it('sempre devolve uma palavra da lista', () => {
    const conjunto = new Set(curadas);
    for (let dia = 0; dia < 500; dia++) {
      expect(conjunto.has(palavraDoDia(dia, curadas))).toBe(true);
    }
  });

  it('recusa lista vazia em vez de devolver undefined', () => {
    expect(() => palavraDoDia(1, [])).toThrow(/vazia/);
  });
});

describe('rótulos e links', () => {
  it('o diário numera pelo dia; os livres, a partir de 1', () => {
    expect(numeroExibido(DIARIO, 640)).toBe(640);
    expect(numeroExibido(LIVRE, 0)).toBe(1);
    expect(rotuloDesafio(DIARIO, 640)).toBe('🌞 Desafio Diário #640');
    expect(rotuloDesafio(LIVRE, 41)).toBe('🎲 Modo Livre #42');
    expect(rotulo(LIVRISSIMO)).toBe('💀 Modo Livríssimo');
  });

  it('o link do Livríssimo usa ?x=, o mesmo parâmetro que a URL lê', () => {
    // Regressão do bug legado: o texto compartilhado gerava ?l=, que o jogo
    // ignorava, e quem recebia o link caía no Desafio Diário.
    const base = 'https://palavrada.com.br/';
    expect(linkDoDesafio(DIARIO, 640, base)).toBe(base);
    expect(linkDoDesafio(LIVRE, 41, base)).toBe(`${base}?w=42`);
    expect(linkDoDesafio(LIVRISSIMO, 41, base)).toBe(`${base}?x=42`);

    const link = linkDoDesafio(LIVRISSIMO, 41, base);
    expect(lerDesafioDaUrl(new URL(link).search)).toEqual({ modo: LIVRISSIMO, indice: 41 });
  });
});

describe('lerDesafioDaUrl', () => {
  it('lê os dois parâmetros', () => {
    expect(lerDesafioDaUrl('?w=1')).toEqual({ modo: LIVRE, indice: 0 });
    expect(lerDesafioDaUrl('?x=100')).toEqual({ modo: LIVRISSIMO, indice: 99 });
  });

  it('sem parâmetro conhecido, devolve null', () => {
    expect(lerDesafioDaUrl('')).toBeNull();
    expect(lerDesafioDaUrl('?utm_source=zap')).toBeNull();
    expect(lerDesafioDaUrl('?l=5')).toBeNull(); // o parâmetro errado do legado
  });

  it('rejeita valores sem sentido', () => {
    for (const busca of ['?w=0', '?w=-3', '?w=abc', '?w=']) {
      expect(lerDesafioDaUrl(busca)).toBeNull();
    }
  });

  it('o Livríssimo tem precedência quando os dois vêm juntos', () => {
    expect(lerDesafioDaUrl('?w=2&x=5')).toEqual({ modo: LIVRISSIMO, indice: 4 });
  });
});

describe('resolverModo', () => {
  const ctx = (ajustes: Partial<ContextoResolucao> = {}): ContextoResolucao => ({
    dia: 640,
    totalDoModo: 1442,
    totalLivre: 1442,
    jogadosLivre: 1442,
    jaJogado: false,
    ...ajustes,
  });

  it('sem pedido, abre o diário sem redirecionar', () => {
    expect(resolverModo(null, ctx())).toEqual({
      modo: DIARIO,
      indice: 640,
      aviso: null,
      redirecionado: false,
    });
  });

  it('abre o desafio pedido quando está disponível', () => {
    const r = resolverModo({ modo: LIVRE, indice: 41 }, ctx());
    expect(r).toEqual({ modo: LIVRE, indice: 41, aviso: null, redirecionado: false });
  });

  it('índice fora da lista cai no diário, em silêncio', () => {
    const r = resolverModo({ modo: LIVRE, indice: 9999 }, ctx());
    expect(r.modo).toBe(DIARIO);
    expect(r.aviso).toBeNull();
    expect(r.redirecionado).toBe(true);
  });

  it('desafio já jogado avisa e cai no diário', () => {
    const r = resolverModo({ modo: LIVRE, indice: 41 }, ctx({ jaJogado: true }));
    expect(r.modo).toBe(DIARIO);
    expect(r.aviso).toBe('🎲 Modo Livre #42 já foi jogado!');
  });

  it('Livríssimo trancado avisa para terminar o Livre', () => {
    const r = resolverModo(
      { modo: LIVRISSIMO, indice: 3 },
      ctx({ totalDoModo: 9147, jogadosLivre: 800 }),
    );
    expect(r.modo).toBe(DIARIO);
    expect(r.aviso).toBe('Complete o 🎲 Modo Livre primeiro!');
  });

  it('o bloqueio do Livríssimo vem antes do aviso de já jogado', () => {
    const r = resolverModo(
      { modo: LIVRISSIMO, indice: 3 },
      ctx({ totalDoModo: 9147, jogadosLivre: 0, jaJogado: true }),
    );
    expect(r.aviso).toBe('Complete o 🎲 Modo Livre primeiro!');
  });

  it('com o Livre completo, o Livríssimo abre', () => {
    const r = resolverModo({ modo: LIVRISSIMO, indice: 3 }, ctx({ totalDoModo: 9147 }));
    expect(r.modo).toBe(LIVRISSIMO);
    expect(r.indice).toBe(3);
  });
});

describe('compartilhamento', () => {
  const t = (delta: number, ganhou = false): Tentativa => ({
    palavra: 'MUNDO',
    valores: [],
    delta,
    ganhou,
    penalizada: false,
    visivel: true,
  });

  it('uma bolinha por palpite, completando até seis', () => {
    expect(bolinhas([t(5), t(15), t(25), t(50)])).toEqual(['🟢', '🟡', '🟠', '🔴', '⚫', '⚫']);
  });

  it('vitória é sempre verde', () => {
    expect(bolinhas([t(0, true)])[0]).toBe('🟢');
  });

  it('seis palpites não deixam bolinha vazia', () => {
    expect(bolinhas(Array(6).fill(t(30)))).toHaveLength(6);
  });

  it('monta o texto do diário sem pontuação', () => {
    const texto = textoCompartilhamento({
      modo: DIARIO,
      indice: 640,
      tentativas: [t(5, true)],
      ganhou: true,
      pontuacao: null,
      base: 'https://palavrada.com.br/',
    });
    expect(texto).toBe(
      '*🌞 Desafio Diário* #640\n' +
        'Venci!\n' +
        '🟢 ⚫ ⚫ ⚫ ⚫ ⚫\n' +
        'Sua vez: https://palavrada.com.br/',
    );
  });

  it('inclui a pontuação quando pedida', () => {
    const texto = textoCompartilhamento({
      modo: LIVRE,
      indice: 41,
      tentativas: [t(30)],
      ganhou: false,
      pontuacao: 836,
      base: 'https://palavrada.com.br/',
    });
    expect(texto).toContain('Perdi com 836 pontos!');
    expect(texto).toContain('Sua vez: https://palavrada.com.br/?w=42');
  });

  it('o texto do Livríssimo aponta para ?x=', () => {
    const texto = textoCompartilhamento({
      modo: LIVRISSIMO,
      indice: 41,
      tentativas: [t(30)],
      ganhou: false,
      pontuacao: null,
      base: 'https://palavrada.com.br/',
    });
    expect(texto).toContain('?x=42');
    expect(texto).not.toContain('?l=');
  });

  it('o texto de progresso concorda plural e porcentagem', () => {
    const texto = textoProgresso(
      [{ ganhou: true }, { ganhou: false }],
      4,
      'https://palavrada.com.br/',
    );
    expect(texto).toContain('50,00% do 🎲 Modo Livre');
    expect(texto).toContain('⚫ 2 pendentes');
    expect(texto).toContain('🟢 1 certo');
    expect(texto).toContain('🔴 1 errado');
  });
});
