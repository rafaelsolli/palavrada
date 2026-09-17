<script lang="ts">
  import type { Config } from '../config/definicoes';

  const LAYOUTS = {
    qwerty: [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
    ],
    alfabetico: [
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S'],
      ['ENTER', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '⌫'],
    ],
  } as const satisfies Record<Config['teclado'], readonly (readonly string[])[]>;

  /** Teclas físicas que o jogo entende, além das letras. */
  const FISICAS: Record<string, string> = {
    ENTER: 'ENTER',
    BACKSPACE: '⌫',
    ARROWLEFT: '←',
    ARROWRIGHT: '→',
    ARROWUP: '↑',
    ARROWDOWN: '↓',
  };

  const LETRA = /^[A-ZÁÉÍÓÚÃÕÂÊÔÇÜ]$/;

  interface Props {
    layout: Config['teclado'];
    /** Verdadeiro quando há um modal aberto: o teclado físico é ignorado. */
    bloqueado: boolean;
    aoTecla: (k: string) => void;
  }

  const { layout, bloqueado, aoTecla }: Props = $props();

  function teclaFisica(evento: KeyboardEvent) {
    if (bloqueado || evento.metaKey || evento.ctrlKey || evento.altKey) return;

    const k = evento.key.toUpperCase();
    const mapeada = FISICAS[k];
    if (mapeada) {
      evento.preventDefault();
      aoTecla(mapeada);
      return;
    }
    if (LETRA.test(k)) aoTecla(k);
  }
</script>

<svelte:window onkeydown={teclaFisica} />

<div class="teclado">
  {#each LAYOUTS[layout] as linha, i (i)}
    <div class="linha">
      {#each linha as k (k)}
        <button type="button" class="tecla" class:larga={k.length > 1} onclick={() => aoTecla(k)}>
          {k}
        </button>
      {/each}
    </div>
  {/each}
</div>

<style>
  .teclado {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .linha {
    display: flex;
    justify-content: center;
    gap: 3px;
  }
  .tecla {
    height: 46px;
    flex: 1;
    max-width: 38px;
    background: var(--key-bg);
    border: 1px solid var(--border);
    border-radius: 7px;
    color: var(--text);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.84rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    text-transform: uppercase;
    transition:
      background 0.15s,
      transform 0.1s;
  }
  .tecla.larga {
    max-width: 56px;
    font-size: 0.67rem;
  }
  .tecla:active {
    transform: scale(0.91);
  }
</style>
