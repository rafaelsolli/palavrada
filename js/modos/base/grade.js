import { PALAVRAS } from '../../dados/palavras.js';
import { cfg } from '../../configuracoes.js';

const modoDebug = ['localhost', '127.0.0.1'].includes(window.location.hostname);

function sugestaoAutocomplete(atual) {
  const postos = atual.map((l, i) => l ? { i, l } : null).filter(Boolean);
  if (!postos.length) return null;
  return PALAVRAS.find(p => postos.every(({ i, l }) => p[i] === l)) || null;
}

export class Grade {
  constructor() {
    this._el = document.getElementById('grade');
  }

  construir(partida) {
    this._el.innerHTML = '';
    this._el.className = 'grade';
    for (let i = 0; i < 5; i++) {
      const caixa = document.createElement('div');
      caixa.className = 'letra';
      caixa.id = 'letra-' + i;
      caixa.addEventListener('click', () => partida.focar(i) || this.atualizar(partida));
      this._el.appendChild(caixa);
    }
    this.atualizar(partida);
  }

  atualizar(partida) {
    if (partida.revelado) {
      const classe = partida.revelado === 'ganhou' ? 'fixada' : 'revelada-erro';
      for (let i = 0; i < 5; i++) {
        const caixa = document.getElementById('letra-' + i);
        if (!caixa) continue;
        caixa.textContent = partida.atual[i];
        caixa.className = 'letra ' + classe;
      }
      return;
    }

    const c = cfg();
    const sugestao = c.autocomplete ? sugestaoAutocomplete(partida.atual) : null;

    for (let i = 0; i < 5; i++) {
      const caixa = document.getElementById('letra-' + i);
      if (!caixa) continue;
      const letraAtual = partida.atual[i];
      const fixada = partida.letrasFixas[i];

      let placeholder = '';
      if (!letraAtual) {
        if (c.autocomplete && sugestao) placeholder = sugestao[i];
        else if (modoDebug) placeholder = partida.palavraAlvo[i];
      }

      caixa.textContent = letraAtual || placeholder;
      const focada = !partida.encerrada && i === partida.indiceFoco;
      const preenchida = !!letraAtual;
      const hint = !letraAtual && !!placeholder;

      caixa.className = 'letra' +
        (focada   ? ' focada'    : '') +
        (preenchida ? ' preenchida' : '') +
        (fixada   ? ' fixada'    : '') +
        (hint     ? ' hint'      : '');
    }
  }

  animar(indice) {
    const caixa = document.getElementById('letra-' + indice);
    if (!caixa) return;
    caixa.classList.add('pop');
    caixa.addEventListener('animationend', () => caixa.classList.remove('pop'), { once: true });
  }

  sacudir() {
    this._el.style.animation = 'none';
    void this._el.offsetHeight;
    this._el.style.animation = 'shk .38s ease';
  }
}
