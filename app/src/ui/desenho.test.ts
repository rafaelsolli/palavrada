import { describe, it, expect } from 'vitest';
import { pontos, selecionarVisiveis, corDoDelta, COR_FAIXA, MARGEM } from './desenho';
import { valoresPalavra } from '../nucleo/ondas';
import type { Tentativa } from '../nucleo/partida';

const t = (palavra: string, over: Partial<Tentativa> = {}): Tentativa => ({
  palavra,
  valores: valoresPalavra(palavra),
  delta: 30,
  ganhou: false,
  penalizada: false,
  visivel: true,
  ...over,
});

describe('pontos', () => {
  const LARGURA = 316; // 348 - 2*16, um tamanho realista de cartão
  const ALTURA = 150;

  it('distribui as cinco posições igualmente entre as margens', () => {
    const p = pontos(valoresPalavra('VERSO'), LARGURA, ALTURA);
    expect(p).toHaveLength(5);
    expect(p[0]!.x).toBe(MARGEM);
    expect(p[4]!.x).toBe(LARGURA - MARGEM);
    const passos = p.slice(1).map((ponto, i) => ponto.x - p[i]!.x);
    expect(new Set(passos.map((x) => x.toFixed(6))).size).toBe(1);
  });

  it('A fica embaixo e Z em cima', () => {
    const p = pontos(valoresPalavra('AAAAZ'), LARGURA, ALTURA);
    expect(p[0]!.y).toBe(ALTURA - MARGEM); // A = 0 → base
    expect(p[4]!.y).toBe(MARGEM); // Z = 25 → topo
    expect(p[0]!.y).toBeGreaterThan(p[4]!.y);
  });

  it('o meio do alfabeto cai no meio do gráfico', () => {
    const [ponto] = pontos([12.5, 12.5], 100, 100);
    expect(ponto!.y).toBeCloseTo(50, 6);
  });

  it('respeita a margem menor das miniaturas', () => {
    const p = pontos(valoresPalavra('VERSO'), 200, 52, 6);
    expect(p[0]!.x).toBe(6);
    expect(p[4]!.x).toBe(194);
  });

  it('menos de dois valores não vira curva', () => {
    expect(pontos([5], 100, 100)).toEqual([]);
    expect(pontos([], 100, 100)).toEqual([]);
  });
});

describe('selecionarVisiveis', () => {
  it('mostra apenas os últimos N palpites', () => {
    const tentativas = [t('CASAS'), t('MUNDO'), t('PRATO'), t('TERMO')];
    const { visiveis } = selecionarVisiveis(tentativas, 2);
    expect(visiveis.map((x) => x.palavra)).toEqual(['PRATO', 'TERMO']);
  });

  it('com zero, nenhum palpite aparece — só a onda-alvo', () => {
    expect(selecionarVisiveis([t('CASAS')], 0).visiveis).toEqual([]);
  });

  it('o destaque é o último palpite que virou onda', () => {
    // Uma palavra inválida penalizada não tem curva, então não pode roubar o
    // destaque do palpite anterior.
    const tentativas = [t('CASAS'), t('MUNDO'), t('XXXXX', { penalizada: true, valores: [] })];
    expect(selecionarVisiveis(tentativas, 6).ultimo!.palavra).toBe('MUNDO');
  });

  it('sem nenhum palpite válido, não há destaque', () => {
    expect(selecionarVisiveis([t('XXXXX', { penalizada: true })], 6).ultimo).toBeNull();
    expect(selecionarVisiveis([], 6).ultimo).toBeNull();
  });

  it('o destaque pode estar fora da janela visível', () => {
    const tentativas = [t('CASAS'), t('MUNDO')];
    const { visiveis, ultimo } = selecionarVisiveis(tentativas, 1);
    expect(ultimo!.palavra).toBe('MUNDO');
    expect(visiveis).toContain(ultimo);
  });
});

describe('corDoDelta', () => {
  it('segue as faixas do histórico', () => {
    expect(corDoDelta(5)).toBe(COR_FAIXA.otimo);
    expect(corDoDelta(15)).toBe(COR_FAIXA.bom);
    expect(corDoDelta(25)).toBe(COR_FAIXA.medio);
    expect(corDoDelta(80)).toBe(COR_FAIXA.ruim);
  });

  it('vitória é verde mesmo com delta alto', () => {
    expect(corDoDelta(99, true)).toBe(COR_FAIXA.otimo);
  });
});
