import { ModoBase } from '../base/modoBase.js';
import { Partida } from '../../nucleo/partida.js';
import { numeroDoDia } from '../../nucleo/ajudantes.js';
import { PALAVRAS } from '../../dados/palavras.js';
import { redesenharPrincipal } from '../../nucleo/canvas.js';
import { Cabecalho } from '../base/cabecalho.js';
import { Grade } from '../base/grade.js';
import { Teclado } from '../base/teclado.js';
import { Historico } from '../base/historico.js';
import { BadgeStreak } from './badgeStreak.js';
import { ModalResultado } from './modalResultado.js';
import { toast } from '../base/toast.js';

const CHAVE_STATS   = 'palavrada.diario';
const CHAVE_SESSAO  = () => `palavrada.diario.sessao.${numeroDoDia()}`;

function palavraDoDia() {
  const n = numeroDoDia();
  let h = n * 2654435761;
  h = h ^ (h >>> 16);
  return PALAVRAS[Math.abs(h) % PALAVRAS.length];
}

export class ModoDesafioDiario extends ModoBase {
  constructor(aoAbrirSeletorLivre) {
    super();
    this._diaN               = numeroDoDia();
    this._stats              = this._carregarStats();
    this._partida            = null;
    this._aoAbrirSeletorLivre = aoAbrirSeletorLivre;

    this._cabecalho = new Cabecalho();
    this._grade     = new Grade();
    this._historico = new Historico();
    this._badge     = new BadgeStreak();
    this._modal     = new ModalResultado(aoAbrirSeletorLivre);
    this._teclado   = new Teclado(k => this.aoTecla(k));
  }

  iniciar() {
    const palavra = palavraDoDia();
    this._partida = new Partida(palavra);

    this._cabecalho.exibirDiario(this._diaN, this._aoAbrirSeletorLivre);
    this._badge.atualizar(this._stats.sequencia);
    document.getElementById('freeBadge').style.display = 'none';

    const sessao = this._carregarSessao();
    if (sessao) {
      this._restaurar(sessao);
      return;
    }

    this._grade.construir(this._partida);
    this._historico.iniciar();
    redesenharPrincipal(this._partida);
  }

  aoTecla(k) {
    if (k === '←') { this._partida.focar(Math.max(0, this._partida.indiceFoco - 1)); this._grade.atualizar(this._partida); return; }
    if (k === '→') { this._partida.focar(Math.min(4, this._partida.indiceFoco + 1)); this._grade.atualizar(this._partida); return; }
    if (k === '↑') { if (this._partida.navegarCima()) this._grade.atualizar(this._partida); return; }
    if (k === '↓') { if (this._partida.navegarBaixo()) this._grade.atualizar(this._partida); return; }

    const resultado = this._partida.tecla(k);
    if (!resultado) return;

    if (resultado.tipo === 'edicao') {
      this._grade.atualizar(this._partida);
      return;
    }
    if (resultado.tipo === 'letra') {
      this._grade.animar(resultado.indice);
      this._grade.atualizar(this._partida);
      return;
    }
    if (resultado.tipo === 'erro') {
      toast(resultado.motivo === 'incompleta' ? 'Preencha todas as letras!' : 'Palavra inválida!');
      this._grade.sacudir();
      return;
    }

    // tentativa válida
    this._historico.adicionarItem(this._partida.tentativas.length - 1, this._partida);
    redesenharPrincipal(this._partida);
    this._grade.atualizar(this._partida);
    this._persistirSessao(resultado.ganhou, resultado.encerrou);

    if (resultado.encerrou) {
      this.aoEncerrar(resultado.ganhou);
    }
  }

  aoEncerrar(ganhou) {
    this._atualizarStats(ganhou);
    this._badge.atualizar(this._stats.sequencia);
    setTimeout(() => {
      this._modal.mostrar(this._partida, ganhou, this._stats);
      this._registrarBotoesCompartilhar();
    }, ganhou ? 1600 : 900);
  }

  atualizarBadge() {
    this._badge.atualizar(this._stats.sequencia);
    document.getElementById('freeBadge').style.display = 'none';
  }

  _registrarBotoesCompartilhar() {
    const btn = document.getElementById('btnCompartilharDiario');
    if (!btn) return;
    btn.onclick = () => {
      const texto = this._modal.construirTextoCompartilhar(
        this._partida, this._diaN, 'https://palavrada.com.br/'
      );
      this._compartilhar(texto);
    };
  }

  _compartilhar(texto) {
    if (navigator.share) {
      navigator.share({ text: texto }).catch(() => this._copiar(texto));
    } else {
      this._copiar(texto);
    }
  }

  _copiar(texto) {
    navigator.clipboard.writeText(texto)
      .then(() => toast('✓ Copiado para a área de transferência!'))
      .catch(() => {
        const ta = document.createElement('textarea');
        ta.value = texto; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        toast('✓ Copiado!');
      });
  }

  _atualizarStats(ganhou) {
    this._stats.jogadas = (this._stats.jogadas || 0) + 1;
    if (ganhou) {
      this._stats.vitorias = (this._stats.vitorias || 0) + 1;
      const ultimo = this._stats.ultimoDiaVencido;
      if (ultimo === this._diaN - 1 || ultimo === this._diaN) {
        this._stats.sequencia = (this._stats.sequencia || 0) + 1;
      } else {
        this._stats.sequencia = 1;
      }
      this._stats.ultimoDiaVencido = this._diaN;
    } else {
      if (this._stats.ultimoDiaVencido !== this._diaN) {
        this._stats.sequencia = 0;
      }
    }
    localStorage.setItem(CHAVE_STATS, JSON.stringify(this._stats));
  }

  _persistirSessao(ganhou, encerrada) {
    localStorage.setItem(CHAVE_SESSAO(), JSON.stringify({
      tentativas: this._partida.tentativas,
      ganhou,
      encerrada,
    }));
  }

  _carregarSessao() {
    try { return JSON.parse(localStorage.getItem(CHAVE_SESSAO())); } catch { return null; }
  }

  _carregarStats() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_STATS)) ||
        { jogadas: 0, vitorias: 0, sequencia: 0, ultimoDiaVencido: -1 };
    } catch {
      return { jogadas: 0, vitorias: 0, sequencia: 0, ultimoDiaVencido: -1 };
    }
  }

  _restaurar(sessao) {
    this._partida.restaurar(sessao);
    this._grade.construir(this._partida);
    this._historico.reconstruir(this._partida);
    redesenharPrincipal(this._partida);
    if (sessao.encerrada) {
      setTimeout(() => {
        this._modal.mostrar(this._partida, sessao.ganhou, this._stats);
        this._registrarBotoesCompartilhar();
      }, 400);
    }
  }
}
