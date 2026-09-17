import { describe, it, expect } from 'vitest';
import {
  calcularAgravantes,
  detalharAgravantes,
  penalidadeTempo,
  pontuarJogada,
  pontuacaoFinal,
  gerarExtrato,
  PONTOS_BASE,
  PENALIDADE_PALAVRA_INVALIDA,
} from './pontuacao';
import { DEFINICOES, PADROES, CHAVES, type Config } from '../config/definicoes';

/**
 * Cópia literal de `calcularAgravantes` do site legado
 * (js/nucleo/pontuacao.js), incluindo a ordem das multiplicações — ponto
 * flutuante não é associativo, então a ordem faz parte do contrato.
 */
function agravantesLegado(config: Config): number {
  let a = 1.0;
  a *= 1 + (config.regraHorizontal as number) / 50;
  a *= 1 + (config.eixoY as number) / 50;
  if (config.bolinhas) a *= 1.05;
  if (config.letrasNoGrafico) a *= 1.05;
  if (config.alvoNosPalpites) a *= 1.05;
  a *= 0.82 + 0.03 * (config.maxPalpites as number);
  if (!config.fixarLetrasAcertadas) {
    a *= (config.maxPalpites as number) <= 3 ? 0.9 : 1.1;
  } else {
    a *= (config.maxPalpites as number) <= 3 ? 1.1 : 0.9;
  }
  if (config.autocomplete) a *= 2.0;
  if (config.palavrasInvalidas === 'penalizar') a *= 0.8;
  else if (config.palavrasInvalidas === 'aceitar') a *= 1.2;
  return a;
}

/** Produto cartesiano de todas as combinações de configuração possíveis. */
function* todasAsConfigs(): Generator<Config> {
  const ciclos = CHAVES.map((k) => DEFINICOES[k].ciclo as readonly unknown[]);
  const indices = CHAVES.map(() => 0);
  for (;;) {
    yield Object.fromEntries(CHAVES.map((k, i) => [k, ciclos[i]![indices[i]!]])) as Config;
    let pos = CHAVES.length - 1;
    while (pos >= 0) {
      indices[pos] = indices[pos]! + 1;
      if (indices[pos]! < ciclos[pos]!.length) break;
      indices[pos] = 0;
      pos--;
    }
    if (pos < 0) return;
  }
}

describe('calcularAgravantes', () => {
  it('é 1 na configuração padrão', () => {
    // 5 réguas (110%) × 6 palpites (100%) × fixar desligado com 6 palpites (110%)
    // não dá exatamente 1 — mas o padrão histórico do jogo é 121%.
    expect(calcularAgravantes(PADROES)).toBeCloseTo(1.21, 10);
  });

  it('bate com o legado em TODAS as combinações de configuração', () => {
    // Acumula as divergências e afirma uma vez só: um expect() por combinação
    // custaria mais que o cálculo e estoura o timeout no CI.
    const divergentes: { config: Config; novo: number; legado: number }[] = [];
    let n = 0;
    for (const config of todasAsConfigs()) {
      const novoValor = calcularAgravantes(config);
      const legado = agravantesLegado(config);
      if (novoValor !== legado && divergentes.length < 5) {
        divergentes.push({ config, novo: novoValor, legado });
      }
      n++;
    }
    expect(divergentes).toEqual([]);
    // 6 × 6 × 2 × 2 × 2 × 7 × 2 × 2 × 2 × 3 × 9 × 2 combinações
    expect(n).toBe(6 * 6 * 2 * 2 * 2 * 7 * 2 * 2 * 2 * 3 * 9 * 2);
  });
});

describe('detalharAgravantes', () => {
  it('omite os fatores neutros', () => {
    const fatores = detalharAgravantes(PADROES);
    expect(fatores.map((f) => f.rotulo)).toEqual(['réguas', 'fixar']);
    // "palpites" com maxPalpites=6 dá exatamente 100% e some da lista
    expect(fatores.every((f) => Math.round(f.fator * 100) !== 100)).toBe(true);
  });

  it('o produto dos fatores exibidos reproduz o multiplicador', () => {
    const produto = detalharAgravantes(PADROES).reduce((t, f) => t * f.fator, 1);
    expect(produto).toBeCloseTo(calcularAgravantes(PADROES), 10);
  });
});

describe('penalidadeTempo', () => {
  it('encarece por faixa', () => {
    expect(penalidadeTempo(10)).toBe(5); // 0,5/s
    expect(penalidadeTempo(30)).toBe(30); // 1,0/s
    expect(penalidadeTempo(100)).toBe(150); // 1,5/s
    expect(penalidadeTempo(200)).toBe(400); // 2,0/s
  });

  it('não cobra tempo negativo', () => {
    expect(penalidadeTempo(-10)).toBe(0);
  });
});

describe('pontuarJogada', () => {
  it('reproduz o exemplo documentado no modal de ajuda', () => {
    // "Palpite após 15 segundos com delta 28 e configuração padrão:
    //  [100 + 7,5 + 28] × 121% = 164 pontos"
    const j = pontuarJogada({
      palavra: 'VERSO',
      tempoSegundos: 15,
      delta: 28,
      invalida: false,
      config: PADROES,
    });
    expect(j.penalidade).toBe(164);
  });

  it('palavra inválida custa valor fixo, sem tempo nem agravantes', () => {
    const j = pontuarJogada({
      palavra: 'XXXXX',
      tempoSegundos: 300,
      delta: null,
      invalida: true,
      config: { ...PADROES, autocomplete: true },
    });
    expect(j.penalidade).toBe(PENALIDADE_PALAVRA_INVALIDA);
    expect(j.agravante).toBe(1);
  });

  it('congela o agravante no momento do palpite', () => {
    // Regressão do bug legado: o extrato recalculava com a config atual, então
    // ligar autocomplete depois da partida dobrava retroativamente a penalidade.
    const j = pontuarJogada({
      palavra: 'VERSO',
      tempoSegundos: 15,
      delta: 28,
      invalida: false,
      config: PADROES,
    });
    const antes = { ...j };

    const extratoDepois = gerarExtrato([j], true);
    expect(j).toEqual(antes);
    expect(extratoDepois.linhas[0]!.valor).toBe(-164);
    expect(extratoDepois.linhas[0]!.memoria).toContain('121%');
  });
});

describe('pontuacaoFinal', () => {
  it('desconta as penalidades dos 1000 pontos', () => {
    const j = (penalidade: number) => ({ penalidade }) as never;
    expect(pontuacaoFinal([j(164), j(200)], true)).toBe(PONTOS_BASE - 364);
  });

  it('nunca fica negativa', () => {
    const j = (penalidade: number) => ({ penalidade }) as never;
    expect(pontuacaoFinal([j(900), j(900)], true)).toBe(0);
  });

  it('derrota zera', () => {
    const j = (penalidade: number) => ({ penalidade }) as never;
    expect(pontuacaoFinal([j(10)], false)).toBe(0);
  });
});

describe('gerarExtrato', () => {
  const jogada = (over: Partial<Parameters<typeof pontuarJogada>[0]> = {}) =>
    pontuarJogada({
      palavra: 'VERSO',
      tempoSegundos: 15,
      delta: 28,
      invalida: false,
      config: PADROES,
      ...over,
    });

  it('agrupa as inválidas numa linha só', () => {
    const e = gerarExtrato(
      [jogada(), jogada({ palavra: 'XXXXX', invalida: true, delta: null }), jogada()],
      true,
    );
    const descricoes = e.linhas.map((l) => l.descricao);
    expect(descricoes).toEqual(['1º palpite VERSO', '2º palpite VERSO', 'Palavras inválidas']);
    expect(e.linhas.at(-1)!.valor).toBe(-PENALIDADE_PALAVRA_INVALIDA);
  });

  it('numera apenas os palpites válidos', () => {
    // No legado a inválida entrava na contagem e a numeração pulava.
    const e = gerarExtrato([jogada({ invalida: true, delta: null }), jogada(), jogada()], true);
    expect(e.linhas[0]!.descricao).toBe('1º palpite VERSO');
    expect(e.linhas[1]!.descricao).toBe('2º palpite VERSO');
  });

  it('acrescenta a linha de derrota e fecha em zero', () => {
    const e = gerarExtrato([jogada()], false);
    expect(e.linhas.at(-1)!.descricao).toBe('Derrota');
    expect(e.total).toBe(0);
  });

  it('sem jogadas, mostra configuração neutra', () => {
    expect(gerarExtrato([], true).memoriaAgravantes).toBe('100% (configuração padrão)');
    expect(gerarExtrato([], true).total).toBe(PONTOS_BASE);
  });
});
