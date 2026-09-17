import { describe, it, expect, beforeEach } from 'vitest';
import {
  carregarConfig,
  salvarConfig,
  carregarStats,
  salvarStats,
  aplicarResultadoDiario,
  carregarProgresso,
  registrarResultado,
  jaJogado,
  chaveSessao,
  carregarSessao,
  salvarSessao,
  limparSessao,
  limparSessoesDiariasAntigas,
  tutorialJaVisto,
  marcarTutorialVisto,
  migrarChavesAntigas,
  type SessaoSalva,
  type StatsDiario,
} from './armazenamento';
import { PADROES } from '../config/definicoes';

beforeEach(() => localStorage.clear());

const sessaoExemplo: SessaoSalva = {
  tentativas: [
    { palavra: 'MUNDO', valores: [12, 20, 13, 3, 14], delta: 30, ganhou: false, penalizada: false, visivel: true },
  ],
  jogadas: [
    { palavra: 'MUNDO', tempoSegundos: 12, delta: 30, invalida: false, penalidade: 164, agravante: 1.21, fatores: [] },
  ],
  encerrada: false,
  ganhou: false,
  cronometroMs: 12_000,
};

describe('config', () => {
  it('devolve os padrões quando não há nada salvo', () => {
    expect(carregarConfig()).toEqual(PADROES);
  });

  it('faz ida e volta', () => {
    salvarConfig({ ...PADROES, maxPalpites: 3, teclado: 'alfabetico' });
    expect(carregarConfig()).toMatchObject({ maxPalpites: 3, teclado: 'alfabetico' });
  });

  it('descarta valores fora do ciclo e chaves desconhecidas', () => {
    localStorage.setItem(
      'palavrada.config',
      JSON.stringify({ maxPalpites: 99, teclado: 'dvorak', inventada: true }),
    );
    const config = carregarConfig();
    expect(config.maxPalpites).toBe(PADROES.maxPalpites);
    expect(config.teclado).toBe(PADROES.teclado);
    expect(config).not.toHaveProperty('inventada');
  });

  it('sobrevive a JSON corrompido', () => {
    localStorage.setItem('palavrada.config', '{isso nao e json');
    expect(carregarConfig()).toEqual(PADROES);
  });
});

describe('estatísticas do diário', () => {
  it('parte de zero', () => {
    expect(carregarStats()).toEqual({ jogadas: 0, vitorias: 0, sequencia: 0, ultimoDiaVencido: -1 });
  });

  it('faz ida e volta e ignora campos inválidos', () => {
    salvarStats({ jogadas: 5, vitorias: 3, sequencia: 2, ultimoDiaVencido: 900 });
    expect(carregarStats()).toEqual({ jogadas: 5, vitorias: 3, sequencia: 2, ultimoDiaVencido: 900 });

    localStorage.setItem('palavrada.diario', JSON.stringify({ jogadas: 'muitas', vitorias: null }));
    expect(carregarStats()).toEqual({ jogadas: 0, vitorias: 0, sequencia: 0, ultimoDiaVencido: -1 });
  });
});

describe('aplicarResultadoDiario', () => {
  const base: StatsDiario = { jogadas: 10, vitorias: 6, sequencia: 3, ultimoDiaVencido: 99 };

  it('vitória no dia seguinte continua a sequência', () => {
    expect(aplicarResultadoDiario(base, 100, true)).toMatchObject({
      jogadas: 11,
      vitorias: 7,
      sequencia: 4,
      ultimoDiaVencido: 100,
    });
  });

  it('vitória depois de um buraco recomeça a sequência', () => {
    expect(aplicarResultadoDiario(base, 105, true).sequencia).toBe(1);
  });

  it('derrota zera a sequência', () => {
    expect(aplicarResultadoDiario(base, 100, false).sequencia).toBe(0);
  });

  it('derrota no mesmo dia de uma vitória não zera', () => {
    expect(aplicarResultadoDiario(base, 99, false).sequencia).toBe(3);
  });

  it('não muda o objeto original', () => {
    const copia = { ...base };
    aplicarResultadoDiario(base, 100, true);
    expect(base).toEqual(copia);
  });
});

describe('progresso dos modos livres', () => {
  it('começa vazio e registra resultados', () => {
    expect(carregarProgresso('livre').jogados).toEqual([]);
    registrarResultado('livre', 41, true, 4);
    expect(carregarProgresso('livre').jogados).toEqual([{ id: 41, ganhou: true, tentativas: 4 }]);
    expect(jaJogado('livre', 41)).toBe(true);
    expect(jaJogado('livre', 42)).toBe(false);
  });

  it('rejogar o mesmo desafio substitui o resultado', () => {
    registrarResultado('livre', 7, false, 6);
    registrarResultado('livre', 7, true, 2);
    const jogados = carregarProgresso('livre').jogados;
    expect(jogados).toHaveLength(1);
    expect(jogados[0]).toMatchObject({ ganhou: true, tentativas: 2 });
  });

  it('livre e livríssimo não se misturam', () => {
    registrarResultado('livre', 1, true, 3);
    expect(carregarProgresso('livrissimo').jogados).toEqual([]);
  });

  it('descarta entradas malformadas', () => {
    localStorage.setItem(
      'palavrada.livre',
      JSON.stringify({ jogados: [{ id: 1, ganhou: true, tentativas: 3 }, { id: 'x' }, null, 42] }),
    );
    expect(carregarProgresso('livre').jogados).toEqual([{ id: 1, ganhou: true, tentativas: 3 }]);
  });
});

describe('sessão', () => {
  it('faz ida e volta preservando o cronômetro', () => {
    const chave = chaveSessao('diario', 640);
    salvarSessao(chave, sessaoExemplo);
    const lida = carregarSessao(chave);
    expect(lida).not.toBeNull();
    expect(lida!.cronometroMs).toBe(12_000);
    expect(lida!.tentativas).toHaveLength(1);
    expect(lida!.jogadas[0]!.penalidade).toBe(164);
  });

  it('a sessão de outro dia simplesmente não é encontrada', () => {
    // O dia entra na chave, então não é preciso comparar datas ao ler — era
    // justamente nessa comparação que o site atual perdia o tempo restante.
    salvarSessao(chaveSessao('diario', 639), sessaoExemplo);
    expect(carregarSessao(chaveSessao('diario', 640))).toBeNull();
  });

  it('os modos livres agora também têm sessão', () => {
    // No site atual só o diário persistia: um F5 no Modo Livre perdia a partida
    // e ainda permitia refazer o mesmo desafio.
    salvarSessao(chaveSessao('livre', 12), sessaoExemplo);
    salvarSessao(chaveSessao('livrissimo', 12), { ...sessaoExemplo, cronometroMs: 999 });
    expect(carregarSessao(chaveSessao('livre', 12))!.cronometroMs).toBe(12_000);
    expect(carregarSessao(chaveSessao('livrissimo', 12))!.cronometroMs).toBe(999);
  });

  it('limpar remove', () => {
    const chave = chaveSessao('livre', 3);
    salvarSessao(chave, sessaoExemplo);
    limparSessao(chave);
    expect(carregarSessao(chave)).toBeNull();
  });

  it('sessão corrompida devolve null em vez de quebrar', () => {
    localStorage.setItem('palavrada.diario.sessao.1', '{{{');
    expect(carregarSessao('palavrada.diario.sessao.1')).toBeNull();

    localStorage.setItem('palavrada.diario.sessao.2', JSON.stringify({ encerrada: true }));
    expect(carregarSessao('palavrada.diario.sessao.2')).toBeNull();
  });

  it('completa campos ausentes de uma sessão antiga', () => {
    localStorage.setItem('palavrada.diario.sessao.3', JSON.stringify({ tentativas: [] }));
    const lida = carregarSessao('palavrada.diario.sessao.3');
    expect(lida).toMatchObject({ jogadas: [], encerrada: false, ganhou: false, cronometroMs: 0 });
  });
});

describe('limparSessoesDiariasAntigas', () => {
  it('apaga só as de dias anteriores', () => {
    salvarSessao(chaveSessao('diario', 638), sessaoExemplo);
    salvarSessao(chaveSessao('diario', 639), sessaoExemplo);
    salvarSessao(chaveSessao('diario', 640), sessaoExemplo);
    salvarSessao(chaveSessao('livre', 5), sessaoExemplo);

    expect(limparSessoesDiariasAntigas(640)).toBe(2);
    expect(carregarSessao(chaveSessao('diario', 640))).not.toBeNull();
    expect(carregarSessao(chaveSessao('livre', 5))).not.toBeNull();
    expect(carregarSessao(chaveSessao('diario', 639))).toBeNull();
  });

  it('não mexe em outras chaves do jogo', () => {
    salvarConfig({ ...PADROES, maxPalpites: 2 });
    registrarResultado('livre', 1, true, 3);
    limparSessoesDiariasAntigas(999);
    expect(carregarConfig().maxPalpites).toBe(2);
    expect(carregarProgresso('livre').jogados).toHaveLength(1);
  });
});

describe('tutorial', () => {
  it('é marcado uma vez só', () => {
    expect(tutorialJaVisto()).toBe(false);
    marcarTutorialVisto();
    expect(tutorialJaVisto()).toBe(true);
  });
});

describe('migração das chaves pr_*', () => {
  it('converte estatísticas antigas', () => {
    localStorage.setItem('pr_s', JSON.stringify({ p: 20, w: 14, streak: 5, lastWonDay: 700 }));
    migrarChavesAntigas();
    expect(carregarStats()).toEqual({ jogadas: 20, vitorias: 14, sequencia: 5, ultimoDiaVencido: 700 });
    expect(localStorage.getItem('pr_s')).toBeNull();
  });

  it('aceita a sequência no campo alternativo', () => {
    localStorage.setItem('pr_s', JSON.stringify({ p: 1, w: 1, s: 9, lastWonDay: 10 }));
    migrarChavesAntigas();
    expect(carregarStats().sequencia).toBe(9);
  });

  it('converte o progresso do modo livre', () => {
    localStorage.setItem(
      'pr_free_h',
      JSON.stringify({ played: [{ id: 3, won: true, tries: 2 }, { id: 8, won: false, tries: 6 }] }),
    );
    migrarChavesAntigas();
    expect(carregarProgresso('livre').jogados).toEqual([
      { id: 3, ganhou: true, tentativas: 2 },
      { id: 8, ganhou: false, tentativas: 6 },
    ]);
    expect(localStorage.getItem('pr_free_h')).toBeNull();
  });

  it('não sobrescreve dados já migrados', () => {
    salvarStats({ jogadas: 99, vitorias: 99, sequencia: 99, ultimoDiaVencido: 99 });
    localStorage.setItem('pr_s', JSON.stringify({ p: 1, w: 1, streak: 1, lastWonDay: 1 }));
    migrarChavesAntigas();
    expect(carregarStats().jogadas).toBe(99);
    expect(localStorage.getItem('pr_s')).toBeNull();
  });

  it('remove as chaves obsoletas e é seguro rodar duas vezes', () => {
    localStorage.setItem('pr_free', 'x');
    localStorage.setItem('pr_free_completed', 'y');
    migrarChavesAntigas();
    migrarChavesAntigas();
    expect(localStorage.getItem('pr_free')).toBeNull();
    expect(localStorage.getItem('pr_free_completed')).toBeNull();
  });

  it('ignora dados antigos corrompidos', () => {
    localStorage.setItem('pr_s', 'nao e json');
    localStorage.setItem('pr_free_h', JSON.stringify({ played: 'nao e array' }));
    expect(() => migrarChavesAntigas()).not.toThrow();
    expect(carregarStats()).toEqual({ jogadas: 0, vitorias: 0, sequencia: 0, ultimoDiaVencido: -1 });
    expect(carregarProgresso('livre').jogados).toEqual([]);
  });
});
