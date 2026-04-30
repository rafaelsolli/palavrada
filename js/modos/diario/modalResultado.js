import { corDelta, contagemRegressiva, numeroDoDia } from '../../nucleo/ajudantes.js';

let intervaloContagem = null;

export class ModalResultado {
  constructor(aoAbrirSeletorLivre) {
    this._el = document.getElementById('modalResultadoDiario');
    this._aoAbrirSeletorLivre = aoAbrirSeletorLivre;
    this._el.addEventListener('click', e => { if (e.target === this._el) this.fechar(); });
    document.getElementById('fecharResultadoDiario').addEventListener('click', () => this.fechar());
    document.getElementById('btnSelecionarLivreDoResultado').addEventListener('click', () => {
      this.fechar();
      this._aoAbrirSeletorLivre();
    });
  }

  mostrar(partida, ganhou, stats) {
    const numTentativas = partida.tentativas.length;
    const numeroDia = numeroDoDia();

    document.getElementById('resTituloDiario').textContent =
      `🌞 Desafio Diário #${numeroDia} · Você ${ganhou ? 'venceu' : 'perdeu'}!`;
    document.getElementById('resNumeroDiario').textContent = ganhou ? `${numTentativas}/6` : 'X/6';

    const palavra_el = document.getElementById('resPalavraAtualDiario');
    palavra_el.textContent = partida.palavraAlvo;
    palavra_el.className = 'res-palavra' + (ganhou ? '' : ' perdeu');

    const pontos = document.getElementById('resPontosDiario');
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
      document.getElementById('contagemDiario').textContent = contagemRegressiva();
    };
    atualizar();
    intervaloContagem = setInterval(atualizar, 1000);

    this._el.classList.add('aberto');
  }

  fechar() {
    this._el.classList.remove('aberto');
    clearInterval(intervaloContagem);
  }

  construirTextoCompartilhar(partida, numeroDia, baseUrl) {
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
    return `Joguei o 🌞 Desafio Diário #${numeroDia} e ${ganhou ? 'venci' : 'perdi'}!\n${todos} · ${score}\nSua vez! ${baseUrl}`;
  }
}
