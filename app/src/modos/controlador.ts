import { Partida, MAX_TENTATIVAS, type Acao, type Tentativa } from '../nucleo/partida';
import { Cronometro } from '../nucleo/cronometro';
import type { Lexico } from '../nucleo/lexico';
import type { Relogio } from '../nucleo/tempo';
import { limiteEmSegundos, type Config } from '../config/definicoes';
import {
  aplicarResultadoDiario,
  carregarStats,
  chaveSessao,
  carregarSessao,
  limparSessao,
  registrarResultado,
  salvarStats,
  salvarSessao,
  type StatsDiario,
} from '../nucleo/armazenamento';
import { palavraDoDia } from './palavraDoDia';
import type { ModoDefinicao } from './tipos';
import { textoCompartilhamento } from './compartilhar';

/**
 * A mecânica de uma partida, igual para os três modos.
 *
 * É o que sobra depois de tirar dos três arquivos de modo legados tudo que era
 * cópia: tratamento de teclas, encerramento, persistência, cronômetro e
 * compartilhamento. O que diferencia um modo do outro está no `ModoDefinicao`.
 *
 * Não toca no DOM: expõe um instantâneo que a interface lê depois de cada ação.
 */

export interface OpcoesControlador {
  modo: ModoDefinicao;
  indice: number;
  lexico: Lexico;
  /** Lida a cada uso, porque o jogador pode mudar as opções no meio da partida. */
  config: () => Config;
  base: string;
  agora?: Relogio;
}

export interface Instantaneo {
  atual: readonly string[];
  indiceFoco: number;
  letrasFixas: readonly boolean[];
  tentativas: readonly Tentativa[];
  valoresAlvo: readonly number[];
  palavraAlvo: string;
  revelado: 'ganhou' | 'perdeu' | null;
  encerrada: boolean;
  ganhou: boolean;
  /** Sugestão do autocomplete, ou `null` quando a opção está desligada. */
  sugestao: string | null;
  /** Segundos restantes, ou `null` quando a partida não tem limite. */
  restanteSegundos: number | null;
}

// A pontuação não entra aqui de propósito: ela é a nota final, que vale zero
// enquanto a partida não foi vencida. Só faz sentido no modal de resultado e no
// texto de compartilhamento, que a leem de `partida.pontuacao`.

export class ControladorJogo {
  readonly modo: ModoDefinicao;
  readonly indice: number;
  readonly partida: Partida;
  readonly cronometro: Cronometro;

  /** Disparado quando a partida acaba, por acerto, palpites ou tempo. */
  aoEncerrar: ((ganhou: boolean) => void) | null = null;

  readonly #lexico: Lexico;
  readonly #config: () => Config;
  readonly #base: string;
  readonly #chaveSessao: string;
  #statsDiario: StatsDiario | null = null;

  constructor(opcoes: OpcoesControlador) {
    this.modo = opcoes.modo;
    this.indice = opcoes.indice;
    this.#lexico = opcoes.lexico;
    this.#config = opcoes.config;
    this.#base = opcoes.base;

    const palavra =
      opcoes.modo.param === null
        ? palavraDoDia(opcoes.indice, opcoes.lexico.palavras)
        : opcoes.lexico.palavras[opcoes.indice];

    if (!palavra) throw new Error(`Desafio ${opcoes.indice} não existe neste modo`);

    this.partida = new Partida(palavra, {
      ehValida: (p) => this.#lexico.ehValida(p),
      config: this.#config,
      tempoSegundos: () => this.cronometro.decorridoSegundos,
    });

    this.#chaveSessao = chaveSessao(
      opcoes.modo.persistencia ?? 'diario',
      opcoes.indice,
    );

    this.cronometro = new Cronometro({
      limiteSegundos: limiteEmSegundos(this.#config()),
      agora: opcoes.agora,
    });
  }

  /** Repõe a sessão salva, se houver, e liga o cronômetro. Devolve se restaurou. */
  iniciar(): boolean {
    const sessao = carregarSessao(this.#chaveSessao);
    if (sessao) {
      this.partida.restaurar(sessao);
      this.cronometro.acumular(sessao.cronometroMs);
      if (this.#config().fixarLetrasAcertadas && !this.partida.encerrada) this.partida.fixar();
    }

    if (!this.partida.encerrada) this.cronometro.retomar();
    return sessao !== null;
  }

  /** Pausa a contagem — a interface liga isto ao `visibilitychange`. */
  pausar(): void {
    this.cronometro.pausar();
    if (!this.partida.encerrada) this.#persistir();
  }

  retomar(): void {
    if (!this.partida.encerrada) this.cronometro.retomar();
  }

  // ── Entrada ───────────────────────────────────────────────────────────────

  tecla(k: string): Acao | null {
    switch (k) {
      case '←':
        this.partida.focar(this.partida.indiceFoco - 1);
        return { tipo: 'edicao' };
      case '→':
        this.partida.focar(this.partida.indiceFoco + 1);
        return { tipo: 'edicao' };
      case '↑':
        return this.partida.navegarCima(this.#primeiroVisivel());
      case '↓':
        return this.partida.navegarBaixo();
    }

    const acao = this.partida.tecla(k);
    if (acao?.tipo === 'tentativa') this.#apósTentativa(acao.encerrou, acao.ganhou);
    return acao;
  }

  /** Não dá para recuperar com ↑ um palpite que o limite de visíveis escondeu. */
  #primeiroVisivel(): number {
    const max = this.#config().maxPalpites;
    return max > 0 ? Math.max(0, this.partida.tentativas.length - max) : 0;
  }

  #apósTentativa(encerrou: boolean, ganhou: boolean): void {
    if (this.#config().fixarLetrasAcertadas && !encerrou) this.partida.fixar();
    if (encerrou) this.partida.revelarResposta(ganhou);
    this.#persistir();
    if (encerrou) this.#encerrar(ganhou);
  }

  /** Chamado pelo tique da interface; encerra se o tempo acabou. */
  verificarTempo(): boolean {
    if (this.partida.encerrada || !this.cronometro.esgotado) return false;
    this.partida.encerrarPorTempo();
    this.#persistir();
    this.#encerrar(false);
    return true;
  }

  #encerrar(ganhou: boolean): void {
    this.cronometro.pausar();

    if (this.modo.persistencia) {
      registrarResultado(this.modo.persistencia, this.indice, ganhou, this.partida.tentativas.length);
    } else {
      this.#statsDiario = aplicarResultadoDiario(carregarStats(), this.indice, ganhou);
      salvarStats(this.#statsDiario);
    }

    this.aoEncerrar?.(ganhou);
  }

  #persistir(): void {
    salvarSessao(this.#chaveSessao, {
      tentativas: this.partida.tentativas,
      jogadas: this.partida.jogadas,
      encerrada: this.partida.encerrada,
      ganhou: this.partida.ganhou,
      cronometroMs: this.cronometro.decorridoMs,
    });
  }

  descartarSessao(): void {
    limparSessao(this.#chaveSessao);
  }

  // ── Leitura ───────────────────────────────────────────────────────────────

  /** Estatísticas do diário, já com o resultado desta partida aplicado. */
  get statsDiario(): StatsDiario {
    return this.#statsDiario ?? carregarStats();
  }

  get instantaneo(): Instantaneo {
    const config = this.#config();
    const p = this.partida;
    return {
      atual: p.atual,
      indiceFoco: p.indiceFoco,
      letrasFixas: p.letrasFixas,
      tentativas: p.tentativas,
      valoresAlvo: p.valoresAlvo,
      palavraAlvo: p.palavraAlvo,
      revelado: p.revelado,
      encerrada: p.encerrada,
      ganhou: p.ganhou,
      sugestao: config.autocomplete && !p.revelado ? this.#lexico.sugerir(p.atual) : null,
      restanteSegundos: this.cronometro.restanteSegundos,
    };
  }

  get tentativasRestantes(): number {
    return MAX_TENTATIVAS - this.partida.tentativas.length;
  }

  textoCompartilhamento(): string {
    return textoCompartilhamento({
      modo: this.modo,
      indice: this.indice,
      tentativas: this.partida.tentativas,
      ganhou: this.partida.ganhou,
      pontuacao: this.#config().exibirPontuacao ? this.partida.pontuacao : null,
      base: this.#base,
    });
  }
}
