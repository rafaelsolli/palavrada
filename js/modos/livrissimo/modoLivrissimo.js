import { ModoBase } from '../base/modoBase.js';
import { Partida } from '../../nucleo/partida.js';
import { PALAVRAS_LIVRISSIMO } from '../../dados/palavrasLivrissimo.js';
import { redesenharPrincipal } from '../../nucleo/canvas.js';
import { Cabecalho } from '../base/cabecalho.js';
import { Grade } from '../base/grade.js';
import { Teclado } from '../base/teclado.js';
import { Historico } from '../base/historico.js';
import { BadgeLivrissimo } from './badgeLivrissimo.js';
import { ModalResultado } from '../livre/modalResultado.js';
import { ModalSeletor, carregarProgressoLivrissimo, salvarResultadoLivrissimo } from '../base/modalSeletor.js';
import { toast } from '../base/toast.js';
import { cfg } from '../../configuracoes.js';

export class ModoLivrissimo extends ModoBase {
  constructor(idPalavra, aoVoltarDiario) {
    super();
    this._idPalavra = idPalavra;
    this._partida   = null;

    this._cabecalho = new Cabecalho();
    this._grade     = new Grade();
    this._historico = new Historico();
    this._badge     = new BadgeLivrissimo();
    this._seletor   = new ModalSeletor(
      id => { window.location.href = '?w=' + (id + 1); },
      id => this._selecionarPalavra(id)
    );
    this._modal     = new ModalResultado(() => this._seletor.abrir());
    this._teclado   = new Teclado(k => this.aoTecla(k));
  }

  iniciar() {
    const palavra = PALAVRAS_LIVRISSIMO[this._idPalavra];
    this._partida = new Partida(palavra);

    this._cabecalho.exibirLivrissimo(this._idPalavra, () => {
      window.location.href = window.location.pathname;
    });
    this._badge.atualizar(carregarProgressoLivrissimo().jogados.length);
    document.getElementById('streakBox').style.display = 'none';

    this._grade.construir(this._partida);
    this._historico.iniciar();
    redesenharPrincipal(this._partida);
  }

  aoTecla(k) {
    if (k === '←') { this._partida.focar(Math.max(0, this._partida.indiceFoco - 1)); this._grade.atualizar(this._partida); return; }
    if (k === '→') { this._partida.focar(Math.min(4, this._partida.indiceFoco + 1)); this._grade.atualizar(this._partida); return; }
    if (k === '↑') { const max = cfg().maxPalpites; const min = max > 0 ? Math.max(0, this._partida.tentativas.length - max) : 0; if (this._partida.navegarCima(min)) this._grade.atualizar(this._partida); return; }
    if (k === '↓') { if (this._partida.navegarBaixo()) this._grade.atualizar(this._partida); return; }

    const resultado = this._partida.tecla(k);
    if (!resultado) return;

    if (resultado.tipo === 'edicao') { this._grade.atualizar(this._partida); return; }
    if (resultado.tipo === 'letra') { this._grade.animar(resultado.indice); this._grade.atualizar(this._partida); return; }
    if (resultado.tipo === 'erro') {
      toast(resultado.motivo === 'incompleta' ? 'Preencha todas as letras!' : 'Palavra inválida!');
      this._grade.sacudir();
      return;
    }

    this._historico.adicionarItem(this._partida.tentativas.length - 1, this._partida);
    redesenharPrincipal(this._partida);
    if (cfg().fixarLetrasAcertadas && !resultado.encerrou) this._partida.fixar();
    this._grade.atualizar(this._partida);

    if (resultado.encerrou) this.aoEncerrar(resultado.ganhou);
  }

  aoEncerrar(ganhou) {
    salvarResultadoLivrissimo(this._idPalavra, ganhou, this._partida.tentativas.length);
    this._badge.atualizar(carregarProgressoLivrissimo().jogados.length);
    setTimeout(() => {
      this._modal.mostrar(this._partida, ganhou, this._idPalavra);
      this._registrarBotaoCompartilhar();
      const btnJogar = document.getElementById('btnJogarOutraLivre');
      if (btnJogar) btnJogar.textContent = '💀 Modo Livríssimo';
    }, ganhou ? 1600 : 900);
  }

  atualizarBadge() {
    this._badge.atualizar(carregarProgressoLivrissimo().jogados.length);
    document.getElementById('streakBox').style.display = 'none';
  }

  _registrarBotaoCompartilhar() {
    const btn = document.getElementById('btnCompartilharLivre');
    if (!btn) return;
    btn.onclick = () => {
      const texto = this._modal.construirTextoCompartilhar(
        this._partida, this._idPalavra, 'https://palavrada.com.br/', 'x', '💀 Modo Livríssimo'
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
    window.location.href = '?x=' + (id + 1);
  }
}
