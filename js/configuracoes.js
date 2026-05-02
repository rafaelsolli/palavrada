const CHAVE = 'palavrada.config';

export const PADROES = {
  regraHorizontal: 5,
  eixoY: 0,
  bolinhas: false,
  alvoNosPalpites: false,
  letrasNoGrafico: false,
  maxPalpites: 6,
  teclado: 'qwerty',
  fixarLetrasAcertadas: false,
  autocomplete: false,
  palavrasInvalidas: 'recusar',
  tempoLimite: 'infinito',
  exibirPontuacao: false,
};

let _cfg = { ...PADROES };

export function carregarConfig() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    if (salvo) _cfg = { ...PADROES, ...salvo };
  } catch {}
  return _cfg;
}

export function cfg() { return _cfg; }

export function salvarConfig(chave, valor) {
  _cfg[chave] = valor;
  localStorage.setItem(CHAVE, JSON.stringify(_cfg));
}
