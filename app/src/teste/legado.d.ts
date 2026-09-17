/**
 * Tipos mínimos para os módulos do site publicado, importados pelos testes de
 * compatibilidade. Some junto com a pasta js/ na virada.
 */
declare module '*/js/nucleo/partida.js' {
  export class Partida {
    constructor(palavraAlvo: string);
    palavraAlvo: string;
    atual: string[];
    tentativas: { palavra: string; delta: number; ganhou: boolean; penalizada?: boolean }[];
    historicoJogadas: {
      palavra: string;
      tempoSegundos: number;
      penalidade: number;
      ehInvalida: boolean;
      delta?: number;
    }[];
    encerrada: boolean;
    tempoRestante: number | null;
    inicioPartida: number;
    tecla(k: string): unknown;
    restaurar(sessao: unknown): void;
    calcularPontuacaoAtual(): number;
  }
}

declare module '*/js/configuracoes.js' {
  export function carregarConfig(): Record<string, unknown>;
  export function salvarConfig(chave: string, valor: unknown): void;
  export function cfg(): Record<string, unknown>;
}

declare module '*/js/modos/base/modalSeletor.js' {
  export function carregarProgresso(): {
    jogados: { id: number; ganhou: boolean; tentativas: number }[];
  };
  export function carregarProgressoLivrissimo(): {
    jogados: { id: number; ganhou: boolean; tentativas: number }[];
  };
  export function salvarResultadoLivre(id: number, ganhou: boolean, tentativas: number): void;
  export function salvarResultadoLivrissimo(id: number, ganhou: boolean, tentativas: number): void;
}
