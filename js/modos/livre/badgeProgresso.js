import { PALAVRAS } from '../../dados/palavras.js';

export class BadgeProgresso {
  constructor() {
    this._box   = document.getElementById('freeBadge');
    this._texto = document.getElementById('freeBadgeTexto');
  }

  atualizar(totalJogados) {
    const pct = (totalJogados * 100 / PALAVRAS.length).toFixed(2).replace('.', ',');
    this._texto.textContent = `${pct}% completo`;
    this._box.style.display = 'flex';
  }

  ocultar() {
    this._box.style.display = 'none';
  }
}
