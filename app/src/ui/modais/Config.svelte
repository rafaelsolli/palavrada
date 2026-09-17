<script lang="ts">
  import Modal from './Modal.svelte';
  import AreaRolavel from '../AreaRolavel.svelte';
  import { config } from '../../config/estado.svelte';
  import {
    CHAVES,
    DEFINICOES,
    PADROES,
    SECOES,
    rotuloValor,
    type ChaveConfig,
    type Secao,
  } from '../../config/definicoes';

  interface Props {
    aberto: boolean;
    aoFechar: () => void;
  }

  const props: Props = $props();

  /**
   * As seções e seus itens saem das definições. Acrescentar uma opção ao jogo
   * não exige tocar neste arquivo — no site atual era preciso editar o HTML, o
   * mapa de ids, o de rótulos e o de ciclos.
   */
  const porSecao = SECOES.map((secao) => ({
    secao,
    chaves: CHAVES.filter((k) => DEFINICOES[k].secao === (secao as Secao)),
  })).filter((s) => s.chaves.length > 0);

  let ajudaAberta = $state<ChaveConfig | null>(null);
  let area = $state<AreaRolavel | null>(null);

  function fechar() {
    config.descartarRascunho();
    ajudaAberta = null;
    props.aoFechar();
  }

  function aplicar() {
    config.aplicar();
    ajudaAberta = null;
    props.aoFechar();
  }

  function redefinir() {
    config.definirRascunho(PADROES);
  }

  $effect(() => {
    if (props.aberto) {
      config.descartarRascunho();
      ajudaAberta = null;
      area?.aoTopo();
    }
  });
</script>

<Modal aberto={props.aberto} aoFechar={fechar} titulo="⚙️ Configurações">
  <AreaRolavel bind:this={area} alturaMaxima="calc(100dvh - 210px)" revisao={ajudaAberta}>
    {#each porSecao as { secao, chaves } (secao)}
      <div class="secao">
        <div class="secao-titulo">{secao}</div>
        {#each chaves as chave (chave)}
          <div class="item">
            <div class="rotulo">
              <label for={`cfg-${chave}`}>{DEFINICOES[chave].rotulo}</label>
              <button
                class="ajuda-btn"
                aria-expanded={ajudaAberta === chave}
                title="O que isso faz?"
                aria-label={`O que isso faz? ${DEFINICOES[chave].rotulo}`}
                onclick={() => (ajudaAberta = ajudaAberta === chave ? null : chave)}
              >
                {ajudaAberta === chave ? '✕' : '?'}
              </button>
            </div>
            <button
              id={`cfg-${chave}`}
              class="ciclo"
              class:modificado={config.foiAlterado(chave)}
              onclick={() => config.ciclar(chave)}
            >
              {rotuloValor(chave, config.valorExibido(chave))}
            </button>
          </div>
          {#if ajudaAberta === chave}
            <!-- O texto vem das definições e contém <strong> para destacar os
                 valores; é conteúdo nosso, não entrada de usuário. -->
            <p class="ajuda-texto">{@html DEFINICOES[chave].ajuda}</p>
          {/if}
        {/each}
      </div>
    {/each}
  </AreaRolavel>

  {#snippet rodape()}
    <div class="botoes">
      <button class="mbtn sec" onclick={redefinir}>Redefinir</button>
      <button class="mbtn" onclick={aplicar}>Aplicar</button>
    </div>
  {/snippet}
</Modal>

<style>
  .secao {
    border-top: 1px solid var(--border);
    margin-top: 14px;
    padding-top: 10px;
  }
  .secao:first-of-type {
    border-top: none;
    margin-top: 0;
    padding-top: 0;
  }
  .secao-titulo {
    font-size: 0.65rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 8px;
  }
  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 5px 0;
  }
  .rotulo {
    display: flex;
    align-items: center;
    gap: 5px;
    flex: 1;
  }
  .rotulo label {
    font-size: 0.84rem;
    color: var(--text);
  }
  .ajuda-btn {
    background: none;
    border: none;
    color: var(--muted);
    font-size: 0.68rem;
    font-family: 'Space Grotesk', sans-serif;
    cursor: pointer;
    padding: 1px 3px;
    opacity: 0.5;
    transition: opacity 0.15s;
    flex-shrink: 0;
    line-height: 1;
  }
  .ajuda-btn:hover,
  .ajuda-btn[aria-expanded='true'] {
    opacity: 1;
  }
  .ajuda-texto {
    font-size: 0.78rem;
    color: var(--muted);
    line-height: 1.55;
    padding: 4px 0 8px;
    margin: 0;
  }
  .ajuda-texto :global(strong) {
    color: var(--text);
  }
  .ciclo {
    background: rgba(59, 130, 246, 0.12);
    border: 1px solid rgba(59, 130, 246, 0.25);
    color: var(--accent);
    border-radius: 7px;
    padding: 5px 10px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: uppercase;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    width: 110px;
    text-align: center;
    position: relative;
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s;
  }
  .ciclo::before,
  .ciclo::after {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0.45;
    font-weight: 400;
  }
  .ciclo::before {
    content: '‹';
    left: 8px;
  }
  .ciclo::after {
    content: '›';
    right: 8px;
  }
  .ciclo:hover {
    background: rgba(59, 130, 246, 0.22);
  }
  .ciclo:active {
    background: rgba(59, 130, 246, 0.35);
  }
  .ciclo.modificado {
    color: #fbbf24;
    border-color: rgba(251, 191, 36, 0.3);
    background: rgba(251, 191, 36, 0.08);
  }
  .ciclo.modificado:hover {
    background: rgba(251, 191, 36, 0.16);
  }
  .botoes {
    display: flex;
    gap: 8px;
    margin-top: 14px;
  }
  .botoes :global(.mbtn) {
    margin-top: 0;
    flex: 1;
  }
</style>
