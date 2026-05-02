import { cfg } from '../configuracoes.js';

/**
 * Sistema de Pontuação do PalavRada
 * 
 * Fórmula: 1000 pontos base - somatório das penalidades por palpite
 * Cada palpite gera penalidade = (100 × agravantes) + penalidade por tempo
 * Pontuação mínima: 0 (nunca negativa)
 */

const PONTOS_BASE = 1000;
const PENALIDADE_BASE_PALPITE = 100;
const PENALIDADE_PALAVRA_INVALIDA = 100;

/**
 * Calcula o multiplicador de agravantes baseado nas configurações atuais
 */
export function calcularAgravantes() {
  const config = cfg();
  let agravantes = 1.0;
  
  // Réguas horizontais: x(1 + réguas/50)
  agravantes *= (1 + config.regraHorizontal / 50);
  
  // Letras no eixo Y: x(1 + eixoY/50)  
  agravantes *= (1 + config.eixoY / 50);
  
  // Bolinhas nas curvas: +5% se ativado
  if (config.bolinhas) {
    agravantes *= 1.05;
  }
  
  // Letras no último palpite: +5% se ativado  
  if (config.letrasNoGrafico) {
    agravantes *= 1.05;
  }
  
  // Mostrar onda-alvo: +5% se ativado
  if (config.alvoNosPalpites) {
    agravantes *= 1.05;
  }
  
  // Palpites visíveis: x(0.82 + 0.03 × palpites)
  agravantes *= (0.82 + 0.03 * config.maxPalpites);
  
  // Fixar letras certas (lógica complexa)
  if (!config.fixarLetrasAcertadas) {
    // Desativado
    if (config.maxPalpites <= 3) {
      agravantes *= 0.9; // Mais difícil com poucos palpites
    } else {
      agravantes *= 1.1; // Mais fácil com muitos palpites
    }
  } else {
    // Ativado
    if (config.maxPalpites <= 3) {
      agravantes *= 1.1; // Pode ser mais fácil com poucos palpites
    } else {
      agravantes *= 0.9; // Pode ser mais difícil com muitos palpites  
    }
  }
  
  // Autocomplete: x2 se ativado (grande facilitador)
  if (config.autocomplete) {
    agravantes *= 2.0;
  }
  
  // Palavras inválidas
  if (config.palavrasInvalidas === 'penalizar') {
    agravantes *= 0.8; // Reduz penalidade
  } else if (config.palavrasInvalidas === 'aceitar') {
    agravantes *= 1.2; // Aumenta penalidade
  }
  // 'recusar' mantém x1.0
  
  return agravantes;
}

/**
 * Gera o breakdown detalhado dos agravantes
 */
export function calcularBreakdownAgravantes() {
  const config = cfg();
  const fatores = [];
  let valorAtual = 1.0;
  
  // Réguas horizontais
  if (config.regraHorizontal > 0) {
    const fator = 1 + config.regraHorizontal / 50;
    const porc = Math.round(fator * 100);
    if (porc !== 100) {
      valorAtual *= fator;
      fatores.push(`${porc}% (réguas)`);
    }
  }
  
  // Eixo Y  
  if (config.eixoY > 0) {
    const fator = 1 + config.eixoY / 50;
    const porc = Math.round(fator * 100);
    if (porc !== 100) {
      valorAtual *= fator;
      fatores.push(`${porc}% (eixo)`);
    }
  }
  
  // Bolinhas
  if (config.bolinhas) {
    valorAtual *= 1.05;
    fatores.push('105% (bolinhas)');
  }
  
  // Letras no gráfico
  if (config.letrasNoGrafico) {
    valorAtual *= 1.05;
    fatores.push('105% (letras)');
  }
  
  // Alvo nos palpites  
  if (config.alvoNosPalpites) {
    valorAtual *= 1.05;
    fatores.push('105% (alvo)');
  }
  
  // Max palpites
  const fatorPalpites = 0.82 + 0.03 * config.maxPalpites;
  const porcPalpites = Math.round(fatorPalpites * 100);
  if (porcPalpites !== 100) {
    valorAtual *= fatorPalpites;
    fatores.push(`${porcPalpites}% (palpites)`);
  }
  
  // Fixar letras acertadas
  const fatorFixar = !config.fixarLetrasAcertadas 
    ? (config.maxPalpites <= 3 ? 0.9 : 1.1)
    : (config.maxPalpites <= 3 ? 1.1 : 0.9);
  const porcFixar = Math.round(fatorFixar * 100);
  if (porcFixar !== 100) {
    valorAtual *= fatorFixar;
    fatores.push(`${porcFixar}% (fixar)`);
  }
  
  // Autocomplete
  if (config.autocomplete) {
    valorAtual *= 2.0;
    fatores.push('200% (auto)');
  }
  
  // Palavras inválidas
  if (config.palavrasInvalidas === 'penalizar') {
    valorAtual *= 0.8;
    fatores.push('80% (inválidas)');
  } else if (config.palavrasInvalidas === 'aceitar') {
    valorAtual *= 1.2;
    fatores.push('120% (inválidas)');
  }
  
  // Retornar no formato solicitado
  if (fatores.length === 0) {
    return ['100% (configuração padrão)'];
  }
  
  const formula = fatores.join(' × ');
  const resultado = Math.round(valorAtual * 100);
  
  return [`${formula} = ${resultado}%`];
}

/**
 * Calcula a penalidade por tempo no momento do palpite
 */
export function calcularPenalidadeTempo(tempoPassadoSegundos) {
  if (tempoPassadoSegundos < 20) {
    return tempoPassadoSegundos * 0.5;
  } else if (tempoPassadoSegundos < 60) {
    return tempoPassadoSegundos * 1.0;
  } else if (tempoPassadoSegundos < 180) {
    return tempoPassadoSegundos * 1.5;
  } else {
    return tempoPassadoSegundos * 2.0;
  }
}

/**
 * Calcula a penalidade de um palpite específico
 */
export function calcularPenalidadePalpite(tempoPassadoSegundos, ehPalavraInvalida = false, delta = null, ganhou = false) {
  // Se é palavra inválida, penalidade fixa de 100 pontos (sem tempo nem agravantes)
  if (ehPalavraInvalida) {
    return PENALIDADE_PALAVRA_INVALIDA;
  }
  
  const agravantes = calcularAgravantes();
  
  // Delta como penalidade adicional (0 a 100 pontos baseado na distância)
  let penalidade_delta = 0;
  if (delta !== null) {
    penalidade_delta = delta; // Usar valor cru do delta (0-100)
  }
  
  // Fórmula: (base + tempo + delta) × agrav
  const penTempo = calcularPenalidadeTempo(tempoPassadoSegundos);
  let penalidade = (PENALIDADE_BASE_PALPITE + penTempo + penalidade_delta) * agravantes;
  
  return Math.round(penalidade);
}

/**
 * Calcula a pontuação final da partida
 */
export function calcularPontuacaoFinal(historicoJogadas, ganhou = true) {
  // Se perdeu, pontuação é zero
  if (!ganhou) {
    return 0;
  }
  
  const totalPenalidades = historicoJogadas.reduce((total, jogada) => {
    return total + jogada.penalidade;
  }, 0);
  
  const pontuacao = PONTOS_BASE - totalPenalidades;
  return Math.max(0, pontuacao); // Nunca negativo
}

/**
 * Gera o extrato detalhado da pontuação
 */
export function gerarExtratoPontuacao(historicoJogadas, pontuacaoFinal, ganhou = true, tentativasVisiveis = []) {
  const config = cfg();
  const agravantes = calcularAgravantes();
  
  const extrato = {
    pontoBase: PONTOS_BASE,
    agravantes: Math.round(agravantes * 100) / 100,
    configuracoes: {
      regraHorizontal: config.regraHorizontal,
      eixoY: config.eixoY,
      bolinhas: config.bolinhas,
      letrasNoGrafico: config.letrasNoGrafico,
      alvoNosPalpites: config.alvoNosPalpites,
      maxPalpites: config.maxPalpites,
      fixarLetrasAcertadas: config.fixarLetrasAcertadas,
      autocomplete: config.autocomplete,
      palavrasInvalidas: config.palavrasInvalidas,
      tempoLimite: config.tempoLimite
    },
    jogadas: historicoJogadas.map((jogada, index) => ({
      numero: index + 1,
      palavra: jogada.palavra,
      tempoSegundos: jogada.tempoSegundos,
      penalidade: jogada.penalidade,
      ehInvalida: jogada.ehInvalida || false,
      // Usar delta do histórico ou buscar nas tentativas visíveis
      delta: jogada.delta !== undefined ? jogada.delta : 
             (tentativasVisiveis[index] && !jogada.ehInvalida ? tentativasVisiveis[index].delta : null)
    })),
    // Adicionar item de derrota se não ganhou
    derrota: !ganhou ? {
      penalidade: 1000,
      descricao: 'Derrota'
    } : null,
    totalPenalidades: historicoJogadas.reduce((total, j) => total + j.penalidade, 0) + (!ganhou ? 1000 : 0),
    pontuacaoFinal
  };
  
  return extrato;
}

/**
 * Formata o extrato para exibição no modal
 */
export function formatarExtratoHTML(extrato) {
  // Separar jogadas válidas e inválidas
  const jogadasValidas = extrato.jogadas.filter(j => !j.ehInvalida);
  const jogadasInvalidas = extrato.jogadas.filter(j => j.ehInvalida);
  
  const jogadasValidasHTML = jogadasValidas.map((jogada, index) => {
    let memoriaCalculo = '';
    if (!jogada.ehInvalida) {
      const agravantes = calcularAgravantes();
      const penTempo = calcularPenalidadeTempo(jogada.tempoSegundos);
      
      // Usar delta salvo ou fallback para delta não encontrado
      const delta = jogada.delta !== null && jogada.delta !== undefined ? jogada.delta : 100;
      
      const agravantesPorc = Math.round(agravantes * 100);
      
      memoriaCalculo = `<br><small class="memoria-calculo">[${PENALIDADE_BASE_PALPITE} (base) + ${Math.round(delta)} (delta) + ${Math.round(penTempo)} (tempo)] × ${agravantesPorc}% (agrav.)</small>`;
    }
    
    return `
      <div class="extrato-linha">
        <span class="extrato-descricao">${index + 1}º palpite <span class="extrato-palavra">${jogada.palavra}</span>${memoriaCalculo}</span>
        <span class="extrato-valor negativo">-${jogada.penalidade}</span>
      </div>
    `;
  }).join('');
  
  const totalInvalidas = jogadasInvalidas.reduce((total, j) => total + j.penalidade, 0);
  const palavrasInvalidasHTML = totalInvalidas > 0 ? `
    <div class="extrato-linha">
      <span class="extrato-descricao">Palavras inválidas</span>
      <span class="extrato-valor negativo">-${totalInvalidas}</span>
    </div>
  ` : '';
  
  const derrotaHTML = extrato.derrota ? `
    <div class="extrato-linha">
      <span class="extrato-descricao">${extrato.derrota.descricao}</span>
      <span class="extrato-valor negativo">-${extrato.derrota.penalidade}</span>
    </div>
  ` : '';
  
  // Linha de memória de cálculo do agravante
  const breakdownAgravantes = calcularBreakdownAgravantes();
  const agravantesDetalhes = breakdownAgravantes.join('<br>');
  
  const agravantesHTML = `
    <div class="extrato-linha agravantes">
      <span class="extrato-descricao">Agrav. = <small class="memoria-calculo">${agravantesDetalhes}</small></span>
      <span class="extrato-valor neutro"></span>
    </div>
  `;
  
  return `
    <div class="extrato-pontuacao-simples">
      <div class="extrato-linha base">
        <span class="extrato-descricao">Pontuação base</span>
        <span class="extrato-valor positivo">+${extrato.pontoBase}</span>
      </div>
      
      ${jogadasValidasHTML}
      ${palavrasInvalidasHTML}
      ${derrotaHTML}
      ${agravantesHTML}
      
      <div class="extrato-linha final">
        <span class="extrato-final-label">Pontuação final (em teste)</span>
        <span class="extrato-final-valor">${extrato.pontuacaoFinal}</span>
      </div>
    </div>
  `;
}