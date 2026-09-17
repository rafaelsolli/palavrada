<script lang="ts">
  import Modal from './Modal.svelte';
  import { bolinhas } from '../../modos/compartilhar';
  import { rotuloDesafio, type ModoDefinicao } from '../../modos/tipos';
  import { formatarContagem, segundosAteMeiaNoite } from '../../nucleo/tempo';
  import { compartilhar } from '../compartilhar';
  import type { Extrato } from '../../nucleo/pontuacao';
  import type { Tentativa } from '../../nucleo/partida';

  interface Props {
    aberto: boolean;
    aoFechar: () => void;
    modo: ModoDefinicao;
    indice: number;
    tentativas: readonly Tentativa[];
    ganhou: boolean;
    palavraAlvo: string;
    /** `null` quando "Exibir pontuação" está desligada. */
    extrato: Extrato | null;
    textoCompartilhamento: () => string;
    acao: { rotulo: string; ao: () => void };
    aoAvisar: (mensagem: string) => void;
  }

  const props: Props = $props();

  let contagem = $state(formatarContagem(segundosAteMeiaNoite()));

  // O relógio só corre com o modal aberto — não faz sentido manter um intervalo
  // vivo durante a partida inteira.
  $effect(() => {
    if (!props.aberto) return;
    contagem = formatarContagem(segundosAteMeiaNoite());
    const id = setInterval(() => (contagem = formatarContagem(segundosAteMeiaNoite())), 1000);
    return () => clearInterval(id);
  });

  async function aoCompartilhar() {
    const r = await compartilhar(props.textoCompartilhamento());
    if (r === 'copiado') props.aoAvisar('✓ Copiado!');
    if (r === 'falhou') props.aoAvisar('Não consegui compartilhar');
  }
</script>

<Modal aberto={props.aberto} aoFechar={props.aoFechar}>
  <div class="titulo">{rotuloDesafio(props.modo, props.indice)}</div>

  {#if props.extrato}
    <div class="extrato">
      <div class="linha base">
        <span class="descricao">Pontuação base</span>
        <span class="valor positivo">+{props.extrato.base}</span>
      </div>

      {#each props.extrato.linhas as linha, i (i)}
        <div class="linha">
          <span class="descricao">
            {linha.descricao}
            {#if linha.memoria}<br /><small class="memoria">{linha.memoria}</small>{/if}
          </span>
          <span class="valor negativo">{linha.valor}</span>
        </div>
      {/each}

      <div class="linha">
        <span class="descricao">Agrav. = <small class="memoria">{props.extrato.memoriaAgravantes}</small></span>
      </div>

      <div class="linha final">
        <span class="final-rotulo">Pontuação final (em teste)</span>
        <span class="final-valor">{props.extrato.total}</span>
      </div>
    </div>
  {/if}

  <div class="bolinhas">
    {#each bolinhas(props.tentativas) as emoji, i (i)}
      <span class="bolinha">{emoji}</span>
    {/each}
  </div>

  <div class="rotulo">
    Você <span>{props.ganhou ? 'venceu, e' : 'perdeu, mas'}</span> a palavra era
  </div>
  <div class="palavra" class:perdeu={!props.ganhou}>{props.palavraAlvo}</div>

  <div class="divisor"></div>
  <div class="proximo">Próxima palavra em</div>
  <div class="contagem">{contagem}</div>

  {#snippet rodape()}
    <div class="botoes">
      <button class="mbtn sec" onclick={aoCompartilhar}>Compartilhar</button>
      <button class="mbtn destaque" onclick={props.acao.ao}>{props.acao.rotulo}</button>
    </div>
  {/snippet}
</Modal>

<style>
  .titulo {
    font-size: 0.78rem;
    color: var(--muted);
    text-align: center;
    margin-bottom: 12px;
  }
  .extrato {
    margin: 12px 0 6px;
    font-size: 0.85rem;
  }
  .linha {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    gap: 10px;
  }
  .descricao {
    font-size: 0.8rem;
    color: var(--muted);
  }
  .memoria {
    font-size: 0.7rem;
    color: var(--muted);
  }
  .linha.base {
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 4px;
  }
  .linha.final {
    padding: 12px 0 4px;
    border-top: 1px solid var(--border);
    margin-top: 8px;
  }
  .valor {
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    white-space: nowrap;
  }
  .valor.negativo {
    color: #ef4444;
  }
  .valor.positivo {
    color: #10b981;
  }
  .final-rotulo {
    font-weight: 700;
    color: var(--text);
  }
  .final-valor {
    font-family: 'DM Sans', sans-serif;
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--text);
  }
  .bolinhas {
    display: flex;
    gap: 7px;
    justify-content: center;
    align-items: center;
    margin: 8px 0 14px;
  }
  .bolinha {
    font-size: 20px;
    line-height: 1;
  }
  .rotulo {
    font-size: 0.7rem;
    color: var(--muted);
    text-align: center;
    margin: 6px 0 2px;
  }
  .palavra {
    font-family: 'DM Sans', sans-serif;
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: 5px;
    text-align: center;
    margin-bottom: 10px;
    color: #10b981;
  }
  .palavra.perdeu {
    color: var(--muted);
  }
  .divisor {
    height: 1px;
    background: var(--border);
    margin: 10px 0;
  }
  .proximo {
    text-align: center;
    font-size: 0.66rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 3px;
  }
  .contagem {
    text-align: center;
    font-family: 'DM Sans', sans-serif;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 3px;
    margin-bottom: 8px;
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
