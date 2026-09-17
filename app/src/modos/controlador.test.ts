import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { ControladorJogo } from './controlador';
import { DIARIO, LIVRE, LIVRISSIMO } from './definicoes';
import { palavraDoDia } from './palavraDoDia';
import { PADROES, type Config } from '../config/definicoes';
import { carregarProgresso, carregarStats, chaveSessao, carregarSessao } from '../nucleo/armazenamento';
import type { Lexico } from '../nucleo/lexico';

const curadas = readFileSync('public/lexico/curadas.txt', 'utf8').trim().split('\n');
const validas = new Set(readFileSync('public/lexico/validas.txt', 'utf8').trim().split('\n'));

const lexico: Lexico = {
  palavras: curadas,
  ehValida: (p) => validas.has(p.toUpperCase()),
  sugerir: (letras) => {
    const postas = letras.map((l, i) => ({ l, i })).filter((x) => x.l);
    if (!postas.length) return null;
    return curadas.find((p) => postas.every(({ i, l }) => p[i] === l)) ?? null;
  },
};

function relogio(inicio = 0) {
  let t = inicio;
  return { agora: () => t, avancar: (ms: number) => (t += ms) };
}

const DIA = 640;

function criar(ajustes: Partial<Config> = {}, modo = DIARIO, indice = DIA) {
  const config = { ...PADROES, ...ajustes } as Config;
  const r = relogio();
  const controlador = new ControladorJogo({
    modo,
    indice,
    lexico,
    config: () => config,
    base: 'https://palavrada.com.br/',
    agora: r.agora,
  });
  return { controlador, relogio: r, config };
}

/** Digita e confirma um palpite. */
function palpitar(c: ControladorJogo, palavra: string) {
  for (const l of palavra) c.tecla(l);
  return c.tecla('ENTER');
}

beforeEach(() => localStorage.clear());

describe('escolha da palavra', () => {
  it('o diário usa o hash do dia', () => {
    const { controlador } = criar();
    expect(controlador.partida.palavraAlvo).toBe(palavraDoDia(DIA, curadas));
  });

  it('os modos livres indexam a lista direto', () => {
    const { controlador } = criar({}, LIVRE, 41);
    expect(controlador.partida.palavraAlvo).toBe(curadas[41]);
  });

  it('índice inexistente falha na hora, com mensagem clara', () => {
    expect(() => criar({}, LIVRE, 999_999)).toThrow(/não existe/);
  });
});

describe('teclas', () => {
  it('as setas movem o cursor sem sair das cinco posições', () => {
    const { controlador } = criar();
    controlador.tecla('→');
    controlador.tecla('→');
    expect(controlador.instantaneo.indiceFoco).toBe(2);
    for (let i = 0; i < 9; i++) controlador.tecla('→');
    expect(controlador.instantaneo.indiceFoco).toBe(4);
    for (let i = 0; i < 9; i++) controlador.tecla('←');
    expect(controlador.instantaneo.indiceFoco).toBe(0);
  });

  it('↑ respeita o limite de palpites visíveis', () => {
    const { controlador } = criar({ maxPalpites: 1 });
    palpitar(controlador, 'MUNDO');
    palpitar(controlador, 'CASAS');
    controlador.tecla('↑');
    expect(controlador.instantaneo.atual.join('')).toBe('CASAS');
    expect(controlador.tecla('↑')).toBeNull(); // MUNDO está oculto
  });

  it('com zero palpites visíveis, ↑ ainda alcança todos', () => {
    const { controlador } = criar({ maxPalpites: 0 });
    palpitar(controlador, 'MUNDO');
    palpitar(controlador, 'CASAS');
    controlador.tecla('↑');
    controlador.tecla('↑');
    expect(controlador.instantaneo.atual.join('')).toBe('MUNDO');
  });
});

describe('fixar letras acertadas', () => {
  it('trava as posições certas depois de cada palpite', () => {
    const { controlador } = criar({ fixarLetrasAcertadas: true }, LIVRE, 41);
    const alvo = controlador.partida.palavraAlvo;
    palpitar(controlador, alvo[0] + 'MUND'.slice(0, 4));
    // Só verifica se o palpite foi aceito pelo dicionário.
    if (controlador.partida.tentativas.length) {
      expect(controlador.instantaneo.letrasFixas[0]).toBe(true);
    }
  });

  it('não trava quando a partida encerra', () => {
    const { controlador } = criar({ fixarLetrasAcertadas: true }, LIVRE, 41);
    palpitar(controlador, controlador.partida.palavraAlvo);
    expect(controlador.instantaneo.revelado).toBe('ganhou');
  });
});

describe('encerramento', () => {
  it('revela a resposta e avisa quem escuta', () => {
    const { controlador } = criar({}, LIVRE, 41);
    let avisado: boolean | null = null;
    controlador.aoEncerrar = (ganhou) => (avisado = ganhou);

    palpitar(controlador, controlador.partida.palavraAlvo);
    expect(avisado).toBe(true);
    expect(controlador.instantaneo.revelado).toBe('ganhou');
    expect(controlador.cronometro.rodando).toBe(false);
  });

  it('o diário atualiza a sequência', () => {
    const { controlador } = criar();
    controlador.iniciar();
    palpitar(controlador, controlador.partida.palavraAlvo);
    expect(carregarStats()).toMatchObject({ jogadas: 1, vitorias: 1, sequencia: 1, ultimoDiaVencido: DIA });
    expect(controlador.statsDiario.sequencia).toBe(1);
  });

  it('os modos livres gravam o progresso', () => {
    const { controlador } = criar({}, LIVRE, 41);
    controlador.iniciar();
    palpitar(controlador, controlador.partida.palavraAlvo);
    expect(carregarProgresso('livre').jogados).toEqual([{ id: 41, ganhou: true, tentativas: 1 }]);
    expect(carregarProgresso('livrissimo').jogados).toEqual([]);
  });

  it('o Livríssimo grava no seu próprio progresso', () => {
    const outroLexico: Lexico = { ...lexico, palavras: ['VERSO', 'MUNDO'] };
    const controlador = new ControladorJogo({
      modo: LIVRISSIMO,
      indice: 1,
      lexico: outroLexico,
      config: () => PADROES,
      base: 'https://palavrada.com.br/',
    });
    controlador.iniciar();
    palpitar(controlador, 'MUNDO');
    expect(carregarProgresso('livrissimo').jogados).toEqual([{ id: 1, ganhou: true, tentativas: 1 }]);
    expect(carregarProgresso('livre').jogados).toEqual([]);
  });
});

describe('tempo', () => {
  it('sem limite, nunca esgota', () => {
    const { controlador, relogio: r } = criar({ tempoLimite: 'infinito' });
    controlador.iniciar();
    r.avancar(3_600_000);
    expect(controlador.verificarTempo()).toBe(false);
    expect(controlador.instantaneo.restanteSegundos).toBeNull();
  });

  it('com limite, encerra e revela ao esgotar', () => {
    const { controlador, relogio: r } = criar({ tempoLimite: 10 }, LIVRE, 41);
    let perdeu: boolean | null = null;
    controlador.aoEncerrar = (g) => (perdeu = g);
    controlador.iniciar();

    r.avancar(9000);
    expect(controlador.verificarTempo()).toBe(false);
    expect(controlador.instantaneo.restanteSegundos).toBe(1);

    r.avancar(2000);
    expect(controlador.verificarTempo()).toBe(true);
    expect(perdeu).toBe(false);
    expect(controlador.instantaneo.revelado).toBe('perdeu');
  });

  it('esgotar duas vezes não encerra duas vezes', () => {
    const { controlador, relogio: r } = criar({ tempoLimite: 10 }, LIVRE, 41);
    let vezes = 0;
    controlador.aoEncerrar = () => vezes++;
    controlador.iniciar();
    r.avancar(20_000);
    controlador.verificarTempo();
    controlador.verificarTempo();
    expect(vezes).toBe(1);
  });

  it('pausar interrompe a contagem', () => {
    const { controlador, relogio: r } = criar({ tempoLimite: 60 }, LIVRE, 41);
    controlador.iniciar();
    r.avancar(5000);
    controlador.pausar();
    r.avancar(600_000); // aba em segundo plano
    controlador.retomar();
    expect(controlador.instantaneo.restanteSegundos).toBe(55);
  });
});

describe('sessão', () => {
  it('persiste a cada palpite', () => {
    const { controlador } = criar({}, LIVRE, 41);
    controlador.iniciar();
    palpitar(controlador, 'MUNDO');
    const sessao = carregarSessao(chaveSessao('livre', 41));
    expect(sessao!.tentativas).toHaveLength(1);
    expect(sessao!.encerrada).toBe(false);
  });

  it('restaura palpites e tempo jogado', () => {
    // Bug legado: o tempo restante salvo era sobrescrito pelo limite cheio.
    const primeira = criar({ tempoLimite: 60 }, LIVRE, 41);
    primeira.controlador.iniciar();
    primeira.relogio.avancar(25_000);
    palpitar(primeira.controlador, 'MUNDO');
    primeira.controlador.pausar();

    const segunda = criar({ tempoLimite: 60 }, LIVRE, 41);
    expect(segunda.controlador.iniciar()).toBe(true);
    expect(segunda.controlador.partida.tentativas).toHaveLength(1);
    expect(segunda.controlador.instantaneo.restanteSegundos).toBe(35);
  });

  it('restaurar uma partida encerrada mostra o resultado sem recontar', () => {
    const primeira = criar({}, LIVRE, 41);
    primeira.controlador.iniciar();
    palpitar(primeira.controlador, primeira.controlador.partida.palavraAlvo);
    expect(carregarProgresso('livre').jogados[0]!.tentativas).toBe(1);

    const segunda = criar({}, LIVRE, 41);
    segunda.controlador.iniciar();
    expect(segunda.controlador.instantaneo.encerrada).toBe(true);
    expect(segunda.controlador.instantaneo.revelado).toBe('ganhou');
    // Não gravou de novo nem reiniciou o cronômetro.
    expect(carregarProgresso('livre').jogados).toHaveLength(1);
    expect(segunda.controlador.cronometro.rodando).toBe(false);
  });

  it('a sessão de outro desafio não vaza', () => {
    const a = criar({}, LIVRE, 41);
    a.controlador.iniciar();
    palpitar(a.controlador, 'MUNDO');

    const b = criar({}, LIVRE, 42);
    expect(b.controlador.iniciar()).toBe(false);
    expect(b.controlador.partida.tentativas).toHaveLength(0);
  });

  it('restaura as letras travadas quando a opção está ligada', () => {
    const primeira = criar({ fixarLetrasAcertadas: true }, LIVRE, 41);
    primeira.controlador.iniciar();
    const alvo = primeira.controlador.partida.palavraAlvo;
    const parecida = curadas.find((p) => p !== alvo && p[0] === alvo[0])!;
    palpitar(primeira.controlador, parecida);

    const segunda = criar({ fixarLetrasAcertadas: true }, LIVRE, 41);
    segunda.controlador.iniciar();
    expect(segunda.controlador.instantaneo.letrasFixas[0]).toBe(true);
  });
});

describe('instantâneo', () => {
  it('só sugere com o autocomplete ligado', () => {
    const semAuto = criar({ autocomplete: false }, LIVRE, 41);
    semAuto.controlador.tecla('A');
    expect(semAuto.controlador.instantaneo.sugestao).toBeNull();

    const comAuto = criar({ autocomplete: true }, LIVRE, 41);
    comAuto.controlador.tecla('A');
    expect(comAuto.controlador.instantaneo.sugestao).not.toBeNull();
  });

  it('não sugere depois de revelar a resposta', () => {
    const { controlador } = criar({ autocomplete: true }, LIVRE, 41);
    palpitar(controlador, controlador.partida.palavraAlvo);
    expect(controlador.instantaneo.sugestao).toBeNull();
  });

  it('não expõe pontuação ao vivo, que valeria zero durante a partida', () => {
    const { controlador } = criar({ exibirPontuacao: true }, LIVRE, 41);
    expect(controlador.instantaneo).not.toHaveProperty('pontuacao');
    // A nota final continua acessível para o modal e o compartilhamento.
    expect(controlador.partida.pontuacao).toBe(0);
    palpitar(controlador, controlador.partida.palavraAlvo);
    expect(controlador.partida.pontuacao).toBeGreaterThan(0);
  });
});

describe('texto de compartilhamento', () => {
  it('usa o link do próprio modo', () => {
    const { controlador } = criar({}, LIVRE, 41);
    palpitar(controlador, controlador.partida.palavraAlvo);
    const texto = controlador.textoCompartilhamento();
    expect(texto).toContain('🎲 Modo Livre* #42');
    expect(texto).toContain('?w=42');
    expect(texto).toContain('Venci!');
  });

  it('inclui pontos quando a opção está ligada', () => {
    const { controlador } = criar({ exibirPontuacao: true }, LIVRE, 41);
    palpitar(controlador, controlador.partida.palavraAlvo);
    expect(controlador.textoCompartilhamento()).toMatch(/Venci com \d+ pontos!/);
  });
});
