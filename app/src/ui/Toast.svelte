<script lang="ts">
  /**
   * Aviso passageiro no topo. Um de cada vez: uma mensagem nova substitui a
   * anterior e reinicia a contagem.
   */
  let mensagem = $state('');
  let visivel = $state(false);
  let temporizador: ReturnType<typeof setTimeout> | undefined;

  export function mostrar(texto: string, duracaoMs = 2300) {
    mensagem = texto;
    visivel = true;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => (visivel = false), duracaoMs);
  }
</script>

<div class="toast" class:visivel role="status" aria-live="polite">{mensagem}</div>

<style>
  .toast {
    position: fixed;
    top: 68px;
    left: 50%;
    transform: translateX(-50%) translateY(-10px);
    background: var(--text);
    color: var(--bg);
    padding: 8px 20px;
    border-radius: 30px;
    font-weight: 700;
    font-size: 0.82rem;
    opacity: 0;
    transition: all 0.25s;
    z-index: 999;
    pointer-events: none;
    white-space: nowrap;
  }
  .toast.visivel {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
</style>
