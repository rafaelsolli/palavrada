import { PALAVRAS } from '../../dados/palavras.js';

export class BadgeProgresso {
  constructor() {
    this._box   = document.getElementById('livreBadge');
    this._texto = document.getElementById('livreBadgeTexto');
  }

  atualizar(totalJogados) {
    if (totalJogados >= PALAVRAS.length) { this.ocultar(); return; }
    const pct = (totalJogados * 100 / PALAVRAS.length).toFixed(2).replace('.', ',');
    this._texto.textContent = `${pct}% completo`;
    this._box.style.display = 'flex';
  }

  ocultar() {
    this._box.style.display = 'none';
  }
}
