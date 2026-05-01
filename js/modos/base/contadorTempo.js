import { cfg } from '../../configuracoes.js';

export class ContadorTempo {
  constructor() {
    this.elemento = document.getElementById('tempoContador');
    this.textoElemento = document.getElementById('tempoTexto');
  }

  configurar(partida, aoTempoEsgotar) {
    const tempoConfig = cfg().tempoLimite;
    
    // Sempre mostrar o contador
    
    // Se for infinito, apenas mostrar o símbolo sem configurar timer
    if (tempoConfig === 'infinito') {
      this.atualizar('infinito', null);
      return;
    }

    // Configurar o tempo limite na partida
    const tempoEmSegundos = typeof tempoConfig === 'number' ? tempoConfig : null;
    if (!tempoEmSegundos) {
      this.atualizar('infinito', null);
      return;
    }

    // Configurar a partida com o timer
    partida.configurarTempo(
      tempoEmSegundos,
      aoTempoEsgotar,
      (tempoRestante, tempoTotal) => this.atualizar(tempoRestante, tempoTotal)
    );

    this.atualizar(tempoEmSegundos, tempoEmSegundos);
  }

  iniciar(partida) {
    if (partida.tempoLimite && !partida.encerrada) {
      partida.iniciarTimer();
    }
  }

  parar(partida) {
    partida.pararTimer();
  }

  atualizar(tempoRestante, tempoTotal) {
    if (tempoRestante === null || tempoRestante === 'infinito') {
      this.textoElemento.textContent = '∞';
      return;
    }

    const formatado = this.formatarTempo(tempoRestante);
    this.textoElemento.textContent = formatado;
  }

  formatarTempo(segundos) {
    if (segundos <= 0) return '0';
    
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}`;
  }

  esconder() {
    // Removido - contador sempre fica visível
  }
}