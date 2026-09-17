<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Área com rolagem e a setinha que some ao chegar no fim.
   *
   * O site atual repetia este par (listener de scroll + cálculo do fade) em
   * quatro lugares, com a mesma conta escrita quatro vezes.
   */
  interface Props {
    /** Cor de fundo sobre a qual o esmaecimento é desenhado. */
    fundo?: string;
    alturaMaxima?: string;
    /** Muda quando o conteúdo muda, para remedir sem depender de rolagem. */
    revisao?: unknown;
    children: Snippet;
  }

  const props: Props = $props();

  let area = $state<HTMLDivElement | null>(null);
  let noFim = $state(true);

  export function medir() {
    if (!area) return;
    noFim = area.scrollTop + area.clientHeight >= area.scrollHeight - 4;
  }

  export function aoTopo() {
    if (area) area.scrollTop = 0;
    medir();
  }

  $effect(() => {
    void props.revisao;
    // Depois que o navegador aplicar o layout do conteúdo novo.
    const id = requestAnimationFrame(medir);
    return () => cancelAnimationFrame(id);
  });
</script>

<div class="wrap">
  <div
    class="area"
    bind:this={area}
    onscroll={medir}
    style:max-height={props.alturaMaxima ?? 'none'}
  >
    {@render props.children()}
  </div>
  <div
    class="fade"
    style:opacity={noFim ? 0 : 1}
    style:--fundo={props.fundo ?? 'var(--surface)'}
  >
    ▼
  </div>
</div>

<style>
  .wrap {
    position: relative;
    overflow: hidden;
    margin: 0 -2px;
  }
  .area {
    overflow-y: auto;
    scrollbar-width: none;
    padding: 0 2px 24px;
  }
  .area::-webkit-scrollbar {
    display: none;
  }
  .fade {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 48px;
    background: linear-gradient(transparent, var(--fundo));
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 4px;
    color: var(--muted);
    font-size: 0.75rem;
    pointer-events: none;
    transition: opacity 0.2s;
  }
</style>
