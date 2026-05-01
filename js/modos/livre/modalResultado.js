import { corDelta, contagemRegressiva } from '../../nucleo/ajudantes.js';

let intervaloContagem = null;

export class ModalResultado {
  constructor(aoAbrirSeletor) {
    this._el = document.getElementById('modalResultadoLivre');
    this._el.addEventListener('click', e => { if (e.target === this._el) this.fechar(); });
    document.getElementById('fecharResultadoLivre').addEventListener('click', () => this.fechar());
    document.getElementById('btnJogarOutraLivre').addEventListener('click', () => {
      this.fechar();
      aoAbrirSeletor();
    });
  }

  mostrar(partida, ganhou, idPalavra) {
    const numTentativas = partida.tentativas.length;

    document.getElementById('resTituloLivre').textContent =
      `🎲 Modo Livre #${idPalavra + 1} · Você ${ganhou ? 'venceu' : 'perdeu'}!`;
    document.getElementById('resNumeroLivre').textContent = ganhou ? `${numTentativas}/6` : 'X/6';

    const palavra_el = document.getElementById('resPalavraAtualLivre');
    palavra_el.textContent = partida.palavraAlvo;
    palavra_el.className = 'res-palavra' + (ganhou ? '' : ' perdeu');

    const pontos = document.getElementById('resPontosLivre');
    pontos.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const ponto = document.createElement('div');
      ponto.className = 'ponto';
      if (i < partida.tentativas.length) {
        const t = partida.tentativas[i];
        const cor = corDelta(t.delta, t.ganhou);
        ponto.style.background = cor;
        ponto.style.boxShadow = `0 0 8px ${cor}55`;
      } else {
        ponto.style.background = 'var(--surface2)';
        ponto.style.border = '1px solid var(--border)';
      }
      pontos.appendChild(ponto);
    }

    clearInterval(intervaloContagem);
    const atualizar = () => {
      document.getElementById('contagemLivre').textContent = contagemRegressiva();
    };
    atualizar();
    intervaloContagem = setInterval(atualizar, 1000);

    this._el.classList.add('aberto');
  }

  fechar() {
    this._el.classList.remove('aberto');
    clearInterval(intervaloContagem);
  }

  construirTextoCompartilhar(partida, idPalavra, baseUrl, urlParam = 'w', modeLabel = '🎲 Modo Livre') {
    const ganhou = partida.tentativas.at(-1)?.ganhou;
    const score = ganhou ? `${partida.tentativas.length}/6` : 'X/6';
    const dots = partida.tentativas.map(t => {
      if (t.ganhou || t.delta < 10) return '🟢';
      if (t.delta < 20) return '🟡';
      if (t.delta < 40) return '🟠';
      return '🔴';
    }).join(' ');
    const vazios = Array(6 - partida.tentativas.length).fill('⚫').join(' ');
    const todos = dots + (vazios ? ' ' + vazios : '');
    const link = `${baseUrl}?${urlParam}=${idPalavra + 1}`;
    return `Joguei o ${modeLabel} #${idPalavra + 1} e ${ganhou ? 'venci' : 'perdi'}!\n${todos} · ${score}\nSua vez! ${link}`;
  }
}
