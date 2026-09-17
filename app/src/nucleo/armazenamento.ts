import { sanearConfig, type Config } from '../config/definicoes';
import type { Tentativa } from './partida';
import type { Jogada } from './pontuacao';

/**
 * Tudo que o jogo guarda no navegador.
 *
 * O localStorage é entrada não confiável: pode vir de uma versão antiga do jogo,
 * ter sido editado à mão, ou estar indisponível (Safari privado lança ao
 * escrever). Toda leitura é validada e toda escrita é tolerante a falha — perder
 * o progresso é ruim, mas quebrar o jogo é pior.
 *
 * As chaves são as mesmas do site atual, de propósito: como o beta roda na mesma
 * origem, ele lê o progresso real de quem já joga.
 */

export type ModoPersistido = 'livre' | 'livrissimo';

const CHAVE_CONFIG = 'palavrada.config';
const CHAVE_STATS = 'palavrada.diario';
const CHAVE_TUTORIAL = 'palavrada.tutorial';
const CHAVE_PROGRESSO: Record<ModoPersistido, string> = {
  livre: 'palavrada.livre',
  livrissimo: 'palavrada.livrissimo',
};

// ── Acesso cru, sempre tolerante a falha ────────────────────────────────────

function lerBruto(chave: string): unknown {
  try {
    const cru = localStorage.getItem(chave);
    return cru === null ? null : JSON.parse(cru);
  } catch {
    return null;
  }
}

function escrever(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Cota estourada ou armazenamento bloqueado: seguir sem persistir.
  }
}

function remover(chave: string): void {
  try {
    localStorage.removeItem(chave);
  } catch {
    /* idem */
  }
}

function chaves(): string[] {
  try {
    return Object.keys(localStorage);
  } catch {
    return [];
  }
}

const ehObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const inteiro = (v: unknown, padrao: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : padrao;

// ── Configuração ────────────────────────────────────────────────────────────

export function carregarConfig(): Config {
  return sanearConfig(lerBruto(CHAVE_CONFIG));
}

export function salvarConfig(config: Config): void {
  escrever(CHAVE_CONFIG, config);
}

// ── Estatísticas do Desafio Diário ──────────────────────────────────────────

export interface StatsDiario {
  jogadas: number;
  vitorias: number;
  sequencia: number;
  ultimoDiaVencido: number;
}

const STATS_VAZIO: StatsDiario = { jogadas: 0, vitorias: 0, sequencia: 0, ultimoDiaVencido: -1 };

export function carregarStats(): StatsDiario {
  const bruto = lerBruto(CHAVE_STATS);
  if (!ehObjeto(bruto)) return { ...STATS_VAZIO };
  return {
    jogadas: inteiro(bruto.jogadas, 0),
    vitorias: inteiro(bruto.vitorias, 0),
    sequencia: inteiro(bruto.sequencia, 0),
    ultimoDiaVencido: inteiro(bruto.ultimoDiaVencido, -1),
  };
}

export function salvarStats(stats: StatsDiario): void {
  escrever(CHAVE_STATS, stats);
}

/**
 * Aplica o resultado do dia às estatísticas.
 *
 * A sequência só continua se o último dia vencido foi ontem — ou hoje, no caso
 * de a função ser chamada duas vezes para a mesma partida.
 */
export function aplicarResultadoDiario(
  stats: StatsDiario,
  dia: number,
  ganhou: boolean,
): StatsDiario {
  const novo: StatsDiario = { ...stats, jogadas: stats.jogadas + 1 };

  if (ganhou) {
    novo.vitorias += 1;
    const emSequencia = stats.ultimoDiaVencido === dia - 1 || stats.ultimoDiaVencido === dia;
    novo.sequencia = emSequencia ? stats.sequencia + 1 : 1;
    novo.ultimoDiaVencido = dia;
  } else if (stats.ultimoDiaVencido !== dia) {
    novo.sequencia = 0;
  }

  return novo;
}

// ── Progresso dos modos Livre e Livríssimo ──────────────────────────────────

export interface DesafioJogado {
  id: number;
  ganhou: boolean;
  tentativas: number;
}

export interface Progresso {
  jogados: DesafioJogado[];
}

export function carregarProgresso(modo: ModoPersistido): Progresso {
  const bruto = lerBruto(CHAVE_PROGRESSO[modo]);
  if (!ehObjeto(bruto) || !Array.isArray(bruto.jogados)) return { jogados: [] };

  const jogados = bruto.jogados
    .filter(ehObjeto)
    .filter((j) => typeof j.id === 'number' && Number.isInteger(j.id) && j.id >= 0)
    .map((j) => ({
      id: j.id as number,
      ganhou: j.ganhou === true,
      tentativas: inteiro(j.tentativas, 0),
    }));

  return { jogados };
}

export function registrarResultado(
  modo: ModoPersistido,
  id: number,
  ganhou: boolean,
  tentativas: number,
): Progresso {
  const progresso = carregarProgresso(modo);
  progresso.jogados = progresso.jogados.filter((j) => j.id !== id);
  progresso.jogados.push({ id, ganhou, tentativas });
  escrever(CHAVE_PROGRESSO[modo], progresso);
  return progresso;
}

export function jaJogado(modo: ModoPersistido, id: number): boolean {
  return carregarProgresso(modo).jogados.some((j) => j.id === id);
}

// ── Sessão em andamento ─────────────────────────────────────────────────────

export interface SessaoSalva {
  tentativas: Tentativa[];
  jogadas: Jogada[];
  encerrada: boolean;
  ganhou: boolean;
  /** Tempo de jogo acumulado, em ms. Nunca um instante de início. */
  cronometroMs: number;
}

/**
 * Chave da sessão. O identificador entra na chave — para o diário é o número do
 * dia — de modo que a sessão de ontem simplesmente não é encontrada hoje, sem
 * precisar comparar datas ao ler.
 */
export function chaveSessao(modo: 'diario' | ModoPersistido, id: number): string {
  return `palavrada.${modo}.sessao.${id}`;
}

export function carregarSessao(chave: string): SessaoSalva | null {
  const bruto = lerBruto(chave);
  if (!ehObjeto(bruto)) return null;
  if (!Array.isArray(bruto.tentativas)) return null;

  return {
    tentativas: bruto.tentativas.filter(ehObjeto) as unknown as Tentativa[],
    jogadas: (Array.isArray(bruto.jogadas) ? bruto.jogadas.filter(ehObjeto) : []) as unknown as Jogada[],
    encerrada: bruto.encerrada === true,
    ganhou: bruto.ganhou === true,
    cronometroMs: Math.max(0, inteiro(bruto.cronometroMs, 0)),
  };
}

export function salvarSessao(chave: string, sessao: SessaoSalva): void {
  escrever(chave, sessao);
}

export function limparSessao(chave: string): void {
  remover(chave);
}

/**
 * Apaga sessões diárias de dias anteriores.
 *
 * O site atual nunca fazia isso: cada dia jogado deixava uma chave para sempre.
 * Quem joga há um ano carrega 365 sessões mortas.
 */
export function limparSessoesDiariasAntigas(diaAtual: number): number {
  const prefixo = 'palavrada.diario.sessao.';
  let apagadas = 0;
  for (const chave of chaves()) {
    if (!chave.startsWith(prefixo)) continue;
    const dia = Number(chave.slice(prefixo.length));
    if (Number.isFinite(dia) && dia < diaAtual) {
      remover(chave);
      apagadas++;
    }
  }
  return apagadas;
}

// ── Tutorial ────────────────────────────────────────────────────────────────

export function tutorialJaVisto(): boolean {
  try {
    return localStorage.getItem(CHAVE_TUTORIAL) !== null;
  } catch {
    return true; // sem armazenamento, não insistir com o tutorial a cada visita
  }
}

export function marcarTutorialVisto(): void {
  escrever(CHAVE_TUTORIAL, 1);
}

// ── Migração das chaves anteriores ao renomeio ──────────────────────────────

/**
 * Converte as chaves `pr_*` que o jogo usava antes de adotar o prefixo
 * `palavrada.`. Ainda há jogadores com elas, então isso precisa sobreviver à
 * reescrita — é o único motivo de este código continuar existindo.
 */
export function migrarChavesAntigas(): void {
  const stats = lerBruto('pr_s');
  if (ehObjeto(stats) && lerBruto(CHAVE_STATS) === null) {
    escrever(CHAVE_STATS, {
      jogadas: inteiro(stats.p, 0),
      vitorias: inteiro(stats.w, 0),
      sequencia: inteiro(stats.streak ?? stats.s, 0),
      ultimoDiaVencido: inteiro(stats.lastWonDay, -1),
    });
  }
  remover('pr_s');

  const progresso = lerBruto('pr_free_h');
  if (ehObjeto(progresso) && Array.isArray(progresso.played) && lerBruto(CHAVE_PROGRESSO.livre) === null) {
    const jogados = progresso.played.filter(ehObjeto).map((j) => ({
      id: inteiro(j.id, -1),
      ganhou: j.won === true,
      tentativas: inteiro(j.tries, 0),
    }));
    escrever(CHAVE_PROGRESSO.livre, { jogados: jogados.filter((j) => j.id >= 0) });
  }
  remover('pr_free_h');

  remover('pr_free');
  remover('pr_free_completed');
}
