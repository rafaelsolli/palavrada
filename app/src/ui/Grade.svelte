<script lang="ts">
  import { TAMANHO_PALAVRA } from '../nucleo/ondas';

  interface Props {
    atual: readonly string[];
    indiceFoco: number;
    letrasFixas: readonly boolean[];
    revelado: 'ganhou' | 'perdeu' | null;
    encerrada: boolean;
    /** Sugestão do autocomplete, exibida em cinza nas posições vazias. */
    sugestao: string | null;
    /** Palavra-alvo espiada, só com ?debug=1. */
    espiar: string | null;
    aoClicar: (indice: number) => void;
    /** Incrementa a cada letra digitada, para disparar a animação. */
    pulso: { indice: number; n: number } | null;
    /** Incrementa a cada palpite recusado, para sacudir a grade. */
    tremor: number;
  }

  const props: Props = $props();
  const posicoes = Array.from({ length: TAMANHO_PALAVRA }, (_, i) => i);

  function textoDe(i: number): string {
    const letra = props.atual[i];
    if (letra) return letra;
    if (props.revelado) return '';
    return props.sugestao?.[i] ?? props.espiar?.[i] ?? '';
  }

  const ehDica = (i: number) => !props.atual[i] && !props.revelado && textoDe(i) !== '';
</script>

<div class="grade" class:tremendo={props.tremor > 0} style:--tremor={props.tremor}>
  {#each posicoes as i (i)}
    <button
      type="button"
      class="letra"
      class:focada={!props.encerrada && !props.revelado && i === props.indiceFoco}
      class:preenchida={!!props.atual[i]}
      class:fixada={props.letrasFixas[i] || props.revelado === 'ganhou'}
      class:revelada-erro={props.revelado === 'perdeu'}
      class:hint={ehDica(i)}
      class:pop={props.pulso?.indice === i}
      onclick={() => props.aoClicar(i)}
      aria-label={`Letra ${i + 1}`}
    >
      {textoDe(i)}
    </button>
  {/each}
</div>

<style>
  .grade {
    display: flex;
    gap: 5px;
    justify-content: center;
    margin-bottom: 10px;
  }
  .grade.tremendo {
    animation: shk 0.38s ease;
  }
  .letra {
    width: 48px;
    height: 50px;
    background: var(--bg);
    border: 2px solid var(--border);
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Sans', sans-serif;
    font-size: 1.35rem;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--text);
    cursor: pointer;
    position: relative;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }
  .letra.preenchida {
    border-color: #253345;
  }
  .letra.focada {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
  .letra.focada::after {
    content: '';
    display: block;
    width: 2px;
    height: 55%;
    background: var(--accent);
    position: absolute;
    animation: blink 1s step-end infinite;
  }
  .letra.preenchida.focada::after {
    display: none;
  }
  .letra.hint {
    color: rgba(255, 255, 255, 0.18);
  }
  .letra.fixada {
    border-color: rgba(16, 185, 129, 0.55);
    color: #10b981;
  }
  .letra.revelada-erro {
    border-color: rgba(239, 68, 68, 0.5);
    color: #f87171;
  }
  .letra.pop {
    animation: pop 0.12s ease;
  }

  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
  @keyframes pop {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
    }
  }
  @keyframes shk {
    0%,
    100% {
      transform: translateX(0);
    }
    20% {
      transform: translateX(-7px);
    }
    40% {
      transform: translateX(7px);
    }
    60% {
      transform: translateX(-5px);
    }
    80% {
      transform: translateX(5px);
    }
  }
</style>
