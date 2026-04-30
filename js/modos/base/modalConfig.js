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
};

const DISPLAY = {
  teclado: { qwerty: 'QWERTY', alfabetico: 'Alfabético' },
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
};

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
    if (el) _atualizar(el, chave, c[chave]);
  });
}

function _registrarControles(aoMudar) {
  Object.keys(CICLOS).forEach(chave => {
    const el = document.getElementById(ID_MAP[chave]);
    if (!el) return;
    el.addEventListener('click', () => {
      const novoValor = _proximo(chave, cfg()[chave]);
      salvarConfig(chave, novoValor);
      _atualizar(el, chave, novoValor);
      aoMudar(chave, novoValor);
    });
  });
}

function _registrarReset(aoMudar) {
  document.getElementById('btnResetConfig').addEventListener('click', () => {
    Object.keys(CICLOS).forEach(chave => {
      salvarConfig(chave, PADROES[chave]);
      aoMudar(chave, PADROES[chave]);
    });
    _popular();
  });
}

export function registrarModalConfig(aoMudar) {
  const modal = document.getElementById('modalConfig');
  document.getElementById('btnConfig').addEventListener('click', () => {
    _popular();
    modal.classList.add('aberto');
  });
  document.getElementById('fecharConfig').addEventListener('click', () => modal.classList.remove('aberto'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('aberto'); });
  _registrarControles(aoMudar);
  _registrarReset(aoMudar);
}
