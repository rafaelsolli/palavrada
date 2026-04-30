const modoDebug = ['localhost', '127.0.0.1'].includes(window.location.hostname);

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
    for (let i = 0; i < 5; i++) {
      const caixa = document.getElementById('letra-' + i);
      if (!caixa) continue;
      const letraAtual = partida.atual[i];
      caixa.textContent = letraAtual || (modoDebug ? partida.palavraAlvo[i] : '');
      const focada = !partida.encerrada && i === partida.indiceFoco;
      const preenchida = !!letraAtual;
      const hint = modoDebug && !letraAtual;
      caixa.className = 'letra' +
        (focada ? ' focada' : '') +
        (preenchida ? ' preenchida' : '') +
        (hint ? ' hint' : '');
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
