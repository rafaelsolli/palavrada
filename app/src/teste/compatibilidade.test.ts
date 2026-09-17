import { describe, it, expect, beforeEach } from 'vitest';
import legado from './fixtures/legado.json';

import {
  carregarConfig,
  carregarProgresso,
  carregarSessao,
  carregarStats,
  chaveSessao,
  exportarProgresso,
  garantirBackup,
  migrarChavesAntigas,
  restaurarBackup,
  salvarSessao,
  temBackup,
} from '../nucleo/armazenamento';
import { pontuacaoFinal, gerarExtrato, pontuarJogada } from '../nucleo/pontuacao';
import { PADROES, type ChaveConfig } from '../config/definicoes';

/**
 * Garante que quem já jogava não perde nada.
 *
 * As fixtures foram geradas rodando o código do site anterior à reescrita, por
 * scripts/congelar-fixtures.mjs, antes de aquela pasta ser removida — incluindo
 * o que aquela versão mostraria na tela. Assim os testes continuam valendo
 * depois de o legado sumir do repositório, que é quando eles mais importam:
 * jogadores seguem com dados no formato antigo no navegador por muito tempo.
 */

const CHAVE = chaveSessao('diario', 640);

beforeEach(() => localStorage.clear());

function gravarSessaoLegada(nome: 'emAndamento' | 'vencida' | 'umPalpite' | 'comInvalida') {
  localStorage.setItem(CHAVE, JSON.stringify(legado[nome].sessao));
  return legado[nome].esperado;
}

describe('sessão diária gravada pela versão anterior', () => {
  it('preserva todos os palpites, com os mesmos deltas', () => {
    const esperado = gravarSessaoLegada('emAndamento');
    const lida = carregarSessao(CHAVE)!;

    expect(lida.tentativas.map((t) => t.palavra)).toEqual(esperado.palavras);
    expect(lida.tentativas.map((t) => t.delta)).toEqual(esperado.deltas);
    expect(lida.encerrada).toBe(esperado.encerrada);
  });

  it('preserva a pontuação, penalidade por penalidade', () => {
    const esperado = gravarSessaoLegada('emAndamento');
    const lida = carregarSessao(CHAVE)!;
    expect(lida.jogadas.map((j) => j.penalidade)).toEqual(esperado.penalidades);
  });

  it('a pontuação final é a mesma que a versão anterior mostrava', () => {
    const esperado = gravarSessaoLegada('vencida');
    const lida = carregarSessao(CHAVE)!;
    expect(pontuacaoFinal(lida.jogadas, lida.ganhou)).toBe(esperado.pontuacao);
    expect(esperado.pontuacao).toBeGreaterThan(0); // a fixture é de uma vitória
  });

  it('reconstrói o agravante de cada jogada a partir da penalidade cobrada', () => {
    // A versão anterior não gravava o multiplicador: recalculava ao exibir.
    // Invertendo a fórmula, o extrato volta a bater com os pontos descontados.
    const esperado = gravarSessaoLegada('umPalpite');
    const lida = carregarSessao(CHAVE)!;

    const extrato = gerarExtrato(lida.jogadas, false);
    expect(extrato.linhas[0]!.valor).toBe(-esperado.penalidades[0]!);
    expect(extrato.linhas[0]!.memoria).toContain('121%'); // agravante padrão
  });

  it('preserva palpites inválidos penalizados, que não têm curva', () => {
    const esperado = gravarSessaoLegada('comInvalida');
    const lida = carregarSessao(CHAVE)!;

    expect(lida.tentativas).toHaveLength(2);
    expect(lida.tentativas[0]).toMatchObject({ palavra: 'XXXXX', penalizada: true });
    expect(lida.jogadas.map((j) => j.penalidade)).toEqual(esperado.penalidades);
  });

  it('uma partida vencida continua vencida', () => {
    gravarSessaoLegada('vencida');
    const lida = carregarSessao(CHAVE)!;
    expect(lida.encerrada).toBe(true);
    expect(lida.ganhou).toBe(true);
  });

  it('não cobra o tempo em que o jogo esteve fechado', () => {
    // `inicioPartida` é relógio de parede: usá-lo cobraria o dia inteiro de
    // quem abriu de manhã e voltou à noite.
    const sessao = { ...legado.emAndamento.sessao, inicioPartida: Date.now() - 10 * 3600_000 };
    localStorage.setItem(CHAVE, JSON.stringify(sessao));

    const lida = carregarSessao(CHAVE)!;
    expect(lida.cronometroMs).toBeLessThan(120_000);
  });

  it('o tempo reconstruído cobre ao menos o que já foi cobrado', () => {
    gravarSessaoLegada('emAndamento');
    const lida = carregarSessao(CHAVE)!;
    const maiorCobrado = Math.max(...lida.jogadas.map((j) => j.tempoSegundos));
    expect(lida.cronometroMs / 1000).toBeGreaterThanOrEqual(maiorCobrado);
  });
});

describe('progresso gravado pela versão anterior', () => {
  it('o Modo Livre é lido igual', () => {
    localStorage.setItem('palavrada.livre', JSON.stringify(legado.progressoLivre));
    expect(carregarProgresso('livre').jogados).toEqual(legado.progressoLivre.jogados);
  });

  it('o Livríssimo é lido igual e não se mistura com o Livre', () => {
    localStorage.setItem('palavrada.livrissimo', JSON.stringify(legado.progressoLivrissimo));
    expect(carregarProgresso('livrissimo').jogados).toEqual(legado.progressoLivrissimo.jogados);
    expect(carregarProgresso('livre').jogados).toEqual([]);
  });

  it('um progresso grande sobrevive inteiro', () => {
    const jogados = Array.from({ length: 1442 }, (_, id) => ({
      id,
      ganhou: id % 3 !== 0,
      tentativas: (id % 6) + 1,
    }));
    localStorage.setItem('palavrada.livre', JSON.stringify({ jogados }));
    expect(carregarProgresso('livre').jogados).toEqual(jogados);
  });
});

describe('configuração gravada pela versão anterior', () => {
  it('todas as opções sobrevivem à leitura', () => {
    localStorage.setItem('palavrada.config', JSON.stringify(legado.config));
    const nova = carregarConfig();
    for (const chave of Object.keys(PADROES) as ChaveConfig[]) {
      expect(nova[chave]).toEqual(legado.config[chave as keyof typeof legado.config]);
    }
  });
});

describe('estatísticas do formato pr_s, anterior ao renomeio', () => {
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

  it('o progresso de pr_free_h migra sem perder nada', () => {
    localStorage.setItem(
      'pr_free_h',
      JSON.stringify({ played: [{ id: 3, won: true, tries: 2 }, { id: 8, won: false, tries: 6 }] }),
    );
    migrarChavesAntigas();
    expect(carregarProgresso('livre').jogados).toEqual([
      { id: 3, ganhou: true, tentativas: 2 },
      { id: 8, ganhou: false, tentativas: 6 },
    ]);
  });
});

describe('sessão gravada pela versão nova', () => {
  /**
   * Continua sendo gravada também no formato antigo. Enquanto houver abas
   * abertas com a versão anterior carregada, elas ainda escrevem e leem a mesma
   * chave — e sem os campos antigos elas zerariam os pontos da partida.
   */
  function gravarPelaVersaoNova() {
    const jogadas = [
      pontuarJogada({ palavra: 'MUNDO', tempoSegundos: 10, delta: 30, invalida: false, config: PADROES }),
      pontuarJogada({ palavra: 'CASAS', tempoSegundos: 25, delta: 18, invalida: false, config: PADROES }),
    ];
    salvarSessao(CHAVE, {
      tentativas: jogadas.map((j) => ({
        palavra: j.palavra,
        valores: [12, 20, 13, 3, 14],
        delta: j.delta ?? 0,
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
    return { jogadas, bruto: JSON.parse(localStorage.getItem(CHAVE)!) };
  }

  it('traz também os campos que a versão anterior lê', () => {
    const { jogadas, bruto } = gravarPelaVersaoNova();
    expect(bruto).toHaveProperty('historicoJogadas');
    expect(bruto.historicoJogadas.map((j: { penalidade: number }) => j.penalidade)).toEqual(
      jogadas.map((j) => j.penalidade),
    );
    expect(bruto.historicoJogadas[0]).toMatchObject({ ehInvalida: false, tempoSegundos: 10 });
    expect(bruto).toHaveProperty('inicioPartida');
    expect(bruto).toHaveProperty('tempoRestante', 35);
  });

  it('inicioPartida reflete o tempo jogado, não o instante de início', () => {
    const { bruto } = gravarPelaVersaoNova();
    expect(bruto.inicioPartida).toBeGreaterThan(Date.now() - 60_000);
  });

  it('e continua legível por ela mesma', () => {
    const { jogadas } = gravarPelaVersaoNova();
    const lida = carregarSessao(CHAVE)!;
    expect(lida.jogadas.map((j) => j.penalidade)).toEqual(jogadas.map((j) => j.penalidade));
    expect(lida.cronometroMs).toBe(25_000);
  });
});

describe('rede de segurança', () => {
  function estadoRealista() {
    localStorage.setItem('palavrada.config', JSON.stringify(legado.config));
    localStorage.setItem('palavrada.livre', JSON.stringify(legado.progressoLivre));
    localStorage.setItem('palavrada.livrissimo', JSON.stringify(legado.progressoLivrissimo));
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

    localStorage.setItem('palavrada.diario', JSON.stringify({ jogadas: 999 }));
    expect(garantirBackup()).toBe(false);

    restaurarBackup();
    expect(carregarStats().jogadas).toBe(50);
  });

  it('restaurar devolve exatamente o estado guardado', () => {
    estadoRealista();
    const antes = exportarProgresso();
    garantirBackup();

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
