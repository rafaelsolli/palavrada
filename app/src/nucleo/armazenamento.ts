import { sanearConfig, type Config } from '../config/definicoes';
import { TAMANHO_PALAVRA } from './ondas';
import type { Tentativa } from './partida';
import { penalidadeTempo, PENALIDADE_BASE_PALPITE, type Jogada } from './pontuacao';

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
  /** Segundos restantes, quando há tempo limite. Só para a versão antiga. */
  restanteSegundos?: number | null;
}

/**
 * Chave da sessão. O identificador entra na chave — para o diário é o número do
 * dia — de modo que a sessão de ontem simplesmente não é encontrada hoje, sem
 * precisar comparar datas ao ler.
 */
export function chaveSessao(modo: 'diario' | ModoPersistido, id: number): string {
  return `palavrada.${modo}.sessao.${id}`;
}

/**
 * Valida uma tentativa vinda do armazenamento.
 *
 * Uma tentativa sem `valores` chegaria ao desenho da curva e derrubaria a tela.
 * Tentativas penalizadas (palavras inválidas) legitimamente não têm valores, e
 * por isso recebem uma lista vazia em vez de serem descartadas.
 */
function lerTentativa(bruto: unknown): Tentativa | null {
  if (!ehObjeto(bruto) || typeof bruto.palavra !== 'string') return null;

  const penalizada = bruto.penalizada === true;
  const valores = Array.isArray(bruto.valores)
    ? bruto.valores.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    : [];

  // Sem os cinco valores não dá para desenhar a onda; só a penalizada pode
  // seguir sem eles, porque nunca é desenhada.
  if (!penalizada && valores.length !== TAMANHO_PALAVRA) return null;

  return {
    palavra: bruto.palavra,
    valores,
    delta: inteiro(bruto.delta, 0),
    ganhou: bruto.ganhou === true,
    penalizada,
    visivel: bruto.visivel !== false,
  };
}

/**
 * Converte uma jogada do formato antigo.
 *
 * O site atual grava `{palavra, tempoSegundos, penalidade, ehInvalida, delta}` e
 * recalcula os agravantes na hora de exibir. Como agora eles ficam congelados na
 * jogada, o multiplicador que valia é reconstruído a partir da própria
 * penalidade, invertendo a fórmula — assim o extrato de uma partida começada na
 * versão antiga continua batendo com os pontos já cobrados.
 */
function lerJogada(bruto: unknown): Jogada | null {
  if (!ehObjeto(bruto) || typeof bruto.palavra !== 'string') return null;

  const jaConvertida = 'invalida' in bruto;
  const invalida = jaConvertida ? bruto.invalida === true : bruto.ehInvalida === true;
  const tempoSegundos = Math.max(0, inteiro(bruto.tempoSegundos, 0));
  const penalidade = Math.max(0, inteiro(bruto.penalidade, 0));
  const delta = typeof bruto.delta === 'number' && Number.isFinite(bruto.delta)
    ? Math.trunc(bruto.delta)
    : null;

  if (jaConvertida) {
    const agravante = typeof bruto.agravante === 'number' && bruto.agravante > 0 ? bruto.agravante : 1;
    return {
      palavra: bruto.palavra,
      tempoSegundos,
      delta: invalida ? null : delta,
      invalida,
      penalidade,
      agravante,
      fatores: Array.isArray(bruto.fatores)
        ? (bruto.fatores.filter(ehObjeto) as unknown as Jogada['fatores'])
        : [],
    };
  }

  // penalidade = round((base + tempo + delta) × agravante)
  const bruta = PENALIDADE_BASE_PALPITE + penalidadeTempo(tempoSegundos) + (delta ?? 0);
  const agravante = invalida || bruta <= 0 ? 1 : penalidade / bruta;

  return {
    palavra: bruto.palavra,
    tempoSegundos,
    delta: invalida ? null : delta,
    invalida,
    penalidade,
    agravante,
    fatores: [],
  };
}

/**
 * Tempo já jogado, em ms.
 *
 * Numa sessão do formato antigo, `inicioPartida` é um instante de relógio de
 * parede: usá-lo cobraria todo o tempo em que o jogo esteve fechado, que é
 * justamente o defeito que a reescrita corrige. A reconstrução usa o tempo
 * restante quando existe, e senão o maior `tempoSegundos` já cobrado — um piso
 * seguro, que nunca inventa tempo a mais.
 */
function lerCronometro(bruto: Record<string, unknown>, jogadas: readonly Jogada[]): number {
  if (typeof bruto.cronometroMs === 'number' && Number.isFinite(bruto.cronometroMs)) {
    return Math.max(0, bruto.cronometroMs);
  }

  const limite = typeof bruto.tempoLimite === 'number' ? bruto.tempoLimite : null;
  const restante = typeof bruto.tempoRestante === 'number' ? bruto.tempoRestante : null;
  if (limite !== null && restante !== null && limite >= restante) {
    return (limite - restante) * 1000;
  }

  const maior = jogadas.reduce((m, j) => Math.max(m, j.tempoSegundos), 0);
  return maior * 1000;
}

export function carregarSessao(chave: string): SessaoSalva | null {
  const bruto = lerBruto(chave);
  if (!ehObjeto(bruto)) return null;
  if (!Array.isArray(bruto.tentativas)) return null;

  const tentativas = bruto.tentativas
    .map(lerTentativa)
    .filter((t): t is Tentativa => t !== null);

  // `historicoJogadas` é o nome antigo de `jogadas`.
  const brutasJogadas = Array.isArray(bruto.jogadas)
    ? bruto.jogadas
    : Array.isArray(bruto.historicoJogadas)
      ? bruto.historicoJogadas
      : [];
  const jogadas = brutasJogadas.map(lerJogada).filter((j): j is Jogada => j !== null);

  return {
    tentativas,
    jogadas,
    encerrada: bruto.encerrada === true,
    ganhou: bruto.ganhou === true,
    cronometroMs: lerCronometro(bruto, jogadas),
  };
}

/**
 * Grava a sessão nos dois formatos.
 *
 * Enquanto o beta e o site publicado dividem a mesma origem, a mesma chave pode
 * ser lida pelas duas versões. Escrevendo também os campos antigos, quem jogar
 * no beta e voltar para a raiz não perde o histórico de pontuação — sem isto o
 * legado recuperava os palpites mas zerava os pontos.
 *
 * Os campos extras são ignorados pela versão nova, que lê `jogadas`.
 */
export function salvarSessao(chave: string, sessao: SessaoSalva): void {
  escrever(chave, {
    ...sessao,
    historicoJogadas: sessao.jogadas.map((j) => ({
      palavra: j.palavra,
      tempoSegundos: j.tempoSegundos,
      penalidade: j.penalidade,
      ehInvalida: j.invalida,
      ...(j.delta === null ? {} : { delta: j.delta }),
    })),
    // A versão antiga mede o tempo por relógio de parede; escrever o início
    // deslocado pelo tempo já jogado dá o valor mais próximo do correto que ela
    // consegue usar, e mantém a checagem de "é de hoje?" funcionando.
    inicioPartida: Date.now() - sessao.cronometroMs,
    tempoRestante: sessao.restanteSegundos ?? null,
  });
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

// ── Rede de segurança ───────────────────────────────────────────────────────

const CHAVE_BACKUP = 'palavrada.backup.pre-reescrita';
const PREFIXOS_DO_JOGO = ['palavrada.', 'pr_'];

function chavesDoJogo(): string[] {
  return chaves().filter(
    (c) => c !== CHAVE_BACKUP && PREFIXOS_DO_JOGO.some((p) => c.startsWith(p)),
  );
}

/** Tudo que o jogo guarda, como texto — para exportar ou guardar de lado. */
export function exportarProgresso(): Record<string, string> {
  const dados: Record<string, string> = {};
  for (const chave of chavesDoJogo()) {
    try {
      const valor = localStorage.getItem(chave);
      if (valor !== null) dados[chave] = valor;
    } catch {
      /* ignora a chave ilegível */
    }
  }
  return dados;
}

export function temBackup(): boolean {
  return lerBruto(CHAVE_BACKUP) !== null;
}

/**
 * Guarda uma cópia do progresso antes de a versão nova mexer em qualquer coisa.
 *
 * Roda uma única vez e nunca é sobrescrita: a graça é preservar o estado
 * anterior à reescrita, não o de ontem. Como o beta divide a origem com o site
 * publicado, ele escreve no progresso de verdade de quem joga — esta é a
 * garantia de que dá para voltar atrás.
 */
export function garantirBackup(): boolean {
  if (temBackup()) return false;

  const dados = exportarProgresso();
  if (!Object.keys(dados).length) return false;

  escrever(CHAVE_BACKUP, { criadoEm: new Date().toISOString(), dados });
  return temBackup();
}

/** Repõe o backup por cima do estado atual. Devolve quantas chaves restaurou. */
export function restaurarBackup(): number {
  const bruto = lerBruto(CHAVE_BACKUP);
  if (!ehObjeto(bruto) || !ehObjeto(bruto.dados)) return 0;

  // Limpa o que existe hoje para que chaves criadas depois do backup não fiquem
  // para trás, misturando dois momentos diferentes.
  for (const chave of chavesDoJogo()) remover(chave);

  let repostas = 0;
  for (const [chave, valor] of Object.entries(bruto.dados)) {
    if (typeof valor !== 'string') continue;
    try {
      localStorage.setItem(chave, valor);
      repostas++;
    } catch {
      /* segue tentando as demais */
    }
  }
  return repostas;
}
