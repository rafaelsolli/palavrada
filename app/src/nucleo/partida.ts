import { TAMANHO_PALAVRA, delta as calcularDelta, normalizar, valoresPalavra } from './ondas';
import { pontuarJogada, pontuacaoFinal, gerarExtrato, type Jogada, type Extrato } from './pontuacao';
import type { Config } from '../config/definicoes';

export const MAX_TENTATIVAS = 6;

/** Um palpite já resolvido. `penalizada` marca a inválida que gastou a vez. */
export interface Tentativa {
  palavra: string;
  valores: number[];
  delta: number;
  ganhou: boolean;
  penalizada: boolean;
  /** O jogador pode ocultar um palpite clicando nele no histórico. */
  visivel: boolean;
}

/** O que uma tecla provocou. A UI decide o que animar a partir disto. */
export type Acao =
  | { tipo: 'letra'; letra: string; indice: number }
  | { tipo: 'edicao' }
  | { tipo: 'navegacao' }
  | { tipo: 'erro'; motivo: 'incompleta' | 'invalida' }
  | { tipo: 'tentativa'; tentativa: Tentativa; ganhou: boolean; encerrou: boolean };

/**
 * O que a partida precisa saber do mundo. São funções, e não valores, porque
 * config e tempo mudam durante o jogo — e porque assim o teste controla os dois.
 */
export interface ContextoPartida {
  ehValida(palavra: string): boolean;
  config(): Config;
  tempoSegundos(): number;
}

export type Revelacao = 'ganhou' | 'perdeu' | null;

/**
 * Estado de uma partida.
 *
 * Diferente do modelo legado, aqui não há `setInterval` (o tempo é do
 * `Cronometro`) nem cálculo de pontuação embutido (é do módulo `pontuacao`).
 * A classe cuida só das regras: o que cada tecla faz e quando a partida acaba.
 */
export class Partida {
  readonly palavraAlvo: string;
  readonly valoresAlvo: number[];

  tentativas: Tentativa[] = [];
  jogadas: Jogada[] = [];
  atual: string[] = Array(TAMANHO_PALAVRA).fill('');
  indiceFoco = 0;
  letrasFixas: boolean[] = Array(TAMANHO_PALAVRA).fill(false);
  encerrada = false;
  revelado: Revelacao = null;

  /** Posição na navegação pelo histórico com ↑/↓. -1 = digitando um palpite novo. */
  #navegacao = -1;
  readonly #ctx: ContextoPartida;

  constructor(palavraAlvo: string, contexto: ContextoPartida) {
    this.palavraAlvo = normalizar(palavraAlvo);
    this.valoresAlvo = valoresPalavra(this.palavraAlvo);
    this.#ctx = contexto;
  }

  get ganhou(): boolean {
    return this.tentativas.some((t) => t.ganhou);
  }

  get pontuacao(): number {
    return pontuacaoFinal(this.jogadas, this.ganhou);
  }

  extrato(): Extrato {
    return gerarExtrato(this.jogadas, this.ganhou);
  }

  // ── Entrada ───────────────────────────────────────────────────────────────

  /** Processa uma tecla e devolve o que aconteceu, ou `null` se foi ignorada. */
  tecla(k: string): Acao | null {
    if (this.encerrada) return null;
    this.#navegacao = -1;

    if (k === '⌫') return this.#apagar();
    if (k === 'ENTER') return this.#submeter();

    const letra = normalizar(k);
    if (letra.length !== 1) return null;
    return this.#digitar(letra);
  }

  #apagar(): Acao {
    const i = this.indiceFoco;
    // Apaga no lugar quando há letra livre sob o cursor; caso contrário recua
    // para a posição livre anterior e apaga lá.
    const alvo = this.letrasFixas[i] || !this.atual[i] ? this.#anteriorLivre(i) : i;
    if (alvo !== -1) {
      this.indiceFoco = alvo;
      this.atual[alvo] = '';
    }
    return { tipo: 'edicao' };
  }

  #digitar(letra: string): Acao {
    // Cursor sobre letra travada: só pula adiante, sem escrever.
    if (this.letrasFixas[this.indiceFoco]) {
      const prox = this.#proximoLivre(this.indiceFoco + 1);
      if (prox !== -1) this.indiceFoco = prox;
      return { tipo: 'edicao' };
    }

    const indice = this.indiceFoco;
    this.atual[indice] = letra;

    const prox = this.atual.findIndex((v, i) => i > indice && !v && !this.letrasFixas[i]);
    if (prox !== -1) this.indiceFoco = prox;

    return { tipo: 'letra', letra, indice };
  }

  #submeter(): Acao {
    if (!this.atual.every(Boolean)) {
      return { tipo: 'erro', motivo: 'incompleta' };
    }

    const palavra = this.atual.join('');
    const modo = this.#ctx.config().palavrasInvalidas;
    const invalida = modo !== 'aceitar' && !this.#ctx.ehValida(palavra);

    if (invalida) {
      this.#registrarJogada(palavra, null, true);
      // "recusar" devolve a vez; "penalizar" gasta o palpite.
      if (modo === 'recusar') return { tipo: 'erro', motivo: 'invalida' };
      return this.#concluirTentativa({
        palavra,
        valores: [],
        delta: 0,
        ganhou: false,
        penalizada: true,
        visivel: false,
      });
    }

    const valores = valoresPalavra(palavra);
    const delta = calcularDelta(valores, this.valoresAlvo);
    const ganhou = delta === 0;

    this.#registrarJogada(palavra, delta, false);
    return this.#concluirTentativa({
      palavra,
      valores,
      delta,
      ganhou,
      penalizada: false,
      visivel: true,
    });
  }

  #registrarJogada(palavra: string, delta: number | null, invalida: boolean): void {
    this.jogadas.push(
      pontuarJogada({
        palavra,
        tempoSegundos: this.#ctx.tempoSegundos(),
        delta,
        invalida,
        config: this.#ctx.config(),
      }),
    );
  }

  #concluirTentativa(tentativa: Tentativa): Acao {
    this.tentativas.push(tentativa);
    const encerrou = tentativa.ganhou || this.tentativas.length >= MAX_TENTATIVAS;

    if (encerrou) {
      this.encerrada = true;
    } else {
      this.atual = Array(TAMANHO_PALAVRA).fill('');
      this.indiceFoco = 0;
    }

    return { tipo: 'tentativa', tentativa, ganhou: tentativa.ganhou, encerrou };
  }

  // ── Navegação e foco ──────────────────────────────────────────────────────

  focar(indice: number): void {
    if (this.encerrada) return;
    this.indiceFoco = Math.min(Math.max(indice, 0), TAMANHO_PALAVRA - 1);
  }

  /** Traz um palpite anterior de volta para a grade. `minimo` respeita o limite
   *  de palpites visíveis: não dá para recuperar o que está oculto. */
  navegarCima(minimo = 0): Acao | null {
    if (!this.tentativas.length || this.encerrada) return null;
    if (this.#navegacao === minimo) return null;

    this.#navegacao = this.#navegacao === -1 ? this.tentativas.length - 1 : this.#navegacao - 1;
    this.atual = [...this.tentativas[this.#navegacao]!.palavra];
    return { tipo: 'navegacao' };
  }

  navegarBaixo(): Acao | null {
    if (this.#navegacao === -1) return null;

    if (this.#navegacao === this.tentativas.length - 1) {
      this.#navegacao = -1;
      this.atual = Array(TAMANHO_PALAVRA).fill('');
    } else {
      this.#navegacao += 1;
      this.atual = [...this.tentativas[this.#navegacao]!.palavra];
    }
    return { tipo: 'navegacao' };
  }

  alternarVisibilidade(indice: number): void {
    const t = this.tentativas[indice];
    if (t) t.visivel = !t.visivel;
  }

  // ── Fim de partida ────────────────────────────────────────────────────────

  /** Trava na grade as letras já acertadas na posição certa. */
  fixar(): void {
    for (const t of this.tentativas) {
      if (t.penalizada) continue;
      for (let i = 0; i < TAMANHO_PALAVRA; i++) {
        if (t.palavra[i] === this.palavraAlvo[i]) {
          this.letrasFixas[i] = true;
          this.atual[i] = t.palavra[i]!;
        }
      }
    }
  }

  /** Mostra a resposta na grade quando a partida acaba, ganhando ou perdendo. */
  revelarResposta(ganhou: boolean): void {
    this.atual = [...this.palavraAlvo];
    this.revelado = ganhou ? 'ganhou' : 'perdeu';
  }

  /** Encerra por tempo esgotado. */
  encerrarPorTempo(): void {
    if (this.encerrada) return;
    this.encerrada = true;
    this.revelarResposta(false);
  }

  #proximoLivre(de: number): number {
    for (let i = de; i < TAMANHO_PALAVRA; i++) if (!this.letrasFixas[i]) return i;
    return -1;
  }

  #anteriorLivre(de: number): number {
    for (let i = de - 1; i >= 0; i--) if (!this.letrasFixas[i]) return i;
    return -1;
  }
}
