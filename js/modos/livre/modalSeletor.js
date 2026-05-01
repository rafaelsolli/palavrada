import { PALAVRAS } from '../../dados/palavras.js';
import { toast } from '../base/toast.js';

const CHAVE_PROGRESSO = 'palavrada.livre';

export function carregarProgresso() {
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE_PROGRESSO) || 'null');
    return (d?.jogados && Array.isArray(d.jogados)) ? d : { jogados: [] };
  } catch { return { jogados: [] }; }
}

export function salvarResultadoLivre(idPalavra, ganhou, tentativas) {
  const d = carregarProgresso();
  d.jogados = d.jogados.filter(j => j.id !== idPalavra);
  d.jogados.push({ id: idPalavra, ganhou, tentativas });
  localStorage.setItem(CHAVE_PROGRESSO, JSON.stringify(d));
}

export class ModalSeletor {
  constructor(aoSelecionarPalavra) {
    this._el = document.getElementById('modalSeletorLivre');
    this._aoSelecionarPalavra = aoSelecionarPalavra;
    this._idSelecionado = null;

    this._el.addEventListener('click', e => { if (e.target === this._el) this.fechar(); });
    document.getElementById('fecharSeletorLivre').addEventListener('click', () => this.fechar());
    document.getElementById('btnCompartilharProgressoLivre').addEventListener('click', () => this._compartilharProgresso());
    document.getElementById('btnConfirmarSeletor').addEventListener('click', () => {
      if (this._idSelecionado !== null) this._aoSelecionarPalavra(this._idSelecionado);
    });
  }

  abrir() {
    this._idSelecionado = null;
    this._gerarGrid();
    this._el.classList.add('aberto');

    const btnConfirmar = document.getElementById('btnConfirmarSeletor');
    const primeiraNaoJogada = document.querySelector('.celula-desafio:not(.concluido):not(.falhou)');
    if (primeiraNaoJogada) {
      primeiraNaoJogada.click();
    } else {
      btnConfirmar.disabled = true;
    }

    const grid = document.getElementById('gridDesafios');
    const fade = document.getElementById('gridFade');
    setTimeout(() => {
      const atualizarFade = () => {
        fade.style.opacity = grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 4 ? '0' : '1';
      };
      grid.addEventListener('scroll', atualizarFade);
      atualizarFade();
    }, 50);
  }

  fechar() {
    this._el.classList.remove('aberto');
  }

  _gerarGrid() {
    const grid = document.getElementById('gridDesafios');
    const progresso = carregarProgresso();
    grid.innerHTML = '';

    for (let i = 0; i < PALAVRAS.length; i++) {
      const celula = document.createElement('div');
      celula.className = 'celula-desafio';
      celula.textContent = i + 1;

      const jogado = progresso.jogados.find(j => j.id === i);
      if (jogado) {
        if (jogado.ganhou) {
          celula.classList.add('concluido');
          celula.textContent = '✓';
          celula.title = `#${i + 1}: vencido em ${jogado.tentativas} tentativa${jogado.tentativas === 1 ? '' : 's'}`;
        } else {
          celula.classList.add('falhou');
          celula.textContent = '✕';
          celula.title = `#${i + 1}: não completado`;
        }
      } else {
        celula.title = `Desafio #${i + 1}`;
        celula.onclick = () => {
          document.querySelectorAll('.celula-desafio.selecionado').forEach(el => el.classList.remove('selecionado'));
          celula.classList.add('selecionado');
          this._idSelecionado = i;
          document.getElementById('btnConfirmarSeletor').disabled = false;
        };
      }

      grid.appendChild(celula);
    }
  }

  _compartilharProgresso() {
    const d = carregarProgresso();
    const total    = PALAVRAS.length;
    const ganhos   = d.jogados.filter(j => j.ganhou).length;
    const perdidos = d.jogados.filter(j => !j.ganhou).length;
    const jogados  = ganhos + perdidos;
    const pct = n => (n * 100 / total).toFixed(2).replace('.', ',');
    const txt = [
      `Estou com ${pct(jogados)}% do 🎲 Modo Livre completo!`,
      `⚫ ${total - jogados} ${total - jogados === 1 ? 'pendente' : 'pendentes'}`,
      `🟢 ${ganhos} ${ganhos === 1 ? 'certo' : 'certos'}`,
      `🔴 ${perdidos} ${perdidos === 1 ? 'errado' : 'errados'}`,
      `Sua vez! https://palavrada.com.br/`,
    ].join('\n');
    if (navigator.share) navigator.share({ text: txt });
    else navigator.clipboard.writeText(txt).then(() => toast('Copiado!'));
  }
}
