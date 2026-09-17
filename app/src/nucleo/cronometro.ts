import type { Relogio } from './tempo';

/**
 * Tempo de jogo de uma partida.
 *
 * Duas diferenças em relação ao site atual, ambas correções de bug:
 *
 *  - **Só conta com a aba ativa.** O código legado guardava `inicioPartida` e
 *    media `Date.now() - inicio`, então reabrir o Desafio Diário à noite cobrava
 *    a penalidade de tempo do dia inteiro. Aqui o tempo acumula apenas entre
 *    `retomar()` e `pausar()`, que a UI liga ao `visibilitychange`.
 *  - **Não roda `setInterval` por dentro.** O relógio é um valor derivado; quem
 *    faz o tique de 1s para redesenhar é a UI. Isso torna a classe testável e
 *    elimina o timer órfão que o modelo legado podia deixar vivo.
 */
export class Cronometro {
  #acumuladoMs: number;
  #retomadoEm: number | null = null;
  #agora: Relogio;

  /** Limite em segundos, ou `null` para partida sem tempo. */
  limiteSegundos: number | null;

  constructor(opcoes: {
    acumuladoMs?: number;
    limiteSegundos?: number | null;
    agora?: Relogio;
  } = {}) {
    this.#acumuladoMs = opcoes.acumuladoMs ?? 0;
    this.limiteSegundos = opcoes.limiteSegundos ?? null;
    this.#agora = opcoes.agora ?? Date.now;
  }

  get rodando(): boolean {
    return this.#retomadoEm !== null;
  }

  retomar(): void {
    if (this.#retomadoEm === null) this.#retomadoEm = this.#agora();
  }

  pausar(): void {
    if (this.#retomadoEm === null) return;
    this.#acumuladoMs += this.#agora() - this.#retomadoEm;
    this.#retomadoEm = null;
  }

  get decorridoMs(): number {
    const emCurso = this.#retomadoEm === null ? 0 : this.#agora() - this.#retomadoEm;
    return this.#acumuladoMs + emCurso;
  }

  get decorridoSegundos(): number {
    return Math.floor(this.decorridoMs / 1000);
  }

  /** Segundos restantes, ou `null` quando a partida não tem limite. */
  get restanteSegundos(): number | null {
    if (this.limiteSegundos === null) return null;
    return Math.max(0, this.limiteSegundos - this.decorridoSegundos);
  }

  get esgotado(): boolean {
    return this.restanteSegundos === 0;
  }

  /** Estado serializável — persiste o acumulado, nunca um timestamp de início. */
  paraJSON(): { acumuladoMs: number } {
    return { acumuladoMs: this.decorridoMs };
  }

  static deJSON(
    dados: { acumuladoMs?: unknown } | null | undefined,
    opcoes: { limiteSegundos?: number | null; agora?: Relogio } = {},
  ): Cronometro {
    const bruto = dados?.acumuladoMs;
    const acumuladoMs = typeof bruto === 'number' && Number.isFinite(bruto) && bruto >= 0 ? bruto : 0;
    return new Cronometro({ acumuladoMs, ...opcoes });
  }
}
