import { CHAVES, DEFINICOES, type ChaveConfig, type Config } from '../config/definicoes';

/**
 * Pontuação: começa em 1000 e cada palpite desconta
 *
 *     [base + delta + tempo] × agravantes
 *
 * Os agravantes são um multiplicador derivado das configurações — o que facilita
 * o jogo encarece o palpite, o que dificulta barateia.
 *
 * Duas mudanças em relação ao site atual:
 *
 *  - **O agravante é congelado no palpite.** O extrato legado chamava
 *    `calcularAgravantes()` na hora de renderizar, com a config daquele momento,
 *    então mexer nas opções depois da partida reescrevia o passado. Aqui cada
 *    jogada carrega o multiplicador e a memória de cálculo que valiam quando ela
 *    foi feita.
 *  - **Multiplicador e memória de cálculo saem do mesmo lugar.** Eram duas
 *    funções paralelas (`calcularAgravantes` e `calcularBreakdownAgravantes`)
 *    que podiam divergir ao se acrescentar uma opção.
 */

export const PONTOS_BASE = 1000;
export const PENALIDADE_BASE_PALPITE = 100;
export const PENALIDADE_PALAVRA_INVALIDA = 100;
export const PENALIDADE_DERROTA = 1000;

export interface FatorAgravante {
  rotulo: string;
  fator: number;
}

/** Fatores ativos, na ordem das definições. */
export function fatoresAgravantes(config: Config): FatorAgravante[] {
  const fatores: FatorAgravante[] = [];
  for (const chave of CHAVES) {
    const def = DEFINICOES[chave] as {
      agravante?: (v: never, c: Config) => number;
      rotuloAgravante?: string;
    };
    if (!def.agravante) continue;
    const fator = def.agravante(config[chave] as never, config);
    fatores.push({ rotulo: def.rotuloAgravante ?? chave, fator });
  }
  return fatores;
}

/** Multiplicador total de agravantes. */
export function calcularAgravantes(config: Config): number {
  return fatoresAgravantes(config).reduce((total, f) => total * f.fator, 1);
}

/**
 * Só os fatores que mudam alguma coisa, para a linha "Agrav. =" do extrato.
 * Um fator que arredonda para 100% é ruído visual.
 */
export function detalharAgravantes(config: Config): FatorAgravante[] {
  return fatoresAgravantes(config).filter((f) => Math.round(f.fator * 100) !== 100);
}

/** Penalidade por tempo: quanto mais a partida se arrasta, mais caro o segundo. */
export function penalidadeTempo(segundos: number): number {
  const s = Math.max(0, segundos);
  if (s < 20) return s * 0.5;
  if (s < 60) return s * 1.0;
  if (s < 180) return s * 1.5;
  return s * 2.0;
}

/** Uma jogada já pontuada. Tudo que o extrato precisa está congelado aqui. */
export interface Jogada {
  palavra: string;
  tempoSegundos: number;
  /** `null` quando a palavra era inválida e não chegou a virar onda. */
  delta: number | null;
  invalida: boolean;
  penalidade: number;
  agravante: number;
  fatores: FatorAgravante[];
}

/**
 * Pontua um palpite com a config vigente naquele instante.
 *
 * Palavra inválida custa um valor fixo, sem tempo e sem agravantes — do
 * contrário a opção "aceitar inválidas" se pagaria sozinha.
 */
export function pontuarJogada(entrada: {
  palavra: string;
  tempoSegundos: number;
  delta: number | null;
  invalida: boolean;
  config: Config;
}): Jogada {
  const { palavra, tempoSegundos, delta, invalida, config } = entrada;

  if (invalida) {
    return {
      palavra,
      tempoSegundos,
      delta: null,
      invalida: true,
      penalidade: PENALIDADE_PALAVRA_INVALIDA,
      agravante: 1,
      fatores: [],
    };
  }

  const fatores = fatoresAgravantes(config);
  const agravante = fatores.reduce((total, f) => total * f.fator, 1);
  const bruto = PENALIDADE_BASE_PALPITE + penalidadeTempo(tempoSegundos) + (delta ?? 0);

  return {
    palavra,
    tempoSegundos,
    delta,
    invalida: false,
    penalidade: Math.round(bruto * agravante),
    agravante,
    fatores: fatores.filter((f) => Math.round(f.fator * 100) !== 100),
  };
}

/** Perder zera a pontuação; ganhar guarda o que sobrou dos 1000. */
export function pontuacaoFinal(jogadas: readonly Jogada[], ganhou: boolean): number {
  if (!ganhou) return 0;
  const gasto = jogadas.reduce((total, j) => total + j.penalidade, 0);
  return Math.max(0, PONTOS_BASE - gasto);
}

export interface LinhaExtrato {
  descricao: string;
  memoria: string | null;
  valor: number;
}

export interface Extrato {
  base: number;
  linhas: LinhaExtrato[];
  memoriaAgravantes: string;
  total: number;
}

function porcentagem(fator: number): string {
  return `${Math.round(fator * 100)}%`;
}

/**
 * Extrato para o modal de resultado, montado a partir do que foi congelado em
 * cada jogada — nunca recalculando com a config atual.
 */
export function gerarExtrato(jogadas: readonly Jogada[], ganhou: boolean): Extrato {
  const validas = jogadas.filter((j) => !j.invalida);
  const invalidas = jogadas.filter((j) => j.invalida);

  const linhas: LinhaExtrato[] = validas.map((j, i) => ({
    descricao: `${i + 1}º palpite ${j.palavra}`,
    memoria:
      `[${PENALIDADE_BASE_PALPITE} (base) + ${Math.round(j.delta ?? 0)} (delta)` +
      ` + ${Math.round(penalidadeTempo(j.tempoSegundos))} (tempo)] × ${porcentagem(j.agravante)} (agrav.)`,
    valor: -j.penalidade,
  }));

  const gastoInvalidas = invalidas.reduce((total, j) => total + j.penalidade, 0);
  if (gastoInvalidas > 0) {
    linhas.push({ descricao: 'Palavras inválidas', memoria: null, valor: -gastoInvalidas });
  }

  if (!ganhou) {
    linhas.push({ descricao: 'Derrota', memoria: null, valor: -PENALIDADE_DERROTA });
  }

  // A memória de cálculo mostra o agravante do último palpite, que é o que o
  // jogador acabou de ver acontecer. Sem palpites, mostra a config neutra.
  const ultima = validas.at(-1);
  const fatores = ultima?.fatores ?? [];
  const memoriaAgravantes = fatores.length
    ? `${fatores.map((f) => `${porcentagem(f.fator)} (${f.rotulo})`).join(' × ')} = ${porcentagem(ultima!.agravante)}`
    : '100% (configuração padrão)';

  return {
    base: PONTOS_BASE,
    linhas,
    memoriaAgravantes,
    total: pontuacaoFinal(jogadas, ganhou),
  };
}

/** Utilitário só para os testes de paridade com a implementação legada. */
export type { ChaveConfig };
