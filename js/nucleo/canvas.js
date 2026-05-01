import { corDelta } from './ajudantes.js';
import { cfg } from '../configuracoes.js';

const MARGEM = 16;
const ALTURA = 150;

function configurarCanvas(el) {
  const dpr = window.devicePixelRatio || 1;
  const largura = el.parentElement.clientWidth - 28;
  el.style.width = largura + 'px';
  el.style.height = ALTURA + 'px';
  el.width = largura * dpr;
  el.height = ALTURA * dpr;
  const ctx = el.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, largura, altura: ALTURA };
}

function parapontos(valores, largura, altura) {
  const passoX = (largura - MARGEM * 2) / (valores.length - 1);
  return valores.map((v, i) => ({
    x: MARGEM + i * passoX,
    y: MARGEM + (1 - v / 25) * (altura - MARGEM * 2),
  }));
}

function desenharCurva(ctx, pontos, cor, espessura, alpha) {
  if (pontos.length < 2) return;
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.lineWidth = espessura;
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pontos[0].x, pontos[0].y);
  for (let i = 0; i < pontos.length - 1; i++) {
    const mx = (pontos[i].x + pontos[i + 1].x) / 2;
    ctx.bezierCurveTo(mx, pontos[i].y, mx, pontos[i + 1].y, pontos[i + 1].x, pontos[i + 1].y);
  }
  ctx.stroke();
  ctx.restore();
}

function desenharGuias(ctx, largura, altura, count) {
  if (count === 0) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(59,130,246,0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 7]);
  for (let i = 0; i < count; i++) {
    const v = count === 1 ? 12.5 : (i / (count - 1)) * 25;
    const y = MARGEM + (1 - v / 25) * (altura - MARGEM * 2);
    ctx.beginPath();
    ctx.moveTo(MARGEM, y);
    ctx.lineTo(largura - MARGEM, y);
    ctx.stroke();
  }
  ctx.restore();
}

function desenharEixoY(ctx, largura, altura, count) {
  if (count === 0) return;
  ctx.save();
  ctx.font = '9px Space Grotesk, sans-serif';
  ctx.fillStyle = 'rgba(59,130,246,0.45)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < count; i++) {
    const v = count === 1 ? 0 : Math.round((i / (count - 1)) * 25);
    const y = MARGEM + (1 - v / 25) * (altura - MARGEM * 2);
    ctx.fillText(String.fromCharCode(65 + v), MARGEM - 3, y);
  }
  ctx.restore();
}

function desenharBolinhas(ctx, pontos, cor) {
  ctx.save();
  ctx.fillStyle = cor;
  ctx.globalAlpha = 0.9;
  pontos.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function desenharLetrasNaCurva(ctx, pontos, palavra, cor) {
  ctx.save();
  ctx.font = 'bold 10px Space Grotesk, sans-serif';
  ctx.fillStyle = cor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.globalAlpha = 0.9;
  [...palavra].forEach((l, i) => {
    if (pontos[i]) ctx.fillText(l, pontos[i].x, pontos[i].y - 4);
  });
  ctx.restore();
}

export function redesenharPrincipal(partida) {
  const c = cfg();
  const el = document.getElementById('canvasPrincipal');
  const { ctx, largura, altura } = configurarCanvas(el);
  ctx.clearRect(0, 0, largura, altura);

  desenharGuias(ctx, largura, altura, c.regraHorizontal);
  desenharEixoY(ctx, largura, altura, c.eixoY);

  const total = partida.tentativas.length;
  const ultimoIdx = total - 1;
  const ganhou = total > 0 && partida.tentativas[ultimoIdx].ganhou;

  const visiveis = c.maxPalpites === 0 ? [] : partida.tentativas.slice(-c.maxPalpites);
  const offsetIdx = total - visiveis.length;

  visiveis.forEach((t, i) => {
    const globalIdx = offsetIdx + i;
    if (!t.visivel || globalIdx === ultimoIdx) return;
    desenharCurva(ctx, parapontos(t.valores, largura, altura), '#2a3a50', 1.5, 0.7);
  });

  if (total > 0 && visiveis.includes(partida.tentativas[ultimoIdx])) {
    const t = partida.tentativas[ultimoIdx];
    if (t.visivel) {
      const corUltimo = ganhou ? '#10b981' : '#f472b6';
      const pontos = parapontos(t.valores, largura, altura);
      desenharCurva(ctx, pontos, corUltimo, 2.2, 0.95);
      if (c.bolinhas) desenharBolinhas(ctx, pontos, corUltimo);
      if (c.letrasNoGrafico) desenharLetrasNaCurva(ctx, pontos, t.palavra, corUltimo);
    }
  }

  const corAlvo = ganhou ? '#10b981' : '#3b82f6';
  const pontosAlvo = parapontos(partida.valoresAlvo, largura, altura);
  desenharCurva(ctx, pontosAlvo, corAlvo, 2.5, 0.9);
  if (c.bolinhas) desenharBolinhas(ctx, pontosAlvo, corAlvo);
}

export function redesenharMini(canvasMini, tentativa, valoresAlvo = null) {
  const dpr = window.devicePixelRatio || 1;
  const larg = canvasMini.clientWidth || 200;
  const alt = canvasMini.clientHeight || 52;
  canvasMini.width = larg * dpr;
  canvasMini.height = alt * dpr;
  const ctx = canvasMini.getContext('2d');
  ctx.scale(dpr, dpr);

  const margem = 6;
  const passoX = (larg - margem * 2) / (tentativa.valores.length - 1);
  const pontos = tentativa.valores.map((v, i) => ({
    x: margem + i * passoX,
    y: margem + (1 - v / 25) * (alt - margem * 2),
  }));

  if (valoresAlvo && cfg().alvoNosPalpites) {
    const pontosAlvo = valoresAlvo.map((v, i) => ({
      x: margem + i * passoX,
      y: margem + (1 - v / 25) * (alt - margem * 2),
    }));
    desenharCurva(ctx, pontosAlvo, '#3b82f6', 1.2, 0.45);
  }

  const cor = corDelta(tentativa.delta, tentativa.ganhou);
  desenharCurva(ctx, pontos, cor, 2.5, 1);
}
