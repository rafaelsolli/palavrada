<script lang="ts">
  /** Cápsula do cabeçalho: sequência do diário ou progresso dos modos livres. */
  interface Props {
    icone: string;
    texto: string;
  }
  const { icone, texto }: Props = $props();
</script>

<div class="selo">
  <span class="icone">{icone}</span>
  <span class="texto">{texto}</span>
</div>

<style>
  .selo {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    background: var(--key-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 0.75rem;
    color: var(--text);
    transition:
      border-color 0.2s,
      background 0.2s;
  }
  .selo:hover {
    border-color: var(--muted);
    background: color-mix(in srgb, var(--key-bg) 85%, var(--muted));
  }
  .icone {
    font-size: 0.9rem;
    line-height: 1;
  }
  .texto {
    font-weight: 600;
    letter-spacing: 0.5px;
  }
</style>
