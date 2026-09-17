import { describe, it, expect } from 'vitest';
import { Partida, MAX_TENTATIVAS, type ContextoPartida } from './partida';
import { PADROES, type Config } from '../config/definicoes';

const VALIDAS = new Set(['VERSO', 'CASAS', 'MUNDO', 'PRATO', 'TERMO', 'LIVRO', 'BARCO', 'PORTA']);

function criar(
  alvo = 'VERSO',
  ajustes: Partial<Config> = {},
  tempo = () => 0,
): { partida: Partida; ctx: ContextoPartida; config: Config } {
  const config = { ...PADROES, ...ajustes } as Config;
  const ctx: ContextoPartida = {
    ehValida: (p) => VALIDAS.has(p),
    config: () => config,
    tempoSegundos: tempo,
  };
  return { partida: new Partida(alvo, ctx), ctx, config };
}

/** Digita uma palavra letra a letra. */
function digitar(p: Partida, palavra: string): void {
  for (const l of palavra) p.tecla(l);
}

function palpitar(p: Partida, palavra: string) {
  digitar(p, palavra);
  return p.tecla('ENTER');
}

describe('digitação', () => {
  it('escreve e avança o cursor', () => {
    const { partida } = criar();
    const acao = partida.tecla('V');
    expect(acao).toEqual({ tipo: 'letra', letra: 'V', indice: 0 });
    expect(partida.atual).toEqual(['V', '', '', '', '']);
    expect(partida.indiceFoco).toBe(1);
  });

  it('normaliza acento e minúscula', () => {
    const { partida } = criar();
    digitar(partida, 'vé');
    expect(partida.atual.slice(0, 2)).toEqual(['V', 'E']);
  });

  it('ignora tecla que não vira uma única letra', () => {
    const { partida } = criar();
    expect(partida.tecla('1')).toBeNull();
    expect(partida.tecla('Shift')).toBeNull();
    expect(partida.atual.every((c) => c === '')).toBe(true);
  });

  it('na última posição o cursor não passa do fim', () => {
    const { partida } = criar();
    digitar(partida, 'VERSO');
    expect(partida.indiceFoco).toBe(4);
    partida.tecla('X');
    expect(partida.atual).toEqual(['V', 'E', 'R', 'S', 'X']);
  });
});

describe('apagar', () => {
  it('apaga no lugar quando há letra sob o cursor', () => {
    const { partida } = criar();
    digitar(partida, 'VERSO');
    partida.tecla('⌫');
    expect(partida.atual).toEqual(['V', 'E', 'R', 'S', '']);
    expect(partida.indiceFoco).toBe(4);
  });

  it('recua e apaga quando a posição já está vazia', () => {
    const { partida } = criar();
    digitar(partida, 'VE');
    expect(partida.indiceFoco).toBe(2);
    partida.tecla('⌫');
    expect(partida.atual).toEqual(['V', '', '', '', '']);
    expect(partida.indiceFoco).toBe(1);
  });

  it('não faz nada no início vazio', () => {
    const { partida } = criar();
    partida.tecla('⌫');
    expect(partida.atual).toEqual(['', '', '', '', '']);
    expect(partida.indiceFoco).toBe(0);
  });

  it('pula letras travadas ao recuar', () => {
    const { partida } = criar('VERSO');
    partida.letrasFixas = [true, false, false, false, false];
    partida.atual = ['V', 'E', '', '', ''];
    partida.indiceFoco = 1;
    partida.tecla('⌫'); // apaga o E em 1
    expect(partida.atual[1]).toBe('');
    partida.tecla('⌫'); // posição 1 vazia, a 0 é travada: nada acontece
    expect(partida.atual[0]).toBe('V');
    expect(partida.letrasFixas[0]).toBe(true);
  });
});

describe('submeter', () => {
  it('recusa palpite incompleto', () => {
    const { partida } = criar();
    digitar(partida, 'VER');
    expect(partida.tecla('ENTER')).toEqual({ tipo: 'erro', motivo: 'incompleta' });
    expect(partida.tentativas).toHaveLength(0);
  });

  it('aceita palpite válido e calcula o delta', () => {
    const { partida } = criar('VERSO');
    const acao = palpitar(partida, 'MUNDO');
    expect(acao).toMatchObject({ tipo: 'tentativa', ganhou: false, encerrou: false });
    expect(partida.tentativas[0]!.delta).toBeGreaterThan(0);
    expect(partida.atual).toEqual(['', '', '', '', '']); // grade limpa para o próximo
  });

  it('vitória é exatamente delta zero', () => {
    // Substitui o console.log de depuração que o código legado deixou em
    // produção para investigar "palavra correta com delta != 0".
    const { partida } = criar('VERSO');
    const acao = palpitar(partida, 'VERSO');
    expect(acao).toMatchObject({ tipo: 'tentativa', ganhou: true, encerrou: true });
    expect(partida.tentativas[0]!.delta).toBe(0);
    expect(partida.ganhou).toBe(true);
    expect(partida.encerrada).toBe(true);
  });

  it('encerra ao esgotar os 6 palpites', () => {
    const { partida } = criar('VERSO');
    for (let i = 0; i < MAX_TENTATIVAS - 1; i++) {
      expect(palpitar(partida, 'MUNDO')).toMatchObject({ encerrou: false });
    }
    expect(palpitar(partida, 'MUNDO')).toMatchObject({ encerrou: true, ganhou: false });
    expect(partida.tentativas).toHaveLength(MAX_TENTATIVAS);
    expect(partida.ganhou).toBe(false);
  });

  it('ignora teclas depois de encerrada', () => {
    const { partida } = criar('VERSO');
    palpitar(partida, 'VERSO');
    expect(partida.tecla('A')).toBeNull();
    expect(partida.tecla('ENTER')).toBeNull();
  });
});

describe('palavras inválidas', () => {
  it('recusar devolve a vez', () => {
    const { partida } = criar('VERSO', { palavrasInvalidas: 'recusar' });
    expect(palpitar(partida, 'XXXXX')).toEqual({ tipo: 'erro', motivo: 'invalida' });
    expect(partida.tentativas).toHaveLength(0);
    expect(partida.jogadas).toHaveLength(1); // mas custa pontos
    expect(partida.atual).toEqual(['X', 'X', 'X', 'X', 'X']); // texto preservado
  });

  it('penalizar gasta o palpite sem desenhar a onda', () => {
    const { partida } = criar('VERSO', { palavrasInvalidas: 'penalizar' });
    const acao = palpitar(partida, 'XXXXX');
    expect(acao).toMatchObject({ tipo: 'tentativa', ganhou: false, encerrou: false });
    expect(partida.tentativas[0]).toMatchObject({ penalizada: true, visivel: false });
  });

  it('aceitar trata como palpite comum', () => {
    const { partida } = criar('VERSO', { palavrasInvalidas: 'aceitar' });
    palpitar(partida, 'XXXXX');
    expect(partida.tentativas[0]).toMatchObject({ penalizada: false, visivel: true });
    expect(partida.tentativas[0]!.valores).toHaveLength(5);
  });

  it('inválidas penalizadas também esgotam a partida', () => {
    const { partida } = criar('VERSO', { palavrasInvalidas: 'penalizar' });
    for (let i = 0; i < MAX_TENTATIVAS; i++) palpitar(partida, 'XXXXX');
    expect(partida.encerrada).toBe(true);
    expect(partida.ganhou).toBe(false);
  });
});

describe('navegação pelo histórico', () => {
  it('↑ traz o palpite anterior e ↓ volta para a grade limpa', () => {
    const { partida } = criar('VERSO');
    palpitar(partida, 'MUNDO');
    palpitar(partida, 'CASAS');

    expect(partida.navegarCima()).toEqual({ tipo: 'navegacao' });
    expect(partida.atual.join('')).toBe('CASAS');

    expect(partida.navegarCima()).toEqual({ tipo: 'navegacao' });
    expect(partida.atual.join('')).toBe('MUNDO');

    expect(partida.navegarBaixo()).toEqual({ tipo: 'navegacao' });
    expect(partida.atual.join('')).toBe('CASAS');

    expect(partida.navegarBaixo()).toEqual({ tipo: 'navegacao' });
    expect(partida.atual.join('')).toBe('');
  });

  it('não passa do limite de palpites visíveis', () => {
    const { partida } = criar('VERSO');
    palpitar(partida, 'MUNDO');
    palpitar(partida, 'CASAS');
    partida.navegarCima(1); // só o último está visível
    expect(partida.atual.join('')).toBe('CASAS');
    expect(partida.navegarCima(1)).toBeNull();
  });

  it('↓ sem ter subido não faz nada', () => {
    const { partida } = criar('VERSO');
    palpitar(partida, 'MUNDO');
    expect(partida.navegarBaixo()).toBeNull();
  });

  it('digitar cancela a navegação', () => {
    const { partida } = criar('VERSO');
    palpitar(partida, 'MUNDO');
    partida.navegarCima();
    partida.tecla('⌫');
    expect(partida.navegarBaixo()).toBeNull();
  });
});

describe('fixar letras acertadas', () => {
  it('trava as posições corretas e as reflete na grade', () => {
    const { partida } = criar('VERSO');
    palpitar(partida, 'TERMO'); // acerta E, R e O nas posições 1, 2 e 4
    partida.fixar();
    expect(partida.letrasFixas).toEqual([false, true, true, false, true]);
    expect(partida.atual).toEqual(['', 'E', 'R', '', 'O']);
  });

  it('ignora palpites penalizados', () => {
    const { partida } = criar('VERSO', { palavrasInvalidas: 'penalizar' });
    palpitar(partida, 'VXXXX');
    partida.fixar();
    expect(partida.letrasFixas).toEqual([false, false, false, false, false]);
  });

  it('digitar sobre posição travada só avança o cursor', () => {
    const { partida } = criar('VERSO');
    partida.letrasFixas = [true, false, false, false, false];
    partida.atual = ['V', '', '', '', ''];
    partida.indiceFoco = 0;
    expect(partida.tecla('Z')).toEqual({ tipo: 'edicao' });
    expect(partida.atual[0]).toBe('V');
    expect(partida.indiceFoco).toBe(1);
  });
});

describe('foco', () => {
  it('limita o índice às 5 posições', () => {
    const { partida } = criar();
    partida.focar(99);
    expect(partida.indiceFoco).toBe(4);
    partida.focar(-3);
    expect(partida.indiceFoco).toBe(0);
  });

  it('não muda depois de encerrada', () => {
    const { partida } = criar('VERSO');
    palpitar(partida, 'VERSO');
    expect(partida.indiceFoco).toBe(4); // onde a última letra foi digitada
    partida.focar(0);
    expect(partida.indiceFoco).toBe(4);
  });
});

describe('visibilidade dos palpites', () => {
  it('alterna e ignora índice inexistente', () => {
    const { partida } = criar('VERSO');
    palpitar(partida, 'MUNDO');
    partida.alternarVisibilidade(0);
    expect(partida.tentativas[0]!.visivel).toBe(false);
    partida.alternarVisibilidade(0);
    expect(partida.tentativas[0]!.visivel).toBe(true);
    expect(() => partida.alternarVisibilidade(9)).not.toThrow();
  });
});

describe('fim de partida', () => {
  it('revela a resposta ao perder', () => {
    const { partida } = criar('VERSO');
    partida.revelarResposta(false);
    expect(partida.atual.join('')).toBe('VERSO');
    expect(partida.revelado).toBe('perdeu');
  });

  it('encerrar por tempo revela e trava', () => {
    const { partida } = criar('VERSO');
    partida.encerrarPorTempo();
    expect(partida.encerrada).toBe(true);
    expect(partida.revelado).toBe('perdeu');
    expect(partida.tecla('A')).toBeNull();
  });

  it('encerrar por tempo depois de acabada não sobrescreve a vitória', () => {
    const { partida } = criar('VERSO');
    palpitar(partida, 'VERSO');
    partida.revelarResposta(true);
    partida.encerrarPorTempo();
    expect(partida.revelado).toBe('ganhou');
  });
});

describe('pontuação da partida', () => {
  it('desconta cada palpite dos 1000 pontos', () => {
    let segundos = 0;
    const { partida } = criar('VERSO', {}, () => segundos);
    segundos = 15;
    palpitar(partida, 'MUNDO');
    segundos = 30;
    palpitar(partida, 'VERSO');
    expect(partida.jogadas).toHaveLength(2);
    expect(partida.pontuacao).toBeLessThan(1000);
    expect(partida.pontuacao).toBeGreaterThan(0);
  });

  it('derrota zera, mesmo com jogadas boas', () => {
    const { partida } = criar('VERSO');
    for (let i = 0; i < MAX_TENTATIVAS; i++) palpitar(partida, 'TERMO');
    expect(partida.pontuacao).toBe(0);
    expect(partida.extrato().linhas.at(-1)!.descricao).toBe('Derrota');
  });
});
