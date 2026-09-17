<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Badge à esquerda dos botões: sequência ou progresso, conforme o modo. */
    selo: Snippet | null;
    aoAlternarModo: () => void;
    rotuloAlternar: string;
    iconeAlternar: string;
    aoAbrirAjuda: () => void;
    aoAbrirConfig: () => void;
  }

  const props: Props = $props();
</script>

<header>
  <div class="logo">
    <span class="nome">PalavRada</span>
    <small class="tagline">🌊 jogo de ondas</small>
    <span class="compacto">🌊</span>
  </div>
  <div class="botoes">
    {#if props.selo}{@render props.selo()}{/if}
    <button
      class="hbtn"
      title={props.rotuloAlternar}
      aria-label={props.rotuloAlternar}
      onclick={props.aoAlternarModo}
    >
      {props.iconeAlternar}
    </button>
    <button class="hbtn" title="Como jogar" aria-label="Como jogar" onclick={props.aoAbrirAjuda}>
      ❓
    </button>
    <button
      class="hbtn"
      title="Configurações"
      aria-label="Configurações"
      onclick={props.aoAbrirConfig}
    >
      ⚙️
    </button>
  </div>
</header>

<style>
  header {
    width: 100%;
    max-width: 560px;
    padding: 14px 20px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .logo {
    font-family: 'DM Sans', sans-serif;
    font-size: 1.3rem;
    font-weight: 800;
    background: linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .tagline {
    display: block;
    font-size: 0.6rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    -webkit-text-fill-color: var(--muted);
    margin-top: -2px;
  }
  .compacto {
    display: none;
    font-size: 1.4rem;
    line-height: 1;
    -webkit-text-fill-color: initial;
  }
  @media (max-width: 400px) {
    .nome,
    .tagline {
      display: none;
    }
    .compacto {
      display: inline;
    }
  }
  .botoes {
    display: flex;
    gap: 8px;
  }
  .hbtn {
    background: var(--key-bg);
    border: 1px solid var(--border);
    color: var(--muted);
    width: 34px;
    height: 34px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    display: grid;
    place-items: center;
    transition:
      color 0.2s,
      border-color 0.2s;
  }
  .hbtn:hover {
    color: var(--text);
    border-color: var(--muted);
  }
</style>
