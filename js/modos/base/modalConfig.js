import { cfg, salvarConfig, PADROES } from '../../configuracoes.js';

const CICLOS = {
  regraHorizontal:      [0, 5, 10, 15, 20, 25],
  eixoY:                [0, 5, 10, 15, 20, 25],
  maxPalpites:          [0, 1, 2, 3, 4, 5, 6],
  bolinhas:             [false, true],
  letrasNoGrafico:      [false, true],
  alvoNosPalpites:      [false, true],
  fixarLetrasAcertadas: [false, true],
  autocomplete:         [false, true],
  teclado:              ['qwerty', 'alfabetico'],
  palavrasInvalidas:    ['recusar', 'penalizar', 'aceitar'],
  tempoLimite:          [10, 20, 40, 60, 180, 300, 600, 900, 'infinito'],
  exibirPontuacao:      [false, true],
};

const DISPLAY = {
  teclado:           { qwerty: 'QWERTY', alfabetico: 'Alfabético' },
  palavrasInvalidas: { recusar: 'Recusar', penalizar: 'Penalizar', aceitar: 'Aceitar' },
  tempoLimite:       { 10: '10 seg', 20: '20 seg', 40: '40 seg', 60: '1 min', 180: '3 min', 300: '5 min', 600: '10 min', 900: '15 min', infinito: 'Infinito' },
};

const ID_MAP = {
  regraHorizontal:      'cfgRegraH',
  eixoY:                'cfgEixoY',
  maxPalpites:          'cfgMaxPalpites',
  bolinhas:             'cfgBolinhas',
  letrasNoGrafico:      'cfgLetrasGrafico',
  alvoNosPalpites:      'cfgAlvoMini',
  fixarLetrasAcertadas: 'cfgFixarLetras',
  autocomplete:         'cfgAutocomplete',
  teclado:              'cfgTeclado',
  palavrasInvalidas:    'cfgPalavrasInvalidas',
  tempoLimite:          'cfgTempoLimite',
  exibirPontuacao:      'cfgExibirPontuacao',
};

let _staged = {};

function _label(chave, valor) {
  if (typeof valor === 'boolean') return valor ? 'sim' : 'não';
  return DISPLAY[chave]?.[valor] ?? String(valor);
}

function _proximo(chave, valorAtual) {
  const ciclo = CICLOS[chave];
  const idx = ciclo.findIndex(v => v === valorAtual);
  return ciclo[(idx + 1) % ciclo.length];
}

function _atualizar(el, chave, valor) {
  el.textContent = _label(chave, valor);
  el.classList.toggle('modificado', valor !== PADROES[chave]);
}

function _popular() {
  const c = cfg();
  Object.keys(CICLOS).forEach(chave => {
    const el = document.getElementById(ID_MAP[chave]);
    if (!el) return;
    const valor = Object.prototype.hasOwnProperty.call(_staged, chave) ? _staged[chave] : c[chave];
    _atualizar(el, chave, valor);
  });
}

function _registrarControles() {
  Object.keys(CICLOS).forEach(chave => {
    const el = document.getElementById(ID_MAP[chave]);
    if (!el) return;
    el.addEventListener('click', () => {
      const valorAtual = Object.prototype.hasOwnProperty.call(_staged, chave) ? _staged[chave] : cfg()[chave];
      _staged[chave] = _proximo(chave, valorAtual);
      _atualizar(el, chave, _staged[chave]);
    });
  });
}

export function registrarModalConfig(aoMudar) {
  const modal  = document.getElementById('modalConfig');
  const scroll = document.getElementById('cfgScroll');
  const fade   = document.getElementById('cfgFade');

  function atualizarFade() {
    fade.style.opacity = scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 4 ? '0' : '1';
  }
  scroll.addEventListener('scroll', atualizarFade);

  function _colapsarAjudas() {
    document.querySelectorAll('.cfg-ajuda-texto').forEach(el => el.classList.remove('aberto'));
    document.querySelectorAll('.cfg-ajuda-btn').forEach(btn => { btn.textContent = '?'; });
  }

  function fechar() {
    _staged = {};
    _popular();
    _colapsarAjudas();
    modal.classList.remove('aberto');
  }

  document.getElementById('btnConfig').addEventListener('click', () => {
    _staged = {};
    _popular();
    modal.classList.add('aberto');
    scroll.scrollTop = 0;
    setTimeout(atualizarFade, 50);
  });

  document.getElementById('fecharConfig').addEventListener('click', fechar);
  modal.addEventListener('click', e => { if (e.target === modal) fechar(); });

  document.getElementById('btnAplicarConfig').addEventListener('click', () => {
    Object.keys(_staged).forEach(chave => {
      salvarConfig(chave, _staged[chave]);
      aoMudar(chave, _staged[chave]);
    });
    _staged = {};
    modal.classList.remove('aberto');
  });

  document.getElementById('btnResetConfig').addEventListener('click', () => {
    Object.keys(CICLOS).forEach(chave => { _staged[chave] = PADROES[chave]; });
    _popular();
  });

  _registrarControles();

  document.querySelectorAll('.cfg-ajuda-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const texto = document.getElementById('ajudaTxt-' + btn.dataset.cfg);
      if (!texto) return;
      const aberto = texto.classList.toggle('aberto');
      btn.textContent = aberto ? '✕' : '?';
    });
  });
}
