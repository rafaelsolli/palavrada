let temporizador;

export function toast(mensagem) {
  const el = document.getElementById('toast');
  el.textContent = mensagem;
  el.classList.add('show');
  clearTimeout(temporizador);
  temporizador = setTimeout(() => el.classList.remove('show'), 2300);
}
