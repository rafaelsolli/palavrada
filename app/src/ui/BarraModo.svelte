<script lang="ts">
  import { formatarDuracao } from '../nucleo/tempo';
  import type { ModoDefinicao } from '../modos/tipos';
  import { rotuloDesafio } from '../modos/tipos';

  interface Props {
    modo: ModoDefinicao;
    indice: number;
    /** Segundos restantes, ou `null` quando a partida não tem tempo limite. */
    restanteSegundos: number | null;
  }

  const { modo, indice, restanteSegundos }: Props = $props();
  const titulo = $derived(rotuloDesafio(modo, indice).replace(' #', ' · #'));
</script>

<div class="barra">
  <div class="badge {modo.classe}">{titulo}</div>
  <div class="tempo">
    <span class="icone">⏰</span>
    <span class="texto">{restanteSegundos === null ? '∞' : formatarDuracao(restanteSegundos)}</span>
  </div>
</div>

<style>
  .barra {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 0;
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
  }
  .badge {
    font-size: 0.63rem;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 3px 12px;
    border-radius: 30px;
    font-weight: 700;
    border: 1px solid var(--border);
    color: var(--muted);
    background: var(--surface2);
    display: flex;
    align-items: center;
    height: 28px;
  }
  .badge.diario {
    color: #60a5fa;
    border-color: #1e3a5f;
    background: #0a1628;
  }
  .badge.livre {
    color: #a78bfa;
    border-color: #2d1f5e;
    background: #0e0a1e;
  }
  .badge.livrissimo {
    color: #e879f9;
    border-color: #4a1259;
    background: #1a0520;
  }
  .tempo {
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    background: var(--key-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 0.75rem;
    color: var(--text);
    height: 28px;
    width: 80px;
  }
  .icone {
    font-size: 0.9rem;
    line-height: 1;
  }
  .texto {
    font-weight: 600;
    letter-spacing: 0.5px;
    width: 32px;
    text-align: center;
  }
</style>
