import { normalizar, valoresPalavra } from './ajudantes.js';
import { ehValida } from '../dados/validador.js';
import { cfg } from '../configuracoes.js';
import { calcularPenalidadePalpite, calcularPontuacaoFinal, gerarExtratoPontuacao } from './pontuacao.js';

export class Partida {
  constructor(palavraAlvo) {
    this.palavraAlvo = normalizar(palavraAlvo);
    this.valoresAlvo = valoresPalavra(this.palavraAlvo); // Usar palavra já normalizada
    this.tentativas = [];
    this.atual = Array(5).fill('');
    this.indiceFoco = 0;
    this.encerrada = false;
    this._navIndex = -1;
    this.letrasFixas = Array(5).fill(false);
    this.revelado = null;
    
    // Timer properties
    this.tempoLimite = null; // em segundos, null = infinito
    this.tempoRestante = null; // em segundos
    this.intervalId = null;
    this.aoTempoEsgotar = null; // callback
    this.aoAtualizarTempo = null; // callback para atualizar UI
    
    // Pontuação properties
    this.inicioPartida = Date.now(); // timestamp do início
    this.historicoJogadas = []; // array com histórico de jogadas para pontuação
    this.pontuacaoAtual = 1000; // pontuação atual (atualizada a cada jogada)
  }

  // ── Timer methods ──
  configurarTempo(tempoEmSegundos, aoTempoEsgotar, aoAtualizarTempo) {
    this.tempoLimite = tempoEmSegundos;
    this.tempoRestante = tempoEmSegundos;
    this.aoTempoEsgotar = aoTempoEsgotar;
    this.aoAtualizarTempo = aoAtualizarTempo;
  }

  iniciarTimer() {
    if (!this.tempoLimite || this.encerrada || this.intervalId) return;
    
    this.intervalId = setInterval(() => {
      this.tempoRestante--;
      
      if (this.aoAtualizarTempo) {
        this.aoAtualizarTempo(this.tempoRestante, this.tempoLimite);
      }
      
      if (this.tempoRestante <= 0) {
        this.pararTimer();
        this.encerrada = true;
        if (this.aoTempoEsgotar) {
          this.aoTempoEsgotar();
        }
      }
    }, 1000);
  }

  pararTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  pausarTimer() {
    this.pararTimer();
  }

  formatarTempo(segundos) {
    if (segundos === null || segundos === 'infinito') return '∞';
    
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  }

  // ── Pontuação methods ──
  obterTempoPassadoSegundos() {
    return Math.floor((Date.now() - this.inicioPartida) / 1000);
  }

  calcularPontuacaoAtual() {
    const ganhou = this.tentativas.some(t => t.ganhou) || this.revelado === 'ganhou';
    return calcularPontuacaoFinal(this.historicoJogadas, ganhou);
  }

  obterExtratoPontuacao() {
    const ganhou = this.tentativas.some(t => t.ganhou) || this.revelado === 'ganhou';
    const pontuacaoFinal = this.calcularPontuacaoAtual();
    return gerarExtratoPontuacao(this.historicoJogadas, pontuacaoFinal, ganhou, this.tentativas);
  }

  // Restaura estado a partir de uma sessão salva (modo diário)
  restaurar(sessaoSalva) {
    this.tentativas = sessaoSalva.tentativas.map(t => ({ ...t, visivel: true }));
    this.encerrada = sessaoSalva.encerrada;
    this.atual = Array(5).fill('');
    this.indiceFoco = 0;
    this._navIndex = -1;
    this.letrasFixas = Array(5).fill(false);
    this.revelado = null;
    
    // Restaurar dados de pontuação
    if (sessaoSalva.inicioPartida) {
      this.inicioPartida = sessaoSalva.inicioPartida;
    }
    if (sessaoSalva.historicoJogadas) {
      this.historicoJogadas = [...sessaoSalva.historicoJogadas];
      this.pontuacaoAtual = this.calcularPontuacaoAtual();
    }
    
    // Restaurar timer se houver
    if (sessaoSalva.tempoRestante !== undefined && !this.encerrada) {
      this.tempoRestante = sessaoSalva.tempoRestante;
      if (this.aoAtualizarTempo) {
        this.aoAtualizarTempo(this.tempoRestante, this.tempoLimite);
      }
    }
  }

  // Chamado pelo modo após uma tentativa válida quando fixarLetrasAcertadas está ativo
  revelarResposta(ganhou) {
    this.atual = [...this.palavraAlvo];
    this.revelado = ganhou ? 'ganhou' : 'perdeu';
  }

  fixar() {
    for (const t of this.tentativas) {
      if (t.penalizada) continue;
      for (let i = 0; i < 5; i++) {
        if (t.palavra[i] === this.palavraAlvo[i]) {
          this.letrasFixas[i] = true;
          this.atual[i] = t.palavra[i];
        }
      }
    }
  }

  navegarCima(minIdx = 0) {
    if (!this.tentativas.length || this.encerrada) return null;
    if (this._navIndex === minIdx) return null;
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
      if (this.letrasFixas[this.indiceFoco]) {
        const prev = this._prevLivre(this.indiceFoco);
        if (prev !== -1) { this.indiceFoco = prev; this.atual[prev] = ''; }
      } else if (this.atual[this.indiceFoco]) {
        this.atual[this.indiceFoco] = '';
      } else {
        const prev = this._prevLivre(this.indiceFoco);
        this.indiceFoco = prev !== -1 ? prev : this.indiceFoco;
        if (!this.letrasFixas[this.indiceFoco]) this.atual[this.indiceFoco] = '';
      }
      return { tipo: 'edicao' };
    }

    if (k === 'ENTER') {
      return this._submeter();
    }

    const letra = normalizar(k)[0];
    if (!letra) return null;
    if (this.letrasFixas[this.indiceFoco]) {
      const prox = this._proxLivre(this.indiceFoco + 1);
      if (prox !== -1) this.indiceFoco = prox;
      return { tipo: 'edicao' };
    }
    const indiceAnterior = this.indiceFoco;
    this.atual[this.indiceFoco] = letra;
    const prox = this.atual.findIndex((v, i) => i > this.indiceFoco && !v && !this.letrasFixas[i]);
    this.indiceFoco = prox !== -1 ? prox : this.indiceFoco;
    return { tipo: 'letra', letra, indice: indiceAnterior };
  }

  _proxLivre(de) {
    for (let i = de; i < 5; i++) if (!this.letrasFixas[i]) return i;
    return -1;
  }

  _prevLivre(de) {
    for (let i = de - 1; i >= 0; i--) if (!this.letrasFixas[i]) return i;
    return -1;
  }

  _submeter() {
    if (!this.atual.every(v => v)) {
      return { tipo: 'erro', motivo: 'incompleta' };
    }
    const palavra = this.atual.join('');
    const modoInvalidas = cfg().palavrasInvalidas;
    const tempoPassado = this.obterTempoPassadoSegundos();

    if (modoInvalidas === 'recusar' && !ehValida(palavra)) {
      // Palavra inválida rejeitada - adiciona penalidade fixa
      const penalidade = calcularPenalidadePalpite(tempoPassado, true, null, false);
      this.historicoJogadas.push({
        palavra,
        tempoSegundos: tempoPassado,
        penalidade,
        ehInvalida: true
      });
      this.pontuacaoAtual = this.calcularPontuacaoAtual();
      
      return { tipo: 'erro', motivo: 'invalida' };
    }

    if (modoInvalidas === 'penalizar' && !ehValida(palavra)) {
      // Palavra inválida penalizada
      const penalidade = calcularPenalidadePalpite(tempoPassado, true, null, false);
      this.historicoJogadas.push({
        palavra,
        tempoSegundos: tempoPassado,
        penalidade,
        ehInvalida: true
      });
      
      const tentativa = { palavra, penalizada: true, ganhou: false, visivel: false };
      this.tentativas.push(tentativa);
      const encerrou = this.tentativas.length >= 6;
      if (encerrou) {
        this.encerrada = true;
        this.pararTimer(); // Para o timer quando o jogo encerra por excesso de tentativas
      }
      else { this.atual = Array(5).fill(''); this.indiceFoco = 0; }
      
      this.pontuacaoAtual = this.calcularPontuacaoAtual();
      return { tipo: encerrou ? 'encerrou' : 'tentativa', tentativa, ganhou: false, encerrou };
    }

    // Calcula valores e delta primeiro
    const valores = valoresPalavra(palavra);
    let delta = valores.reduce((s, v, i) => s + Math.abs(v - this.valoresAlvo[i]), 0);
    const ganhou = normalizar(palavra) === this.palavraAlvo;
    
    // DEBUG: Investigar por que delta não é zero para palavras corretas
    if (ganhou && delta !== 0) {
      console.log('BUG: Palavra correta com delta != 0');
      console.log('Palavra digitada:', palavra, '-> normalizada:', normalizar(palavra));
      console.log('Palavra alvo:', this.palavraAlvo);
      console.log('Valores digitados:', valores);
      console.log('Valores alvo:', this.valoresAlvo);
      console.log('Delta calculado:', delta);
    }
    
    // Calcula penalidade com multiplicador baseado no delta
    const penalidade = calcularPenalidadePalpite(tempoPassado, false, delta, ganhou);
    this.historicoJogadas.push({
      palavra,
      tempoSegundos: tempoPassado,
      penalidade,
      ehInvalida: false,
      delta: delta
    });
    const tentativa = { palavra, valores, delta, ganhou, visivel: true };
    this.tentativas.push(tentativa);

    const encerrou = ganhou || this.tentativas.length >= 6;
    if (encerrou) {
      this.encerrada = true;
      this.pararTimer(); // Para o timer quando o jogo encerra
    }
    else { this.atual = Array(5).fill(''); this.indiceFoco = 0; }

    this.pontuacaoAtual = this.calcularPontuacaoAtual();
    return { tipo: encerrou ? 'encerrou' : 'tentativa', tentativa, ganhou, encerrou };
  }
}
