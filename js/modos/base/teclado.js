const LINHAS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

export class Teclado {
  constructor(aoTecla) {
    this._el = document.getElementById('teclado');
    this._aoTecla = aoTecla;
    this._construir();
    this._registrarTeclado();
  }

  _construir() {
    this._el.innerHTML = '';
    this._el.className = 'teclado';
    LINHAS.forEach(linha => {
      const linha_el = document.createElement('div');
      linha_el.className = 'teclado-linha';
      linha.forEach(k => {
        const btn = document.createElement('button');
        btn.className = 'tecla' + (k.length > 1 ? ' larga' : '');
        btn.textContent = k;
        btn.addEventListener('click', () => this._aoTecla(k));
        linha_el.appendChild(btn);
      });
      this._el.appendChild(linha_el);
    });
  }

  _registrarTeclado() {
    document.addEventListener('keydown', e => {
      if (document.querySelector('.overlay.aberto')) return;
      const k = e.key.toUpperCase();
      if (k === 'ENTER') { e.preventDefault(); this._aoTecla('ENTER'); }
      else if (k === 'BACKSPACE') { e.preventDefault(); this._aoTecla('⌫'); }
      else if (k === 'ARROWLEFT') { this._aoTecla('←'); }
      else if (k === 'ARROWRIGHT') { this._aoTecla('→'); }
      else if (k === 'ARROWUP') { e.preventDefault(); this._aoTecla('↑'); }
      else if (k === 'ARROWDOWN') { e.preventDefault(); this._aoTecla('↓'); }
      else if (/^[A-ZÁÉÍÓÚÃÕÂÊÔÇÜ]$/.test(k)) this._aoTecla(k);
    });
  }
}
