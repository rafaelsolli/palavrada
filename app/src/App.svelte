<script lang="ts">
  // Placeholder da Fase 0. Existe para provar duas coisas em produção:
  //   1. o pipeline de build/deploy publica em /beta/ sem tocar na raiz;
  //   2. /beta/ enxerga o mesmo localStorage do site legado (mesma origem),
  //      que é o motivo de termos escolhido subpasta em vez de subdomínio.
  const PREFIXOS = ['palavrada.', 'pr_'];

  type Entrada = { chave: string; tamanho: number };

  function lerChaves(): Entrada[] {
    try {
      return Object.keys(localStorage)
        .filter((c) => PREFIXOS.some((p) => c.startsWith(p)))
        .sort()
        .map((chave) => ({ chave, tamanho: (localStorage.getItem(chave) ?? '').length }));
    } catch {
      return [];
    }
  }

  const entradas = lerChaves();
</script>

<main>
  <h1>PalavRada <span>beta</span></h1>
  <p class="sub">Reescrita em andamento — Vite + TypeScript + Svelte 5.</p>

  <section>
    <h2>localStorage visível daqui</h2>
    {#if entradas.length}
      <ul>
        {#each entradas as { chave, tamanho } (chave)}
          <li><code>{chave}</code><span>{tamanho} bytes</span></li>
        {/each}
      </ul>
      <p class="ok">
        ✓ Mesma origem do site legado — a migração de progresso pode ser testada aqui.
      </p>
    {:else}
      <p class="vazio">
        Nenhuma chave encontrada. Jogue uma partida em
        <a href="/">palavrada.com.br</a> e recarregue esta página.
      </p>
    {/if}
  </section>

  <p class="voltar"><a href="/">← voltar para a versão atual</a></p>
</main>

<style>
  main {
    max-width: 560px;
    margin: 0 auto;
    padding: 48px 20px;
  }
  h1 {
    font-family: 'DM Sans', sans-serif;
    font-size: 1.8rem;
    font-weight: 800;
    background: linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  h1 span {
    font-size: 0.7rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    vertical-align: middle;
    -webkit-text-fill-color: var(--muted);
  }
  .sub {
    color: var(--muted);
    font-size: 0.85rem;
    margin-top: 4px;
  }
  section {
    margin-top: 32px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 18px;
  }
  h2 {
    font-size: 0.75rem;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
  }
  ul {
    list-style: none;
    margin-top: 12px;
  }
  li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 7px 0;
    border-bottom: 1px solid var(--border);
    font-size: 0.85rem;
  }
  li:last-child {
    border-bottom: 0;
  }
  li span {
    color: var(--muted);
    flex-shrink: 0;
  }
  code {
    font-family: 'Space Grotesk', monospace;
    color: var(--accent);
    overflow-wrap: anywhere;
  }
  .ok {
    margin-top: 14px;
    font-size: 0.8rem;
    color: var(--wave-win);
  }
  .vazio {
    margin-top: 12px;
    font-size: 0.85rem;
    color: var(--muted);
  }
  .voltar {
    margin-top: 28px;
    font-size: 0.85rem;
  }
  a {
    color: var(--accent);
  }
</style>
