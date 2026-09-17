<script lang="ts">
  import Modal from './Modal.svelte';
  import { LIVRE, LIVRISSIMO } from '../../modos/definicoes';
  import { rotulo, type ModoDefinicao } from '../../modos/tipos';
  import { textoProgresso } from '../../modos/compartilhar';
  import { compartilhar } from '../compartilhar';
  import type { Progresso } from '../../nucleo/armazenamento';

  interface Props {
    aberto: boolean;
    aoFechar: () => void;
    totalLivre: number;
    totalLivrissimo: number;
    progressoLivre: Progresso;
    progressoLivrissimo: Progresso;
    base: string;
    aoEscolher: (modo: ModoDefinicao, indice: number) => void;
    aoAvisar: (mensagem: string) => void;
  }

  const props: Props = $props();

  /**
   * O Livríssimo tem 9.147 desafios. O site atual montava as 10.589 células de
   * uma vez a cada abertura, o que travava o modal por segundos. Aqui a lista
   * cresce conforme a rolagem se aproxima do fim, e `content-visibility` deixa o
   * navegador pular o layout do que está fora da tela.
   */
  const LOTE = 600;
  let visiveisLivrissimo = $state(LOTE);

  const livreCompleto = $derived(props.progressoLivre.jogados.length >= props.totalLivre);

  const resultadoPorId = (p: Progresso) =>
    new Map(p.jogados.map((j) => [j.id, j.ganhou] as const));

  const feitosLivre = $derived(resultadoPorId(props.progressoLivre));
  const feitosLivrissimo = $derived(resultadoPorId(props.progressoLivrissimo));

  let escolhido = $state<{ modo: ModoDefinicao; indice: number } | null>(null);
  let area = $state<HTMLDivElement | null>(null);
  let noFim = $state(false);

  function aoRolar() {
    if (!area) return;
    const restante = area.scrollHeight - area.scrollTop - area.clientHeight;
    noFim = restante <= 4;
    // Carrega o próximo lote antes de o usuário chegar ao fim.
    if (restante < 600 && visiveisLivrissimo < props.totalLivrissimo) {
      visiveisLivrissimo = Math.min(visiveisLivrissimo + LOTE, props.totalLivrissimo);
    }
  }

  function estadoDa(feitos: Map<number, boolean>, i: number) {
    const ganhou = feitos.get(i);
    if (ganhou === undefined) return { classe: '', texto: String(i + 1), jogado: false };
    return ganhou
      ? { classe: 'concluido', texto: '✓', jogado: true }
      : { classe: 'falhou', texto: '✕', jogado: true };
  }

  function escolher(modo: ModoDefinicao, indice: number) {
    escolhido = { modo, indice };
  }

  function confirmar() {
    if (escolhido) props.aoEscolher(escolhido.modo, escolhido.indice);
  }

  async function compartilharProgresso() {
    const texto = textoProgresso(props.progressoLivre.jogados, props.totalLivre, props.base);
    const r = await compartilhar(texto);
    if (r === 'copiado') props.aoAvisar('✓ Copiado!');
    if (r === 'falhou') props.aoAvisar('Não consegui compartilhar');
  }

  // Sugere o primeiro desafio ainda não jogado sempre que o modal abre.
  $effect(() => {
    if (!props.aberto) return;
    visiveisLivrissimo = LOTE;
    escolhido = null;
    for (let i = 0; i < props.totalLivre; i++) {
      if (!feitosLivre.has(i)) {
        escolhido = { modo: LIVRE, indice: i };
        break;
      }
    }
    queueMicrotask(() => {
      area?.querySelector('.celula.sugerida')?.scrollIntoView({ block: 'center' });
      aoRolar();
    });
  });
</script>

<Modal aberto={props.aberto} aoFechar={props.aoFechar} classe="seletor">
  <div class="titulo">Selecionar desafio</div>

  <div class="area-wrap">
    <div class="area" bind:this={area} onscroll={aoRolar}>
      <div class="secao">{rotulo(LIVRE)}</div>
      <div class="grade">
        {#each { length: props.totalLivre } as _, i (i)}
          {@const e = estadoDa(feitosLivre, i)}
          <button
            type="button"
            class="celula {e.classe}"
            class:sugerida={escolhido?.modo === LIVRE && escolhido.indice === i}
            disabled={e.jogado}
            title={e.jogado ? `#${i + 1}: já jogado` : `${rotulo(LIVRE)} #${i + 1}`}
            onclick={() => escolher(LIVRE, i)}
          >
            {e.texto}
          </button>
        {/each}
      </div>

      <div class="secao">{livreCompleto ? rotulo(LIVRISSIMO) : `🔒 ${LIVRISSIMO.nome}`}</div>
      <div class="grade">
        {#each { length: visiveisLivrissimo } as _, i (i)}
          {@const e = estadoDa(feitosLivrissimo, i)}
          <button
            type="button"
            class="celula {livreCompleto ? e.classe : 'trancada'}"
            class:sugerida={escolhido?.modo === LIVRISSIMO && escolhido.indice === i}
            disabled={!livreCompleto || e.jogado}
            title={livreCompleto
              ? e.jogado
                ? `#${i + 1}: já jogado`
                : `${rotulo(LIVRISSIMO)} #${i + 1}`
              : `Complete o ${rotulo(LIVRE)} primeiro`}
            onclick={() => escolher(LIVRISSIMO, i)}
          >
            {livreCompleto ? e.texto : i + 1}
          </button>
        {/each}
      </div>

      {#if visiveisLivrissimo < props.totalLivrissimo}
        <div class="carregando">carregando mais…</div>
      {/if}
    </div>
    <div class="fade" style:opacity={noFim ? 0 : 1}>▼</div>
  </div>

  {#snippet rodape()}
    <button class="mbtn sec" onclick={compartilharProgresso}>Compartilhar</button>
    <button class="mbtn" disabled={!escolhido} onclick={confirmar}>Jogar</button>
  {/snippet}
</Modal>

<style>
  .titulo {
    font-size: 0.78rem;
    color: var(--muted);
    text-align: center;
    margin-bottom: 12px;
  }
  .area-wrap {
    position: relative;
    max-height: 260px;
    overflow: hidden;
    margin: 12px 0;
  }
  .area {
    max-height: 260px;
    overflow-y: auto;
    scrollbar-width: none;
    padding: 4px 2px 24px;
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
    background: linear-gradient(transparent, var(--surface));
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 4px;
    color: var(--muted);
    font-size: 0.75rem;
    pointer-events: none;
    transition: opacity 0.2s;
  }
  .secao {
    font-size: 0.62rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    padding: 10px 2px 4px;
    text-align: center;
  }
  .grade {
    display: grid;
    grid-template-columns: repeat(auto-fill, 34px);
    justify-content: center;
    gap: 4px;
  }
  .celula {
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--key-bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text);
    overflow: hidden;
    /* Deixa o navegador pular o layout das células fora da tela. */
    content-visibility: auto;
    contain-intrinsic-size: 34px 34px;
  }
  .celula:hover:not(:disabled) {
    border-color: var(--muted);
  }
  .celula.concluido {
    background: #10b981;
    color: white;
    border-color: #059669;
    cursor: default;
  }
  .celula.falhou {
    background: #ef4444;
    color: white;
    border-color: #dc2626;
    cursor: default;
  }
  .celula.trancada {
    opacity: 0.25;
    cursor: not-allowed;
  }
  .celula.sugerida {
    background: rgba(59, 130, 246, 0.2);
    border-color: #3b82f6;
    color: #60a5fa;
  }
  .carregando {
    text-align: center;
    color: var(--muted);
    font-size: 0.72rem;
    padding: 10px 0;
  }
</style>
