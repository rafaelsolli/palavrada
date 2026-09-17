<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    aberto: boolean;
    aoFechar: () => void;
    titulo?: string;
    /** Classe extra para modais com layout próprio. */
    classe?: string;
    children: Snippet;
    rodape?: Snippet;
  }

  const props: Props = $props();

  function aoTeclar(evento: KeyboardEvent) {
    if (props.aberto && evento.key === 'Escape') props.aoFechar();
  }
</script>

<svelte:window onkeydown={aoTeclar} />

<!-- Fechado, o modal continua no DOM para a transição de opacidade, mas sai da
     árvore de acessibilidade e do alcance do teclado: sem isto, leitores de tela
     e a navegação por Tab alcançam os botões de modais invisíveis. -->
<div
  class="overlay"
  class:aberto={props.aberto}
  inert={!props.aberto}
  aria-hidden={!props.aberto}
  onclick={(e) => e.target === e.currentTarget && props.aoFechar()}
  role="presentation"
>
  <div class="modal {props.classe ?? ''}" role="dialog" aria-modal="true" aria-label={props.titulo}>
    <!-- O conteúdo só existe enquanto o modal está aberto. Além de aliviar o
         DOM, evita que texto de modal invisível apareça em busca na página,
         em leitores de tela e na navegação por Tab. -->
    {#if props.aberto}
      <button class="fechar" title="Fechar" aria-label="Fechar" onclick={props.aoFechar}>×</button>
      {#if props.titulo}<h2>{props.titulo}</h2>{/if}
      {@render props.children()}
      {#if props.rodape}
        <div class="rodape">{@render props.rodape()}</div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.82);
    backdrop-filter: blur(8px);
    z-index: 300;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
  }
  .overlay.aberto {
    opacity: 1;
    pointer-events: all;
  }
  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 26px 22px;
    max-width: 440px;
    width: 96%;
    transform: translateY(14px);
    transition: transform 0.3s;
    position: relative;
  }
  .overlay.aberto .modal {
    transform: none;
  }
  .modal :global(h2) {
    font-family: 'DM Sans', sans-serif;
    font-size: 1.15rem;
    font-weight: 800;
    margin-bottom: 12px;
    background: linear-gradient(90deg, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .fechar {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    color: var(--muted);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    transition:
      color 0.2s,
      background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
  }
  .fechar:hover {
    color: var(--text);
    background: var(--surface2);
  }
  .rodape {
    display: flex;
    flex-direction: column;
  }
</style>
