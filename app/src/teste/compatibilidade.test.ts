import { describe, it, expect, beforeEach } from 'vitest';
// Importa o código do site publicado, não uma reprodução dele: é a única forma
// de garantir que o formato testado é o que os jogadores realmente têm gravado.
import { Partida as PartidaLegada } from '../../../js/nucleo/partida.js';
import { carregarConfig as carregarConfigLegada, salvarConfig as salvarConfigLegada } from '../../../js/configuracoes.js';
import {
  carregarProgresso as carregarProgressoLegado,
  salvarResultadoLivre as salvarResultadoLivreLegado,
  salvarResultadoLivrissimo as salvarResultadoLivrissimoLegado,
} from '../../../js/modos/base/modalSeletor.js';

import {
  carregarConfig,
  salvarSessao,
  carregarProgresso,
  carregarSessao,
  carregarStats,
  chaveSessao,
  exportarProgresso,
  garantirBackup,
  migrarChavesAntigas,
  restaurarBackup,
  temBackup,
} from '../nucleo/armazenamento';
import { pontuacaoFinal, gerarExtrato, pontuarJogada } from '../nucleo/pontuacao';
import { PADROES } from '../config/definicoes';

beforeEach(() => localStorage.clear());

/**
 * Joga uma partida usando a implementação antiga e devolve a sessão exatamente
 * como `_persistirSessao` a grava em js/modos/diario/modoDesafioDiario.js.
 */
function sessaoLegada(alvo: string, palpites: string[]) {
  const partida = new PartidaLegada(alvo);
  for (const palpite of palpites) {
    partida.atual = [...palpite];
    partida.tecla('ENTER');
  }
  return {
    partida,
    sessao: {
      tentativas: partida.tentativas,
      ganhou: partida.tentativas.some((t: { ganhou: boolean }) => t.ganhou),
      encerrada: partida.encerrada,
      tempoRestante: partida.tempoRestante,
      inicioPartida: partida.inicioPartida,
      historicoJogadas: partida.historicoJogadas,
    },
  };
}

describe('sessão diária gravada pela versão antiga', () => {
  it('preserva todos os palpites', () => {
    const { sessao } = sessaoLegada('VERSO', ['MUNDO', 'CASAS', 'PRATO']);
    localStorage.setItem(chaveSessao('diario', 640), JSON.stringify(sessao));

    const lida = carregarSessao(chaveSessao('diario', 640))!;
    expect(lida.tentativas.map((t) => t.palavra)).toEqual(['MUNDO', 'CASAS', 'PRATO']);
    expect(lida.tentativas.map((t) => t.delta)).toEqual(
      sessao.tentativas.map((t: { delta: number }) => t.delta),
    );
    expect(lida.encerrada).toBe(false);
  });

  it('preserva a pontuação, penalidade por penalidade', () => {
    const { sessao } = sessaoLegada('VERSO', ['MUNDO', 'CASAS']);
    localStorage.setItem(chaveSessao('diario', 640), JSON.stringify(sessao));

    const lida = carregarSessao(chaveSessao('diario', 640))!;
    expect(lida.jogadas.map((j) => j.penalidade)).toEqual(
      sessao.historicoJogadas.map((j: { penalidade: number }) => j.penalidade),
    );
  });

  it('a pontuação final continua idêntica à que a versão antiga mostraria', () => {
    const { partida, sessao } = sessaoLegada('VERSO', ['MUNDO', 'CASAS', 'VERSO']);
    localStorage.setItem(chaveSessao('diario', 640), JSON.stringify(sessao));

    const lida = carregarSessao(chaveSessao('diario', 640))!;
    expect(pontuacaoFinal(lida.jogadas, lida.ganhou)).toBe(partida.calcularPontuacaoAtual());
  });

  it('reconstrói o agravante de cada jogada a partir da penalidade cobrada', () => {
    // A versão antiga não gravava o multiplicador — ela o recalculava ao exibir.
    // Invertendo a fórmula, o extrato volta a bater com os pontos já descontados.
    const { sessao } = sessaoLegada('VERSO', ['MUNDO']);
    localStorage.setItem(chaveSessao('diario', 640), JSON.stringify(sessao));

    const lida = carregarSessao(chaveSessao('diario', 640))!;
    const extrato = gerarExtrato(lida.jogadas, false);
    expect(extrato.linhas[0]!.valor).toBe(-sessao.historicoJogadas[0]!.penalidade);
    expect(extrato.linhas[0]!.memoria).toContain('121%'); // agravante padrão
  });

  it('preserva palpites inválidos penalizados, que não têm curva', () => {
    salvarConfigLegada('palavrasInvalidas', 'penalizar');
    const { sessao } = sessaoLegada('VERSO', ['XXXXX', 'MUNDO']);
    localStorage.setItem(chaveSessao('diario', 640), JSON.stringify(sessao));

    const lida = carregarSessao(chaveSessao('diario', 640))!;
    expect(lida.tentativas).toHaveLength(2);
    expect(lida.tentativas[0]).toMatchObject({ palavra: 'XXXXX', penalizada: true });
    expect(lida.jogadas).toHaveLength(2);
  });

  it('não cobra o tempo em que o jogo esteve fechado', () => {
    const { sessao } = sessaoLegada('VERSO', ['MUNDO']);
    // Simula alguém que abriu de manhã e volta à noite: inicioPartida é um
    // instante de relógio de parede, e usá-lo zeraria a pontuação.
    sessao.inicioPartida = Date.now() - 10 * 3600 * 1000;
    localStorage.setItem(chaveSessao('diario', 640), JSON.stringify(sessao));

    const lida = carregarSessao(chaveSessao('diario', 640))!;
    expect(lida.cronometroMs).toBeLessThan(60_000);
  });

  it('uma partida encerrada continua encerrada, com o mesmo resultado', () => {
    const { sessao } = sessaoLegada('VERSO', ['VERSO']);
    localStorage.setItem(chaveSessao('diario', 640), JSON.stringify(sessao));

    const lida = carregarSessao(chaveSessao('diario', 640))!;
    expect(lida.encerrada).toBe(true);
    expect(lida.ganhou).toBe(true);
  });
});

describe('progresso gravado pela versão antiga', () => {
  it('o Modo Livre é lido igual', () => {
    salvarResultadoLivreLegado(41, true, 3);
    salvarResultadoLivreLegado(7, false, 6);
    expect(carregarProgresso('livre').jogados).toEqual(carregarProgressoLegado().jogados);
    expect(carregarProgresso('livre').jogados).toEqual([
      { id: 41, ganhou: true, tentativas: 3 },
      { id: 7, ganhou: false, tentativas: 6 },
    ]);
  });

  it('o Livríssimo é lido igual e não se mistura com o Livre', () => {
    salvarResultadoLivrissimoLegado(900, true, 2);
    expect(carregarProgresso('livrissimo').jogados).toEqual([
      { id: 900, ganhou: true, tentativas: 2 },
    ]);
    expect(carregarProgresso('livre').jogados).toEqual([]);
  });

  it('um progresso grande sobrevive inteiro', () => {
    for (let i = 0; i < 1442; i++) salvarResultadoLivreLegado(i, i % 3 !== 0, (i % 6) + 1);
    const lido = carregarProgresso('livre').jogados;
    expect(lido).toHaveLength(1442);
    expect(lido).toEqual(carregarProgressoLegado().jogados);
  });
});

describe('configuração gravada pela versão antiga', () => {
  it('todas as opções sobrevivem à leitura', () => {
    salvarConfigLegada('regraHorizontal', 25);
    salvarConfigLegada('teclado', 'alfabetico');
    salvarConfigLegada('tempoLimite', 180);
    salvarConfigLegada('exibirPontuacao', true);

    const nova = carregarConfig();
    const legada = carregarConfigLegada();
    for (const chave of Object.keys(PADROES) as (keyof typeof PADROES)[]) {
      expect(nova[chave]).toEqual(legada[chave]);
    }
  });
});

describe('estatísticas do formato pr_s', () => {
  it('migram sem perder nada', () => {
    localStorage.setItem('pr_s', JSON.stringify({ p: 137, w: 92, streak: 11, lastWonDay: 638 }));
    migrarChavesAntigas();
    expect(carregarStats()).toEqual({
      jogadas: 137,
      vitorias: 92,
      sequencia: 11,
      ultimoDiaVencido: 638,
    });
  });
});

describe('rede de segurança', () => {
  function estadoRealista() {
    salvarConfigLegada('teclado', 'alfabetico');
    salvarResultadoLivreLegado(41, true, 3);
    salvarResultadoLivrissimoLegado(7, false, 6);
    localStorage.setItem(
      'palavrada.diario',
      JSON.stringify({ jogadas: 50, vitorias: 40, sequencia: 9, ultimoDiaVencido: 639 }),
    );
    localStorage.setItem('palavrada.tutorial', '1');
  }

  it('guarda tudo que o jogo tem, antes de qualquer alteração', () => {
    estadoRealista();
    const antes = exportarProgresso();

    expect(garantirBackup()).toBe(true);
    expect(temBackup()).toBe(true);
    expect(Object.keys(antes)).toEqual(
      expect.arrayContaining([
        'palavrada.config',
        'palavrada.livre',
        'palavrada.livrissimo',
        'palavrada.diario',
        'palavrada.tutorial',
      ]),
    );
  });

  it('é feito uma vez só e não é sobrescrito depois', () => {
    estadoRealista();
    garantirBackup();

    // A versão nova segue jogando e mudando coisas.
    localStorage.setItem('palavrada.diario', JSON.stringify({ jogadas: 999 }));
    expect(garantirBackup()).toBe(false);

    restaurarBackup();
    expect(carregarStats().jogadas).toBe(50); // o valor de antes do beta
  });

  it('restaurar devolve exatamente o estado guardado', () => {
    estadoRealista();
    const antes = exportarProgresso();
    garantirBackup();

    // Estrago completo: apaga umas chaves, altera outras, cria novas.
    localStorage.removeItem('palavrada.livre');
    localStorage.setItem('palavrada.livrissimo', JSON.stringify({ jogados: [] }));
    localStorage.setItem('palavrada.diario.sessao.999', JSON.stringify({ tentativas: [] }));

    restaurarBackup();
    expect(exportarProgresso()).toEqual(antes);
  });

  it('sem nada guardado, não cria backup vazio', () => {
    expect(garantirBackup()).toBe(false);
    expect(temBackup()).toBe(false);
  });

  it('não mexe em chaves de outros sites na mesma origem', () => {
    estadoRealista();
    localStorage.setItem('outro-app', 'não me toque');
    garantirBackup();
    restaurarBackup();
    expect(localStorage.getItem('outro-app')).toBe('não me toque');
  });
});

describe('voltar para a versão antiga depois de jogar no beta', () => {
  /** Grava pela versão nova e relê com a classe do site publicado. */
  function idaEVolta(palpites: { palavra: string; delta: number; tempo: number }[]) {
    const jogadas = palpites.map((p) =>
      pontuarJogada({
        palavra: p.palavra,
        tempoSegundos: p.tempo,
        delta: p.delta,
        invalida: false,
        config: PADROES,
      }),
    );

    salvarSessao(chaveSessao('diario', 640), {
      tentativas: palpites.map((p) => ({
        palavra: p.palavra,
        valores: [12, 20, 13, 3, 14],
        delta: p.delta,
        ganhou: false,
        penalizada: false,
        visivel: true,
      })),
      jogadas,
      encerrada: false,
      ganhou: false,
      cronometroMs: 25_000,
      restanteSegundos: 35,
    });

    const partida = new PartidaLegada('VERSO');
    partida.restaurar(JSON.parse(localStorage.getItem(chaveSessao('diario', 640))!));
    return { partida, jogadas };
  }

  it('o site publicado recupera os palpites', () => {
    const { partida } = idaEVolta([
      { palavra: 'MUNDO', delta: 30, tempo: 10 },
      { palavra: 'CASAS', delta: 18, tempo: 25 },
    ]);
    expect(partida.tentativas.map((t) => t.palavra)).toEqual(['MUNDO', 'CASAS']);
  });

  it('o site publicado recupera a pontuação, penalidade por penalidade', () => {
    // Sem gravar também os campos antigos, o legado zerava os pontos de quem
    // tivesse jogado no beta.
    const { partida, jogadas } = idaEVolta([
      { palavra: 'MUNDO', delta: 30, tempo: 10 },
      { palavra: 'CASAS', delta: 18, tempo: 25 },
    ]);
    expect(partida.historicoJogadas.map((j) => j.penalidade)).toEqual(
      jogadas.map((j) => j.penalidade),
    );
  });

  it('a pontuação final coincide nas duas versões', () => {
    const { partida, jogadas } = idaEVolta([{ palavra: 'VERSO', delta: 0, tempo: 12 }]);
    // A versão antiga só pontua quem venceu; aqui comparamos a mesma conta.
    partida.tentativas[0]!.ganhou = true;
    expect(partida.calcularPontuacaoAtual()).toBe(pontuacaoFinal(jogadas, true));
  });

  it('não cobra do jogador o tempo em que a aba ficou fechada', () => {
    const { partida } = idaEVolta([{ palavra: 'MUNDO', delta: 30, tempo: 10 }]);
    // inicioPartida é gravado deslocado pelo tempo realmente jogado, e não pelo
    // instante em que a partida começou.
    expect(partida.inicioPartida).toBeGreaterThan(Date.now() - 60_000);
  });

  it('o progresso dos modos livres é lido igual pelas duas versões', () => {
    salvarResultadoLivreLegado(41, true, 3);
    expect(carregarProgressoLegado().jogados).toEqual(carregarProgresso('livre').jogados);
  });
});
