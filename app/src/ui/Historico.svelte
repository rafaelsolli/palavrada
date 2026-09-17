<script lang="ts">
  import MiniOnda from './MiniOnda.svelte';
  import { corDoDelta } from './desenho';
  import type { Tentativa } from '../nucleo/partida';

  interface Props {
    tentativas: readonly Tentativa[];
    valoresAlvo: readonly number[];
    maxPalpites: number;
    mostrarAlvoNasMinis: boolean;
    aoAlternar: (indice: number) => void;
  }

  const props: Props = $props();

  /** Mais recente em cima, limitado ao que a configuração deixa ver. */
  const itens = $derived(
    props.tentativas
      .map((t, i) => ({ t, i }))
      .reverse()
      .slice(0, props.maxPalpites),
  );

  const vazios = $derived(Math.max(0, props.maxPalpites - itens.length));

  let lista = $state<HTMLDivElement | null>(null);
  let rolagem = $state(0);
  let alturaVisivel = $state(0);
  let alturaTotal = $state(0);

  // A setinha some quando não há mais nada abaixo.
  const noFim = $derived(rolagem + alturaVisivel >= alturaTotal - 4);

  function medir() {
    if (!lista) return;
    rolagem = lista.scrollTop;
    alturaVisivel = lista.clientHeight;
    alturaTotal = lista.scrollHeight;
  }

  $effect(() => {
    void itens.length;
    void props.maxPalpites;
    medir();
  });
</script>

<div class="wrap">
  <div class="lista" bind:this={lista} onscroll={medir}>
    {#each itens as { t, i } (i)}
      {#if t.penalizada}
        <div class="item penalizado">
          <div class="esquerda">
            <div class="palavra riscada">{t.palavra}</div>
            <div class="delta apagado">✕ inválida</div>
          </div>
        </div>
      {:else}
        <button
          type="button"
          class="item"
          class:ativo={t.visivel}
          style:--c={corDoDelta(t.delta, t.ganhou)}
          onclick={() => props.aoAlternar(i)}
          aria-pressed={t.visivel}
        >
          <div class="esquerda">
            <div class="palavra" class:ganhou={t.ganhou}>{t.palavra}</div>
            <div class="delta">{t.ganhou ? '✓' : `Δ ${t.delta}`}</div>
          </div>
          <MiniOnda tentativa={t} valoresAlvo={props.mostrarAlvoNasMinis ? props.valoresAlvo : null} />
        </button>
      {/if}
    {/each}

    {#each { length: vazios } as _, k (k)}
      <div class="placeholder"></div>
    {/each}
  </div>
  <div class="fade" style:opacity={noFim ? 0 : 1}>▼</div>
</div>

<style>
  .wrap {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .lista {
    display: flex;
    flex-direction: column;
    gap: 5px;
    height: 100%;
    overflow-y: auto;
    scrollbar-width: none;
    padding-bottom: 2px;
  }
  .lista::-webkit-scrollbar {
    display: none;
  }
  .fade {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 48px;
    background: linear-gradient(transparent, var(--bg));
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 4px;
    color: var(--muted);
    font-size: 0.75rem;
    pointer-events: none;
    transition: opacity 0.2s;
  }
  .placeholder {
    height: 72px;
    flex-shrink: 0;
    border: 1px solid var(--border);
    border-radius: 10px;
    opacity: 0.5;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    text-align: left;
    background: color-mix(in srgb, var(--muted) 4%, var(--surface));
    border: 1px solid color-mix(in srgb, var(--muted) 20%, var(--border));
    border-radius: 10px;
    padding: 5px 10px;
    cursor: pointer;
    transition:
      border-color 0.2s,
      background 0.2s,
      opacity 0.2s;
    animation: fadeSlide 0.22s ease;
    user-select: none;
    height: 72px;
    flex-shrink: 0;
    overflow: hidden;
    opacity: 0.65;
  }
  .item:hover {
    border-color: color-mix(in srgb, var(--muted) 40%, var(--muted));
    opacity: 0.8;
  }
  .item.ativo {
    background: color-mix(in srgb, var(--c) 12%, var(--surface));
    border-color: color-mix(in srgb, var(--c) 35%, var(--border));
    opacity: 1;
  }
  .item.penalizado {
    cursor: default;
  }
  .esquerda {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    flex-shrink: 0;
  }
  .palavra {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.93rem;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--text);
    flex-shrink: 0;
  }
  .palavra.ganhou {
    color: #10b981;
  }
  .palavra.riscada {
    text-decoration: line-through;
    color: var(--muted);
  }
  .delta {
    font-size: 0.75rem;
    color: var(--c);
    font-variant-numeric: tabular-nums;
    opacity: 0.8;
    margin-top: 1px;
  }
  .delta.apagado {
    color: var(--muted);
    opacity: 0.6;
  }

  @keyframes fadeSlide {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
</style>
