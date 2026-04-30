export class BadgeStreak {
  constructor() {
    this._box = document.getElementById('streakBox');
    this._texto = document.getElementById('streakTexto');
  }

  atualizar(sequencia) {
    if (sequencia > 0) {
      const s = sequencia;
      this._texto.textContent = `${s} vitória${s === 1 ? '' : 's'} seguida${s === 1 ? '' : 's'}`;
      this._box.style.display = 'flex';
    } else {
      this._box.style.display = 'none';
    }
  }

  ocultar() {
    this._box.style.display = 'none';
  }
}
