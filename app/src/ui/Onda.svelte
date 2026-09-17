<script lang="ts">
  import { ALTURA_PRINCIPAL, desenharPrincipal, prepararCanvas, COR } from './desenho';
  import type { Config } from '../config/definicoes';
  import type { Tentativa } from '../nucleo/partida';

  interface Props {
    tentativas: readonly Tentativa[];
    valoresAlvo: readonly number[];
    config: Config;
  }

  const { tentativas, valoresAlvo, config }: Props = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);
  let largura = $state(0);

  // Redesenha sozinho quando o palpite, a largura ou qualquer opção do gráfico
  // muda. No site atual isto era disparado à mão de sete lugares diferentes, e a
  // lista de opções que exigiam redesenho vivia num array em main.js.
  $effect(() => {
    if (!canvas || largura <= 0) return;
    const ctx = prepararCanvas(canvas, largura, ALTURA_PRINCIPAL);
    if (ctx) desenharPrincipal(ctx, largura, ALTURA_PRINCIPAL, { tentativas, valoresAlvo, config });
  });
</script>

<div class="wave-card">
  <div class="wave-legend">
    <span><div class="ldot" style:background={COR.alvo}></div>Alvo</span>
    <span><div class="ldot" style:background={COR.ultimo}></div>Último</span>
    <span><div class="ldot" style:background={COR.anterior}></div>Anteriores</span>
  </div>
  <div class="moldura" bind:clientWidth={largura}>
    <canvas bind:this={canvas} aria-label="Gráfico das ondas"></canvas>
  </div>
</div>

<style>
  .wave-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 10px 14px 8px;
    flex-shrink: 0;
  }
  .wave-legend {
    display: flex;
    gap: 14px;
    margin-bottom: 6px;
    font-size: 0.66rem;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .wave-legend span {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .ldot {
    width: 18px;
    height: 3px;
    border-radius: 2px;
  }
  .moldura {
    width: 100%;
  }
  canvas {
    display: block;
    width: 100%;
    border-radius: 6px;
  }
</style>
