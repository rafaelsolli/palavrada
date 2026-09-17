/**
 * Fonte única de verdade das configurações do jogo.
 *
 * No código legado, cada opção existia em seis lugares independentes: `PADROES`
 * em configuracoes.js, `CICLOS`/`DISPLAY`/`ID_MAP` em modalConfig.js, o markup do
 * item e o texto de ajuda em index.html, o despacho manual em `aoMudarConfig` e
 * o fator em `calcularAgravantes`. Esquecer um deles falhava em silêncio.
 *
 * Aqui uma opção é uma entrada neste objeto. O modal de configurações itera
 * sobre ele, os tipos saem inferidos e o multiplicador de agravantes é derivado.
 */

export const SECOES = ['Gráfico', 'Histórico', 'Teclado', 'Tempo', 'Interface'] as const;
export type Secao = (typeof SECOES)[number];

export const DEFINICOES = {
  regraHorizontal: {
    secao: 'Gráfico',
    rotulo: 'Réguas horizontais',
    padrao: 5,
    ciclo: [0, 5, 10, 15, 20, 25],
    ajuda:
      'Adiciona linhas de referência horizontais ao gráfico principal. Quanto mais réguas, mais fácil visualizar a altura de cada ponto da onda. Com <strong>0</strong> o gráfico fica limpo, enquanto com <strong>25</strong> cada nível do alfabeto fica marcado.',
    rotuloAgravante: 'réguas',
    agravante: (v: number) => 1 + v / 50,
  },

  eixoY: {
    secao: 'Gráfico',
    rotulo: 'Letras no eixo Y',
    padrao: 0,
    ciclo: [0, 5, 10, 15, 20, 25],
    ajuda:
      'Exibe as letras do alfabeto ao longo do eixo vertical. Dá pra ver exatamente qual letra corresponde a cada altura, sem precisar deduzir.',
    rotuloAgravante: 'eixo',
    agravante: (v: number) => 1 + v / 50,
  },

  bolinhas: {
    secao: 'Gráfico',
    rotulo: 'Bolinhas nas curvas',
    padrao: false,
    ciclo: [false, true],
    ajuda:
      'Marca com um ponto cada uma das 5 posições de cada curva no gráfico. Ajuda a identificar com precisão onde cada letra foi desenhada, especialmente quando as curvas estão próximas e difíceis de distinguir.',
    rotuloAgravante: 'bolinhas',
    agravante: (v: boolean) => (v ? 1.05 : 1),
  },

  letrasNoGrafico: {
    secao: 'Gráfico',
    rotulo: 'Letras no último palpite',
    padrao: false,
    ciclo: [false, true],
    ajuda:
      'Mostra as 5 letras do último palpite diretamente sobre sua curva no gráfico principal. Cada letra aparece acima do ponto correspondente.',
    rotuloAgravante: 'letras',
    agravante: (v: boolean) => (v ? 1.05 : 1),
  },

  alvoNosPalpites: {
    secao: 'Histórico',
    rotulo: 'Mostrar onda-alvo',
    padrao: false,
    ciclo: [false, true],
    ajuda:
      'Exibe a onda da <strong>palavra-alvo</strong> em azul nas miniaturas de cada palpite no histórico. Permite comparar cada tentativa com o alvo sem precisar olhar para o gráfico principal.',
    rotuloAgravante: 'alvo',
    agravante: (v: boolean) => (v ? 1.05 : 1),
  },

  maxPalpites: {
    secao: 'Histórico',
    rotulo: 'Palpites visíveis',
    padrao: 6,
    ciclo: [0, 1, 2, 3, 4, 5, 6],
    ajuda:
      'Define quantos palpites aparecem simultaneamente no gráfico e no histórico. Com <strong>0</strong> todos ficam ocultos e só a onda-alvo aparece. Com <strong>3</strong>, por exemplo, apenas os três mais recentes são exibidos.',
    rotuloAgravante: 'palpites',
    agravante: (v: number) => 0.82 + 0.03 * v,
  },

  teclado: {
    secao: 'Teclado',
    rotulo: 'Layout',
    padrao: 'qwerty',
    ciclo: ['qwerty', 'alfabetico'],
    rotulos: { qwerty: 'QWERTY', alfabetico: 'Alfabético' },
    ajuda:
      'Altera a disposição das teclas no teclado virtual. <strong>QWERTY</strong> segue o padrão dos teclados físicos. <strong>Alfabético</strong> organiza as letras em ordem alfabética.',
  },

  fixarLetrasAcertadas: {
    secao: 'Teclado',
    rotulo: 'Fixar letras certas',
    padrao: false,
    ciclo: [false, true],
    ajuda:
      'Após cada palpite, as letras posicionadas corretamente ficam travadas na sua posição e não podem ser apagadas. No próximo palpite, o cursor pula automaticamente pelas posições ainda livres.',
    // Fixar letras ajuda ou atrapalha conforme quantos palpites estão visíveis:
    // com poucos palpites na tela, travar letras é um alívio; com muitos, o
    // jogador já tinha a informação e a trava só limita a busca.
    rotuloAgravante: 'fixar',
    agravante: (v: boolean, config: { maxPalpites: number }) =>
      config.maxPalpites <= 3 ? (v ? 1.1 : 0.9) : v ? 0.9 : 1.1,
  },

  autocomplete: {
    secao: 'Teclado',
    rotulo: 'Autocomplete',
    padrao: false,
    ciclo: [false, true],
    ajuda:
      'Sugere uma palavra válida com base nas letras já digitadas. A sugestão aparece em cinza claro nas células ainda vazias. Nunca é confirmada automaticamente, basta continuar digitando pra sobrescrever.',
    rotuloAgravante: 'auto',
    agravante: (v: boolean) => (v ? 2 : 1),
  },

  palavrasInvalidas: {
    secao: 'Teclado',
    rotulo: 'Palavras inválidas',
    padrao: 'recusar',
    ciclo: ['recusar', 'penalizar', 'aceitar'],
    rotulos: { recusar: 'Recusar', penalizar: 'Penalizar', aceitar: 'Aceitar' },
    ajuda:
      'Define o que acontece ao confirmar uma palavra fora do dicionário. <strong>Recusar</strong> descarta o palpite completamente. <strong>Penalizar</strong> desperdiça o palpite. <strong>Aceitar</strong> ignora a validação, permitindo qualquer sequência de letras.',
    rotuloAgravante: 'inválidas',
    agravante: (v: string) => (v === 'penalizar' ? 0.8 : v === 'aceitar' ? 1.2 : 1),
  },

  tempoLimite: {
    secao: 'Tempo',
    rotulo: 'Tempo limite',
    padrao: 'infinito',
    ciclo: [10, 20, 40, 60, 180, 300, 600, 900, 'infinito'],
    rotulos: {
      10: '10 seg',
      20: '20 seg',
      40: '40 seg',
      60: '1 min',
      180: '3 min',
      300: '5 min',
      600: '10 min',
      900: '15 min',
      infinito: 'Infinito',
    },
    ajuda:
      'Define quanto tempo você tem para completar a partida. Quando o tempo se esgota, o jogo encerra automaticamente. Escolha <strong>Infinito</strong> para jogar sem pressão de tempo.',
  },

  exibirPontuacao: {
    secao: 'Interface',
    rotulo: 'Exibir pontuação',
    padrao: false,
    ciclo: [false, true],
    ajuda:
      'Controla se a pontuação detalhada é mostrada no resultado e na mensagem de compartilhamento. Quando desativada, exibe apenas as tradicionais bolinhas coloridas.',
  },
} as const;

export type ChaveConfig = keyof typeof DEFINICOES;

/** Config totalmente tipada: cada chave só aceita os valores do seu ciclo. */
export type Config = {
  [K in ChaveConfig]: (typeof DEFINICOES)[K]['ciclo'][number];
};

export const CHAVES = Object.keys(DEFINICOES) as ChaveConfig[];

export const PADROES: Config = Object.fromEntries(
  CHAVES.map((k) => [k, DEFINICOES[k].padrao]),
) as Config;

/** Texto do botão de ciclo para um valor. */
export function rotuloValor(chave: ChaveConfig, valor: unknown): string {
  if (typeof valor === 'boolean') return valor ? 'sim' : 'não';
  const def = DEFINICOES[chave] as { rotulos?: Record<string, string> };
  return def.rotulos?.[String(valor)] ?? String(valor);
}

/** Próximo valor do ciclo, com retorno ao início. */
export function proximoValor<K extends ChaveConfig>(chave: K, atual: Config[K]): Config[K] {
  const ciclo = DEFINICOES[chave].ciclo as readonly unknown[] as readonly Config[K][];
  const i = ciclo.indexOf(atual);
  return ciclo[(i + 1) % ciclo.length]!;
}

/** Limite de tempo em segundos, ou `null` quando é "infinito". */
export function limiteEmSegundos(config: Config): number | null {
  return typeof config.tempoLimite === 'number' ? config.tempoLimite : null;
}

/**
 * Descarta chaves desconhecidas e valores fora do ciclo, caindo no padrão.
 * O localStorage é entrada não confiável — pode vir de uma versão antiga ou
 * ter sido editado à mão.
 */
export function sanearConfig(bruto: unknown): Config {
  const entrada = (bruto ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    CHAVES.map((k) => {
      const ciclo = DEFINICOES[k].ciclo as readonly unknown[];
      const valor = entrada[k];
      return [k, ciclo.includes(valor) ? valor : DEFINICOES[k].padrao];
    }),
  ) as Config;
}
