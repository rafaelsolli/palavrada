import { ModoBase } from '../base/modoBase.js';
import { Partida } from '../../nucleo/partida.js';
import { PALAVRAS } from '../../dados/palavras.js';
import { redesenharPrincipal } from '../../nucleo/canvas.js';
import { Cabecalho } from '../base/cabecalho.js';
import { Grade } from '../base/grade.js';
import { Teclado } from '../base/teclado.js';
import { Historico } from '../base/historico.js';
import { BadgeProgresso } from './badgeProgresso.js';
import { ModalResultado } from './modalResultado.js';
import { ModalSeletor, carregarProgresso, salvarResultadoLivre } from './modalSeletor.js';
import { toast } from '../base/toast.js';

export class ModoLivre extends ModoBase {
  constructor(idPalavra, aoVoltarDiario) {
    super();
    this._idPalavra = idPalavra;
    this._partida   = null;

    this._cabecalho = new Cabecalho();
    this._grade     = new Grade(k => this.aoTecla(k));
    this._historico = new Historico();
    this._badge     = new BadgeProgresso();
    this._seletor   = new ModalSeletor(id => this._selecionarPalavra(id));
    this._modal     = new ModalResultado(() => this._seletor.abrir());
    new Teclado(k => this.aoTecla(k));
  }

  iniciar() {
    const palavra = PALAVRAS[this._idPalavra];
    this._partida = new Partida(palavra);

    this._cabecalho.exibirLivre(this._idPalavra, () => {
      window.location.href = window.location.pathname;
    });
    this._badge.atualizar(carregarProgresso().jogados.length);
    document.getElementById('streakBox').style.display = 'none';

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

    if (resultado.encerrou) {
      this.aoEncerrar(resultado.ganhou);
    }
  }

  aoEncerrar(ganhou) {
    salvarResultadoLivre(this._idPalavra, ganhou, this._partida.tentativas.length);
    this._badge.atualizar(carregarProgresso().jogados.length);
    setTimeout(() => {
      this._modal.mostrar(this._partida, ganhou, this._idPalavra);
      this._registrarBotaoCompartilhar();
    }, ganhou ? 1600 : 900);
  }

  atualizarBadge() {
    this._badge.atualizar(carregarProgresso().jogados.length);
    document.getElementById('streakBox').style.display = 'none';
  }

  _registrarBotaoCompartilhar() {
    const btn = document.getElementById('btnCompartilharLivre');
    if (!btn) return;
    btn.onclick = () => {
      const texto = this._modal.construirTextoCompartilhar(
        this._partida, this._idPalavra, 'https://palavrada.com.br/'
      );
      if (navigator.share) {
        navigator.share({ text: texto }).catch(() => this._copiar(texto));
      } else {
        this._copiar(texto);
      }
    };
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

  _selecionarPalavra(id) {
    this._seletor.fechar();
    window.location.href = '?w=' + (id + 1);
  }
}
