<script lang="ts">
  import { desenharMini, prepararCanvas } from './desenho';
  import type { Tentativa } from '../nucleo/partida';

  interface Props {
    tentativa: Tentativa;
    /** Onda-alvo de fundo, ou `null` quando a opção está desligada. */
    valoresAlvo: readonly number[] | null;
  }

  const { tentativa, valoresAlvo }: Props = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);
  let largura = $state(0);
  let altura = $state(0);

  $effect(() => {
    if (!canvas || largura <= 0 || altura <= 0) return;
    const ctx = prepararCanvas(canvas, largura, altura);
    if (ctx) desenharMini(ctx, largura, altura, tentativa, valoresAlvo);
  });
</script>

<div class="mini" bind:clientWidth={largura} bind:clientHeight={altura}>
  <canvas bind:this={canvas} aria-hidden="true"></canvas>
</div>

<style>
  .mini {
    flex: 1;
    min-width: 0;
    align-self: stretch;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
