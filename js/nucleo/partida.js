import { normalizar, valoresPalavra } from './ajudantes.js';
import { ehValida } from '../dados/validador.js';

export class Partida {
  constructor(palavraAlvo) {
    this.palavraAlvo = normalizar(palavraAlvo);
    this.valoresAlvo = valoresPalavra(palavraAlvo);
    this.tentativas = [];
    this.atual = Array(5).fill('');
    this.indiceFoco = 0;
    this.encerrada = false;
    this._navIndex = -1;
  }

  // Restaura estado a partir de uma sessão salva (modo diário)
  restaurar(sessaoSalva) {
    this.tentativas = sessaoSalva.tentativas.map(t => ({ ...t, visivel: true }));
    this.encerrada = sessaoSalva.encerrada;
    this.atual = Array(5).fill('');
    this.indiceFoco = 0;
    this._navIndex = -1;
  }

  navegarCima() {
    if (!this.tentativas.length || this.encerrada) return null;
    if (this._navIndex === 0) return null;
    this._navIndex = this._navIndex === -1 ? this.tentativas.length - 1 : this._navIndex - 1;
    this.atual = [...this.tentativas[this._navIndex].palavra];
    return { tipo: 'navegacao' };
  }

  navegarBaixo() {
    if (this._navIndex === -1) return null;
    if (this._navIndex === this.tentativas.length - 1) {
      this._navIndex = -1;
      this.atual = Array(5).fill('');
    } else {
      this._navIndex += 1;
      this.atual = [...this.tentativas[this._navIndex].palavra];
    }
    return { tipo: 'navegacao' };
  }

  focar(indice) {
    if (!this.encerrada) this.indiceFoco = indice;
  }

  toggleVisibilidade(indice) {
    if (this.tentativas[indice]) {
      this.tentativas[indice].visivel = !this.tentativas[indice].visivel;
    }
  }

  // Processa uma tecla. Retorna um objeto descrevendo o que aconteceu.
  tecla(k) {
    if (this.encerrada) return null;
    this._navIndex = -1;

    if (k === '⌫') {
      if (this.atual[this.indiceFoco]) {
        this.atual[this.indiceFoco] = '';
      } else {
        this.indiceFoco = Math.max(0, this.indiceFoco - 1);
        this.atual[this.indiceFoco] = '';
      }
      return { tipo: 'edicao' };
    }

    if (k === 'ENTER') {
      return this._submeter();
    }

    const letra = normalizar(k)[0];
    if (!letra) return null;
    const indiceAnterior = this.indiceFoco;
    this.atual[this.indiceFoco] = letra;
    const prox = this.atual.findIndex((v, i) => i > this.indiceFoco && !v);
    this.indiceFoco = prox !== -1 ? prox : this.indiceFoco;
    return { tipo: 'letra', letra, indice: indiceAnterior };
  }

  _submeter() {
    if (!this.atual.every(v => v)) {
      return { tipo: 'erro', motivo: 'incompleta' };
    }
    const palavra = this.atual.join('');
    if (!ehValida(palavra)) {
      return { tipo: 'erro', motivo: 'invalida' };
    }

    const valores = valoresPalavra(palavra);
    const delta = valores.reduce((s, v, i) => s + Math.abs(v - this.valoresAlvo[i]), 0);
    const ganhou = normalizar(palavra) === this.palavraAlvo;
    const tentativa = { palavra, valores, delta, ganhou, visivel: true };
    this.tentativas.push(tentativa);

    const encerrou = ganhou || this.tentativas.length >= 6;
    if (encerrou) this.encerrada = true;
    else { this.atual = Array(5).fill(''); this.indiceFoco = 0; }

    return { tipo: encerrou ? 'encerrou' : 'tentativa', tentativa, ganhou, encerrou };
  }
}
