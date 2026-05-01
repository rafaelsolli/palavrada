import { corDelta } from '../../nucleo/ajudantes.js';
import { redesenharMini, redesenharPrincipal } from '../../nucleo/canvas.js';
import { cfg } from '../../configuracoes.js';

export class Historico {
  constructor() {
    this._el   = document.getElementById('listaHistorico');
    this._fade = document.getElementById('historicoFade');
    this._partida = null;
    this._el.addEventListener('scroll', () => this._atualizarFade());
  }

  _atualizarFade() {
    this._fade.style.opacity =
      this._el.scrollTop + this._el.clientHeight >= this._el.scrollHeight - 4 ? '0' : '1';
  }

  iniciar() {
    this._el.innerHTML = '';
    const total = cfg().maxPalpites;
    for (let i = 0; i < total; i++) {
      const ph = document.createElement('div');
      ph.className = 'h-placeholder';
      this._el.appendChild(ph);
    }
    setTimeout(() => this._atualizarFade(), 30);
  }

  reconstruir(partida) {
    this._partida = partida;
    this._renderizar();
  }

  adicionarItem(indice, partida) {
    this._partida = partida;
    this._renderizar();
  }

  redesenharMinis(partida) {
    this._partida = partida;
    document.querySelectorAll('.h-mini').forEach(mini => {
      const idx = parseInt(mini.dataset.idx);
      if (!isNaN(idx) && partida.tentativas[idx]) {
        redesenharMini(mini, partida.tentativas[idx], partida.valoresAlvo);
      }
    });
  }

  _renderizar() {
    if (!this._partida) return;
    const { tentativas, valoresAlvo } = this._partida;
    const c = cfg();

    let ordenados = tentativas.map((t, i) => ({ t, i })).reverse();
    ordenados = ordenados.slice(0, c.maxPalpites);

    this._el.innerHTML = '';
    ordenados.forEach(({ i, t }) => this._el.appendChild(this._criarItem(i, t, valoresAlvo)));
    for (let k = ordenados.length; k < c.maxPalpites; k++) {
      const ph = document.createElement('div');
      ph.className = 'h-placeholder';
      this._el.appendChild(ph);
    }
    setTimeout(() => this._atualizarFade(), 30);
  }

  _criarItem(indice, t, valoresAlvo) {
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
      this._partida.toggleVisibilidade(indice);
      item.classList.toggle('ativo', this._partida.tentativas[indice].visivel);
      redesenharPrincipal(this._partida);
    });

    setTimeout(() => redesenharMini(mini, t, valoresAlvo), 30);
    return item;
  }
}
