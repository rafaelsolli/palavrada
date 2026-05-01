import { PALAVRAS_LIVRISSIMO } from '../../dados/palavrasLivrissimo.js';

export class BadgeLivrissimo {
  constructor() {
    this._box   = document.getElementById('livrissimoBadge');
    this._texto = document.getElementById('livrissimoBadgeTexto');
  }

  atualizar(totalJogados) {
    const pct = (totalJogados * 100 / PALAVRAS_LIVRISSIMO.length).toFixed(2).replace('.', ',');
    this._texto.textContent = `${pct}% completo`;
    this._box.style.display = 'flex';
    document.getElementById('livreBadge').style.display = 'none';
  }

  ocultar() {
    this._box.style.display = 'none';
  }
}
