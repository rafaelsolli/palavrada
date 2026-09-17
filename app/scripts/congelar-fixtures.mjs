/**
 * Congela, a partir do código do site legado, os dados que os testes de
 * compatibilidade precisam.
 *
 * Depois da virada a pasta js/ deixa de existir, mas os testes continuam
 * valendo: jogadores seguem com dados no formato antigo no localStorage por
 * muito tempo. Rodar isto antes de remover o legado preserva a garantia.
 *
 * Uso: node scripts/congelar-fixtures.mjs
 */
import { writeFileSync } from 'node:fs';

// O código legado fala com localStorage no escopo do módulo de configuração.
const memoria = new Map();
globalThis.localStorage = {
  getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
  removeItem: (k) => memoria.delete(k),
  clear: () => memoria.clear(),
  key: (i) => [...memoria.keys()][i] ?? null,
  get length() {
    return memoria.size;
  },
};

const { Partida } = await import('../../js/nucleo/partida.js');
const { salvarConfig, carregarConfig } = await import('../../js/configuracoes.js');
const seletor = await import('../../js/modos/base/modalSeletor.js');

/** Joga com a implementação antiga, com tempos realistas entre os palpites. */
function jogar(alvo, palpites, segundosPorPalpite = 12) {
  const partida = new Partida(alvo);
  let decorrido = 0;
  for (const palpite of palpites) {
    decorrido += segundosPorPalpite;
    partida.inicioPartida = Date.now() - decorrido * 1000;
    partida.atual = [...palpite];
    partida.tecla('ENTER');
  }
  return partida;
}

/** Serializa igual a `_persistirSessao` de js/modos/diario/modoDesafioDiario.js. */
function comoSessao(partida) {
  return {
    tentativas: partida.tentativas,
    ganhou: partida.tentativas.some((t) => t.ganhou),
    encerrada: partida.encerrada,
    tempoRestante: partida.tempoRestante,
    inicioPartida: partida.inicioPartida,
    historicoJogadas: partida.historicoJogadas,
  };
}

function capturar(alvo, palpites) {
  const partida = jogar(alvo, palpites);
  return {
    sessao: comoSessao(partida),
    // O que a versão antiga mostraria — o que a nova precisa reproduzir.
    esperado: {
      palavras: partida.tentativas.map((t) => t.palavra),
      deltas: partida.tentativas.map((t) => t.delta),
      penalidades: partida.historicoJogadas.map((j) => j.penalidade),
      pontuacao: partida.calcularPontuacaoAtual(),
      encerrada: partida.encerrada,
    },
  };
}

const fixtures = {
  _leiaMe:
    'Gerado por scripts/congelar-fixtures.mjs a partir do código do site anterior ' +
    'à reescrita, antes de ele ser removido. Não editar à mão.',
  _geradoEm: new Date().toISOString().slice(0, 10),

  emAndamento: capturar('VERSO', ['MUNDO', 'CASAS', 'PRATO']),
  vencida: capturar('VERSO', ['MUNDO', 'CASAS', 'VERSO']),
  umPalpite: capturar('VERSO', ['MUNDO']),
};

// Palpite inválido penalizado: gasta a vez e não tem curva.
salvarConfig('palavrasInvalidas', 'penalizar');
fixtures.comInvalida = capturar('VERSO', ['XXXXX', 'MUNDO']);
salvarConfig('palavrasInvalidas', 'recusar');

// Configuração completa, com valores fora do padrão.
memoria.clear();
salvarConfig('regraHorizontal', 25);
salvarConfig('teclado', 'alfabetico');
salvarConfig('tempoLimite', 180);
salvarConfig('exibirPontuacao', true);
fixtures.config = carregarConfig();

// Progresso dos modos livres.
memoria.clear();
seletor.salvarResultadoLivre(41, true, 3);
seletor.salvarResultadoLivre(7, false, 6);
seletor.salvarResultadoLivrissimo(900, true, 2);
fixtures.progressoLivre = JSON.parse(localStorage.getItem('palavrada.livre'));
fixtures.progressoLivrissimo = JSON.parse(localStorage.getItem('palavrada.livrissimo'));

const destino = new URL('../src/teste/fixtures/legado.json', import.meta.url).pathname;
writeFileSync(destino, JSON.stringify(fixtures, null, 2) + '\n');

console.log(`✓ fixtures congeladas em ${destino}`);
for (const nome of ['emAndamento', 'vencida', 'umPalpite', 'comInvalida']) {
  const e = fixtures[nome].esperado;
  console.log(`  ${nome.padEnd(12)} ${e.palavras.join(',')} · penalidades ${e.penalidades.join(',')} · ${e.pontuacao} pts`);
}
