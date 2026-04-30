import { corDelta } from './ajudantes.js';

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

function desenharCurva(ctx, pontos, cor, espessura, alpha, alphaFundo = 0) {
  if (pontos.length < 2) return;
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.lineWidth = espessura;
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  function caminho() {
    ctx.beginPath();
    ctx.moveTo(pontos[0].x, pontos[0].y);
    for (let i = 0; i < pontos.length - 1; i++) {
      const mx = (pontos[i].x + pontos[i + 1].x) / 2;
      ctx.bezierCurveTo(mx, pontos[i].y, mx, pontos[i + 1].y, pontos[i + 1].x, pontos[i + 1].y);
    }
  }

  if (alphaFundo > 0) {
    caminho();
    ctx.lineTo(pontos[pontos.length - 1].x, ALTURA);
    ctx.lineTo(pontos[0].x, ALTURA);
    ctx.closePath();
    ctx.fillStyle = cor;
    ctx.globalAlpha = alphaFundo;
    ctx.fill();
  }
  caminho();
  ctx.globalAlpha = alpha;
  ctx.stroke();
  ctx.restore();
}

function desenharGuias(ctx, largura, altura) {
  ctx.save();
  [0, 8, 16, 25].forEach(v => {
    const y = MARGEM + (1 - v / 25) * (altura - MARGEM * 2);
    ctx.strokeStyle = 'rgba(59,130,246,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    ctx.moveTo(MARGEM, y);
    ctx.lineTo(largura - MARGEM, y);
    ctx.stroke();
  });
  ctx.restore();
}

export function redesenharPrincipal(partida) {
  const el = document.getElementById('canvasPrincipal');
  const { ctx, largura, altura } = configurarCanvas(el);
  ctx.clearRect(0, 0, largura, altura);
  desenharGuias(ctx, largura, altura);

  const ultimo = partida.tentativas.length - 1;
  const ganhou = ultimo >= 0 && partida.tentativas[ultimo].ganhou;

  partida.tentativas.forEach((t, i) => {
    if (i === ultimo || !t.visivel) return;
    desenharCurva(ctx, parapontos(t.valores, largura, altura), '#2a3a50', 1.5, 0.7);
  });

  if (ultimo >= 0) {
    const t = partida.tentativas[ultimo];
    if (t.visivel) desenharCurva(ctx, parapontos(t.valores, largura, altura), '#f472b6', 2.2, 0.95);
  }

  const corAlvo = ganhou ? '#10b981' : '#3b82f6';
  desenharCurva(ctx, parapontos(partida.valoresAlvo, largura, altura), corAlvo, 2.5, 0.9);
}

export function redesenharMini(canvasMini, tentativa) {
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

  const cor = corDelta(tentativa.delta, tentativa.ganhou);
  if (pontos.length < 2) return;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = cor;
  ctx.lineWidth = 2.5;
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
