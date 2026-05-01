import { PALAVRAS } from '../../dados/palavras.js';
import { PALAVRAS_LIVRISSIMO } from '../../dados/palavrasLivrissimo.js';
import { toast } from './toast.js';

const CHAVE_PROGRESSO = 'palavrada.livre';
const CHAVE_PROGRESSO_LIVRISSIMO = 'palavrada.livrissimo';

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

export function carregarProgressoLivrissimo() {
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE_PROGRESSO_LIVRISSIMO) || 'null');
    return (d?.jogados && Array.isArray(d.jogados)) ? d : { jogados: [] };
  } catch { return { jogados: [] }; }
}

export function salvarResultadoLivrissimo(idPalavra, ganhou, tentativas) {
  const d = carregarProgressoLivrissimo();
  d.jogados = d.jogados.filter(j => j.id !== idPalavra);
  d.jogados.push({ id: idPalavra, ganhou, tentativas });
  localStorage.setItem(CHAVE_PROGRESSO_LIVRISSIMO, JSON.stringify(d));
}

export class ModalSeletor {
  constructor(aoSelecionarLivre, aoSelecionarLivrissimo = null) {
    this._el = document.getElementById('modalSeletor');
    this._aoSelecionarLivre = aoSelecionarLivre;
    this._aoSelecionarLivrissimo = aoSelecionarLivrissimo;
    this._idSelecionado = null;
    this._modoSelecionado = null;

    this._el.addEventListener('click', e => { if (e.target === this._el) this.fechar(); });
    document.getElementById('fecharSeletor').addEventListener('click', () => this.fechar());
    document.getElementById('btnCompartilharProgressoLivre').addEventListener('click', () => this._compartilharProgresso());
    document.getElementById('btnConfirmarSeletor').addEventListener('click', () => {
      if (this._idSelecionado === null) return;
      if (this._modoSelecionado === 'livrissimo' && this._aoSelecionarLivrissimo) {
        this._aoSelecionarLivrissimo(this._idSelecionado);
      } else {
        this._aoSelecionarLivre(this._idSelecionado);
      }
    });
  }

  abrir() {
    this._idSelecionado = null;
    this._modoSelecionado = null;
    this._gerarGrid();
    this._el.classList.add('aberto');

    const btnConfirmar = document.getElementById('btnConfirmarSeletor');
    btnConfirmar.disabled = true;

    const grid = document.getElementById('gridDesafios');
    const fade = document.getElementById('gridFade');
    setTimeout(() => {
      const atualizarFade = () => {
        fade.style.opacity = grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 4 ? '0' : '1';
      };
      grid.addEventListener('scroll', atualizarFade);
      atualizarFade();

      const primeiraNaoJogada = grid.querySelector('.celula-desafio:not(.concluido):not(.falhou):not(.trancada)');
      if (primeiraNaoJogada) {
        primeiraNaoJogada.click();
        setTimeout(() => primeiraNaoJogada.scrollIntoView({ block: 'center', behavior: 'smooth' }), 30);
      }
    }, 50);
  }

  fechar() {
    this._el.classList.remove('aberto');
  }

  _gerarGrid() {
    const grid = document.getElementById('gridDesafios');
    const progressoLivre = carregarProgresso();
    const progressoLivrissimo = carregarProgressoLivrissimo();
    const livreCompleto = progressoLivre.jogados.length >= PALAVRAS.length;
    grid.innerHTML = '';

    const secaoLivre = document.createElement('div');
    secaoLivre.className = 'grid-secao';
    secaoLivre.textContent = '🎲 Modo Livre';
    grid.appendChild(secaoLivre);

    for (let i = 0; i < PALAVRAS.length; i++) {
      grid.appendChild(this._criarCelula(i, progressoLivre, 'livre'));
    }

    const secaoLivrissimo = document.createElement('div');
    secaoLivrissimo.className = 'grid-secao';
    secaoLivrissimo.textContent = livreCompleto ? '💀 Modo Livríssimo' : '🔒 Modo Livríssimo';
    grid.appendChild(secaoLivrissimo);

    for (let i = 0; i < PALAVRAS_LIVRISSIMO.length; i++) {
      grid.appendChild(this._criarCelula(i, progressoLivrissimo, livreCompleto ? 'livrissimo' : 'trancada'));
    }
  }

  _criarCelula(i, progresso, modo) {
    const celula = document.createElement('div');
    celula.className = 'celula-desafio';
    celula.textContent = i + 1;

    if (modo === 'trancada') {
      celula.classList.add('trancada');
      celula.title = 'Complete o 🎲 Modo Livre primeiro';
      return celula;
    }

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
      celula.title = `${modo === 'livrissimo' ? '💀 Modo Livríssimo' : '🎲 Modo Livre'} #${i + 1}`;
      celula.onclick = () => {
        document.querySelectorAll('.celula-desafio.selecionado').forEach(el => el.classList.remove('selecionado'));
        celula.classList.add('selecionado');
        this._idSelecionado = i;
        this._modoSelecionado = modo;
        document.getElementById('btnConfirmarSeletor').disabled = false;
      };
    }

    return celula;
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
