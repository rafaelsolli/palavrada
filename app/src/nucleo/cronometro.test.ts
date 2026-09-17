import { describe, it, expect } from 'vitest';
import { Cronometro } from './cronometro';

/** Relógio controlado pelo teste. */
function relogioFalso(inicio = 0) {
  let agora = inicio;
  return {
    agora: () => agora,
    avancar: (ms: number) => {
      agora += ms;
    },
  };
}

describe('Cronometro', () => {
  it('começa parado e zerado', () => {
    const c = new Cronometro();
    expect(c.rodando).toBe(false);
    expect(c.decorridoSegundos).toBe(0);
  });

  it('acumula apenas enquanto está rodando', () => {
    const r = relogioFalso();
    const c = new Cronometro({ agora: r.agora });

    c.retomar();
    r.avancar(5000);
    expect(c.decorridoSegundos).toBe(5);

    c.pausar();
    r.avancar(60_000); // aba em segundo plano — não deve contar
    expect(c.decorridoSegundos).toBe(5);

    c.retomar();
    r.avancar(3000);
    expect(c.decorridoSegundos).toBe(8);
  });

  it('retomar duas vezes não duplica a contagem', () => {
    const r = relogioFalso();
    const c = new Cronometro({ agora: r.agora });
    c.retomar();
    r.avancar(1000);
    c.retomar();
    r.avancar(1000);
    expect(c.decorridoSegundos).toBe(2);
  });

  it('pausar sem estar rodando é inofensivo', () => {
    const c = new Cronometro();
    c.pausar();
    c.pausar();
    expect(c.decorridoSegundos).toBe(0);
  });

  it('sem limite não tem restante nem esgota', () => {
    const r = relogioFalso();
    const c = new Cronometro({ agora: r.agora });
    c.retomar();
    r.avancar(999_000);
    expect(c.restanteSegundos).toBeNull();
    expect(c.esgotado).toBe(false);
  });

  it('com limite, conta para trás e esgota sem ficar negativo', () => {
    const r = relogioFalso();
    const c = new Cronometro({ limiteSegundos: 10, agora: r.agora });
    c.retomar();
    expect(c.restanteSegundos).toBe(10);

    r.avancar(4000);
    expect(c.restanteSegundos).toBe(6);
    expect(c.esgotado).toBe(false);

    r.avancar(6000);
    expect(c.restanteSegundos).toBe(0);
    expect(c.esgotado).toBe(true);

    r.avancar(30_000);
    expect(c.restanteSegundos).toBe(0);
  });

  it('sobrevive a um ciclo de salvar e recarregar', () => {
    // Regressão do bug legado em que o tempo restante restaurado da sessão era
    // sobrescrito pelo limite cheio logo em seguida.
    const r1 = relogioFalso();
    const antes = new Cronometro({ limiteSegundos: 60, agora: r1.agora });
    antes.retomar();
    r1.avancar(25_000);
    antes.pausar();

    const salvo = antes.paraJSON();
    expect(salvo.acumuladoMs).toBe(25_000);

    const r2 = relogioFalso(1_000_000); // outra sessão, muito tempo depois
    const depois = Cronometro.deJSON(salvo, { limiteSegundos: 60, agora: r2.agora });
    expect(depois.decorridoSegundos).toBe(25);
    expect(depois.restanteSegundos).toBe(35);
  });

  it('ignora dados de sessão corrompidos', () => {
    for (const lixo of [null, undefined, {}, { acumuladoMs: 'abc' }, { acumuladoMs: -1 }, { acumuladoMs: NaN }]) {
      expect(Cronometro.deJSON(lixo as never).decorridoSegundos).toBe(0);
    }
  });
});
