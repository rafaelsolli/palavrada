export class Cabecalho {
  constructor() {
    this._badgeModo = document.getElementById('badgeModo');
    this._btnAlternar = document.getElementById('btnAlternarModo');
  }

  exibirDiario(numeroDia, aoClicar, livreCompleto = false) {
    this._badgeModo.textContent = `🌞 Desafio Diário · #${numeroDia}`;
    this._badgeModo.className = 'badge-modo diario';
    this._btnAlternar.textContent = livreCompleto ? '💀' : '🎲';
    this._btnAlternar.title = livreCompleto ? '💀 Modo Livríssimo' : '🎲 Modo Livre';
    this._btnAlternar.onclick = aoClicar;
  }

  exibirLivre(idPalavra, aoClicar) {
    this._badgeModo.textContent = `🎲 Modo Livre${idPalavra >= 0 ? ' · #' + (idPalavra + 1) : ''}`;
    this._badgeModo.className = 'badge-modo livre';
    this._btnAlternar.textContent = '🌞';
    this._btnAlternar.title = 'Jogar o Desafio Diário';
    this._btnAlternar.onclick = aoClicar;
  }

  exibirLivrissimo(idPalavra, aoClicar) {
    this._badgeModo.textContent = `💀 Modo Livríssimo${idPalavra >= 0 ? ' · #' + (idPalavra + 1) : ''}`;
    this._badgeModo.className = 'badge-modo livrissimo';
    this._btnAlternar.textContent = '🌞';
    this._btnAlternar.title = 'Jogar o Desafio Diário';
    this._btnAlternar.onclick = aoClicar;
  }
}
