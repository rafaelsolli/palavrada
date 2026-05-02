import { corDelta, contagemRegressiva, numeroDoDia } from '../../nucleo/ajudantes.js';
import { formatarExtratoHTML } from '../../nucleo/pontuacao.js';
import { toast } from './toast.js';

let intervaloContagem = null;

export class ModalResultado {
  constructor(configuracao) {
    this._el = document.getElementById('modalResultado');
    this._config = configuracao;
    
    this._el.addEventListener('click', e => { if (e.target === this._el) this.fechar(); });
    document.getElementById('fecharResultado').addEventListener('click', () => this.fechar());
    document.getElementById('btnCompartilhar').addEventListener('click', () => this._compartilhar());
    document.getElementById('btnAcao').addEventListener('click', () => {
      this.fechar();
      this._config.aoClicarAcao();
    });
  }

  mostrar(partida, ganhou, ...parametrosEspecificos) {
    const numTentativas = partida.tentativas.length;
    
    // Configurar título baseado no modo
    const titulo = this._config.obterTitulo(ganhou, ...parametrosEspecificos);
    document.getElementById('resTitulo').textContent = titulo;
    
    // Gerar e inserir extrato
    const extrato = partida.obterExtratoPontuacao();
    document.getElementById('extratoContent').innerHTML = formatarExtratoHTML(extrato);

    // Configurar pontos e bolinhas
    const pontos = document.getElementById('resPontos');
    pontos.innerHTML = '';
    
    // Adicionar as bolinhas como emojis
    for (let i = 0; i < 6; i++) {
      const ponto = document.createElement('div');
      ponto.className = 'ponto-emoji';
      if (i < partida.tentativas.length) {
        const t = partida.tentativas[i];
        if (t.ganhou || t.delta < 10) {
          ponto.textContent = '🟢';
        } else if (t.delta < 20) {
          ponto.textContent = '🟡';
        } else if (t.delta < 40) {
          ponto.textContent = '🟠';
        } else {
          ponto.textContent = '🔴';
        }
      } else {
        ponto.textContent = '⚫';
      }
      pontos.appendChild(ponto);
    }

    // Configurar palavra
    const palavra_el = document.getElementById('resPalavraAtual');
    palavra_el.textContent = partida.palavraAlvo;
    palavra_el.className = 'res-palavra' + (ganhou ? '' : ' perdeu');
    
    // Configurar texto do resultado
    const resultadoTexto = document.getElementById('resultadoTexto');
    if (resultadoTexto) {
      resultadoTexto.textContent = ganhou ? 'venceu, e' : 'perdeu, mas';
    }

    // Configurar contagem regressiva
    clearInterval(intervaloContagem);
    const atualizar = () => {
      document.getElementById('contagem').textContent = contagemRegressiva();
    };
    atualizar();
    intervaloContagem = setInterval(atualizar, 1000);

    // Configurar botão de ação
    const btnAcao = document.getElementById('btnAcao');
    const configBotao = this._config.obterConfigBotao(...parametrosEspecificos);
    btnAcao.textContent = configBotao.texto;
    btnAcao.className = `mbtn ${configBotao.classe || ''}`;

    // Armazenar dados para compartilhamento
    this._dadosCompartilhamento = { partida, ganhou, parametrosEspecificos };

    this._el.classList.add('aberto');
  }

  fechar() {
    this._el.classList.remove('aberto');
    clearInterval(intervaloContagem);
  }

  _compartilhar() {
    if (!this._dadosCompartilhamento) return;
    
    const { partida, ganhou, parametrosEspecificos } = this._dadosCompartilhamento;
    const texto = this._config.construirTextoCompartilhar(partida, ganhou, ...parametrosEspecificos);
    
    if (navigator.share) {
      navigator.share({ text: texto });
    } else {
      navigator.clipboard.writeText(texto)
        .then(() => toast('✓ Copiado!'))
        .catch(() => {
          const ta = document.createElement('textarea');
          ta.value = texto; ta.style.cssText = 'position:fixed;opacity:0';
          document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); document.body.removeChild(ta);
          toast('✓ Copiado!');
        });
    }
  }
}

// Configurações específicas para cada modo
export const ConfiguracaoDiario = {
  obterTitulo: (ganhou) => {
    const numeroDia = numeroDoDia();
    return `🌞 Desafio Diário #${numeroDia}`;
  },
  
  obterConfigBotao: (stats, livreCompleto = false) => ({
    texto: livreCompleto ? '💀 Modo Livríssimo' : '🎲 Modo Livre',
    classe: 'livre-btn'
  }),
  
  construirTextoCompartilhar: (partida, ganhou) => {
    const numeroDia = numeroDoDia();
    const pontuacao = partida.pontuacaoAtual || 0;
    const dots = partida.tentativas.map(t => {
      if (t.ganhou || t.delta < 10) return '🟢';
      if (t.delta < 20) return '🟡';
      if (t.delta < 40) return '🟠';
      return '🔴';
    }).join(' ');
    const vazios = Array(6 - partida.tentativas.length).fill('⚫').join(' ');
    const todos = dots + (vazios ? ' ' + vazios : '');
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    return `*🌞 Desafio Diário* #${numeroDia}\n${ganhou ? 'Venci' : 'Perdi'} com ${pontuacao} pontos!\n${todos}\nSua vez: ${baseUrl}`;
  },
  
  aoClicarAcao: () => {} // Será definido no construtor do modo
};

export const ConfiguracaoLivre = {
  obterTitulo: (ganhou, idPalavra) => {
    return `🎲 Modo Livre #${idPalavra + 1}`;
  },
  
  obterConfigBotao: () => ({
    texto: '🎲 Modo Livre',
    classe: 'livre-btn'
  }),
  
  construirTextoCompartilhar: (partida, ganhou, idPalavra) => {
    const pontuacao = partida.pontuacaoAtual || 0;
    const dots = partida.tentativas.map(t => {
      if (t.ganhou || t.delta < 10) return '🟢';
      if (t.delta < 20) return '🟡';
      if (t.delta < 40) return '🟠';
      return '🔴';
    }).join(' ');
    const vazios = Array(6 - partida.tentativas.length).fill('⚫').join(' ');
    const todos = dots + (vazios ? ' ' + vazios : '');
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const link = `${baseUrl}?w=${idPalavra + 1}`;
    return `*🎲 Modo Livre* #${idPalavra + 1}\n${ganhou ? 'Venci' : 'Perdi'} com ${pontuacao} pontos!\n${todos}\nSua vez: ${link}`;
  },
  
  aoClicarAcao: () => {} // Será definido no construtor do modo
};

export const ConfiguracaoLivrissimo = {
  obterTitulo: (ganhou, idPalavra) => {
    return `💀 Modo Livríssimo #${idPalavra + 1}`;
  },
  
  obterConfigBotao: () => ({
    texto: '💀 Modo Livríssimo',
    classe: 'livre-btn'
  }),
  
  construirTextoCompartilhar: (partida, ganhou, idPalavra) => {
    const pontuacao = partida.pontuacaoAtual || 0;
    const dots = partida.tentativas.map(t => {
      if (t.ganhou || t.delta < 10) return '🟢';
      if (t.delta < 20) return '🟡';
      if (t.delta < 40) return '🟠';
      return '🔴';
    }).join(' ');
    const vazios = Array(6 - partida.tentativas.length).fill('⚫').join(' ');
    const todos = dots + (vazios ? ' ' + vazios : '');
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const link = `${baseUrl}?l=${idPalavra + 1}`;
    return `*💀 Modo Livríssimo* #${idPalavra + 1}\n${ganhou ? 'Venci' : 'Perdi'} com ${pontuacao} pontos!\n${todos}\nSua vez: ${link}`;
  },
  
  aoClicarAcao: () => {} // Será definido no construtor do modo
};