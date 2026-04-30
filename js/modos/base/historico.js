import { corDelta } from '../../nucleo/ajudantes.js';
import { redesenharMini, redesenharPrincipal } from '../../nucleo/canvas.js';

export class Historico {
  constructor() {
    this._el = document.getElementById('listaHistorico');
  }

  iniciar() {
    this._el.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const placeholder = document.createElement('div');
      placeholder.className = 'h-placeholder';
      placeholder.id = 'slot-' + i;
      this._el.appendChild(placeholder);
    }
  }

  // Reconstrói o histórico a partir de tentativas salvas (restauração de sessão)
  reconstruir(partida) {
    this.iniciar();
    partida.tentativas.forEach((_, i) => this.adicionarItem(i, partida));
  }

  adicionarItem(indice, partida) {
    const t = partida.tentativas[indice];
    const item = document.createElement('div');
    item.className = 'h-item ativo' + (t.ganhou ? ' ganhou-item' : '');
    item.id = 'hitem-' + indice;
    item.style.setProperty('--c', corDelta(t.delta, t.ganhou));

    const esquerda = document.createElement('div');
    esquerda.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;gap:0;flex-shrink:0;';

    const palavra_el = document.createElement('div');
    palavra_el.className = 'h-palavra' + (t.ganhou ? ' ganhou' : '');
    palavra_el.textContent = t.palavra;

    const delta_el = document.createElement('div');
    delta_el.className = 'h-delta';
    delta_el.textContent = t.ganhou ? '✓' : 'Δ ' + t.delta;

    esquerda.appendChild(palavra_el);
    esquerda.appendChild(delta_el);
    item.appendChild(esquerda);

    const mini = document.createElement('canvas');
    mini.className = 'h-mini';
    mini.dataset.idx = indice;
    item.appendChild(mini);

    item.addEventListener('click', () => {
      partida.toggleVisibilidade(indice);
      item.classList.toggle('ativo', partida.tentativas[indice].visivel);
      redesenharPrincipal(partida);
    });

    const slot = document.getElementById('slot-' + indice);
    if (slot) slot.replaceWith(item);
    else this._el.appendChild(item);

    setTimeout(() => redesenharMini(mini, t), 30);
  }

  redesenharMinis(partida) {
    document.querySelectorAll('.h-mini').forEach(mini => {
      const idx = parseInt(mini.dataset.idx);
      if (!isNaN(idx) && partida.tentativas[idx]) {
        redesenharMini(mini, partida.tentativas[idx]);
      }
    });
  }
}
