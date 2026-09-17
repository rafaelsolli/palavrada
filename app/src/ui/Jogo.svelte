<script lang="ts">
  import Cabecalho from './Cabecalho.svelte';
  import Selo from './Selo.svelte';
  import BarraModo from './BarraModo.svelte';
  import Onda from './Onda.svelte';
  import Historico from './Historico.svelte';
  import Grade from './Grade.svelte';
  import Teclado from './Teclado.svelte';
  import { config } from '../config/estado.svelte';
  import type { ControladorJogo } from '../modos/controlador';

  interface Props {
    controlador: ControladorJogo;
    /** Texto do selo do cabeçalho, ou `null` para escondê-lo. */
    selo: { icone: string; texto: string } | null;
    /** Verdadeiro quando algum modal está aberto: o teclado físico é ignorado. */
    bloqueado: boolean;
    espiar: string | null;
    iconeAlternar: string;
    rotuloAlternar: string;
    aoAlternarModo: () => void;
    aoAbrirAjuda: () => void;
    aoAbrirConfig: () => void;
    aoAvisar: (mensagem: string) => void;
  }

  const props: Props = $props();

  // O controlador é uma classe comum, sem runes: a interface relê o instantâneo
  // depois de cada ação. Explícito, e mantém o núcleo livre de framework.
  // `versao` é a dependência que força a releitura; derivar também de
  // `props.controlador` faz a tela acompanhar uma troca de partida.
  let versao = $state(0);
  const instantaneo = $derived.by(() => {
    void versao;
    return props.controlador.instantaneo;
  });

  let pulso = $state<{ indice: number; n: number } | null>(null);
  let tremor = $state(0);
  let n = 0;

  const sincronizar = () => versao++;

  function aoTecla(k: string) {
    const acao = props.controlador.tecla(k);
    sincronizar();
    if (!acao) return;

    if (acao.tipo === 'letra') {
      pulso = { indice: acao.indice, n: ++n };
    } else if (acao.tipo === 'erro') {
      tremor = ++n;
      props.aoAvisar(
        acao.motivo === 'incompleta' ? 'Preencha todas as letras!' : 'Palavra inválida!',
      );
    }
  }

  function aoClicarLetra(i: number) {
    // `focar` já ignora o clique quando a partida acabou.
    props.controlador.partida.focar(i);
    sincronizar();
  }

  function aoAlternarPalpite(i: number) {
    props.controlador.partida.alternarVisibilidade(i);
    sincronizar();
  }

  // Tique do cronômetro: mora aqui, e não no modelo, para que a partida continue
  // testável sem timers e para não sobrar setInterval órfão.
  $effect(() => {
    if (instantaneo.encerrada) return;
    const id = setInterval(() => {
      props.controlador.verificarTempo();
      sincronizar();
    }, 250);
    return () => clearInterval(id);
  });

  // Pausa a contagem quando a aba sai de vista — é o que impede a penalidade de
  // tempo de explodir ao reabrir o jogo horas depois.
  $effect(() => {
    const aoMudarVisibilidade = () => {
      if (document.hidden) props.controlador.pausar();
      else props.controlador.retomar();
      sincronizar();
    };
    // `pagehide` cobre o caso de fechar a aba, onde `visibilitychange` pode não
    // chegar a tempo de persistir a sessão.
    const aoSair = () => props.controlador.pausar();
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    window.addEventListener('pagehide', aoSair);
    return () => {
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      window.removeEventListener('pagehide', aoSair);
    };
  });
</script>

{#snippet seloDoCabecalho()}
  {#if props.selo}
    <Selo icone={props.selo.icone} texto={props.selo.texto} />
  {/if}
{/snippet}

<Cabecalho
  selo={props.selo ? seloDoCabecalho : null}
  aoAlternarModo={props.aoAlternarModo}
  rotuloAlternar={props.rotuloAlternar}
  iconeAlternar={props.iconeAlternar}
  aoAbrirAjuda={props.aoAbrirAjuda}
  aoAbrirConfig={props.aoAbrirConfig}
/>

<main>
  <BarraModo
    modo={props.controlador.modo}
    indice={props.controlador.indice}
    restanteSegundos={instantaneo.restanteSegundos}
  />

  <Onda
    tentativas={instantaneo.tentativas}
    valoresAlvo={instantaneo.valoresAlvo}
    config={config.atual}
  />

  <Historico
    tentativas={instantaneo.tentativas}
    valoresAlvo={instantaneo.valoresAlvo}
    maxPalpites={config.atual.maxPalpites}
    mostrarAlvoNasMinis={config.atual.alvoNosPalpites}
    aoAlternar={aoAlternarPalpite}
  />

  <div class="entrada">
    <Grade
      atual={instantaneo.atual}
      indiceFoco={instantaneo.indiceFoco}
      letrasFixas={instantaneo.letrasFixas}
      revelado={instantaneo.revelado}
      encerrada={instantaneo.encerrada}
      sugestao={instantaneo.sugestao}
      espiar={props.espiar}
      aoClicar={aoClicarLetra}
      {pulso}
      {tremor}
    />
    <Teclado layout={config.atual.teclado} bloqueado={props.bloqueado} {aoTecla} />
  </div>
</main>

<style>
  main {
    width: 100%;
    max-width: 560px;
    padding: 8px 14px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    overflow: hidden;
  }
  .entrada {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 10px 12px calc(12px + env(safe-area-inset-bottom));
    flex-shrink: 0;
  }
</style>
