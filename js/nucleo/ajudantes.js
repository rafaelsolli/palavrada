export function normalizar(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
}

export function valorLetra(ch) {
  return normalizar(ch).charCodeAt(0) - 65;
}

export function valoresPalavra(palavra) {
  return normalizar(palavra).split('').map(valorLetra);
}

export function numeroDoDia() {
  const origem = new Date(2024, 0, 1);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.floor((hoje - origem) / 86400000);
}

export function contagemRegressiva() {
  const agora = new Date();
  const meia = new Date(agora);
  meia.setHours(24, 0, 0, 0);
  let d = Math.floor((meia - agora) / 1000);
  const h = String(Math.floor(d / 3600)).padStart(2, '0');
  d %= 3600;
  return `${h}:${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`;
}

export function corDelta(delta, ganhou) {
  if (ganhou || delta < 10) return 'rgba(16, 185, 129, 0.7)';
  if (delta < 20)           return 'rgba(250, 204, 21, 0.7)';
  if (delta < 40)           return 'rgba(249, 115, 22, 0.7)';
  return                           'rgba(239, 68, 68, 0.7)';
}

export function idxUrlPalavra(totalPalavras) {
  const p = new URLSearchParams(window.location.search).get('w');
  const n = parseInt(p, 10);
  return (!isNaN(n) && n >= 1 && n <= totalPalavras) ? n - 1 : null;
}
