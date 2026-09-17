<script lang="ts">
  import Jogo from './ui/Jogo.svelte';
  import Toast from './ui/Toast.svelte';
  import Seletor from './ui/modais/Seletor.svelte';
  import Ajuda from './ui/modais/Ajuda.svelte';
  import Config from './ui/modais/Config.svelte';
  import Resultado from './ui/modais/Resultado.svelte';
  import { config, lerConfig } from './config/estado.svelte';
  import { carregarLexico, type Lexico } from './nucleo/lexico';
  import { ControladorJogo } from './modos/controlador';
  import { lerDesafioDaUrl, resolverModo } from './modos/resolver';
  import { DIARIO, LIVRE, LIVRISSIMO } from './modos/definicoes';
  import { linkDoDesafio, rotulo, type ModoDefinicao } from './modos/tipos';
  import { numeroDoDia } from './nucleo/tempo';
  import { registrarConsole } from './ui/console';
  import {
    carregarProgresso,
    carregarStats,
    jaJogado,
    garantirBackup,
    limparSessoesDiariasAntigas,
    marcarTutorialVisto,
    migrarChavesAntigas,
    tutorialJaVisto,
    type Progresso,
  } from './nucleo/armazenamento';

  const BASE = `${window.location.origin}${window.location.pathname}`;
  /** `?debug=1` mostra a palavra-alvo em cinza. Antes isso era automático em
   *  localhost, o que impedia testar o jogo de verdade durante o desenvolvimento. */
  const DEPURANDO = new URLSearchParams(window.location.search).get('debug') === '1';

  let toast = $state<Toast | null>(null);
  let controlador = $state<ControladorJogo | null>(null);
  let erro = $state<string | null>(null);
  let modal = $state<'seletor' | 'ajuda' | 'config' | 'resultado' | null>(null);
  let versaoProgresso = $state(0);

  let lexicoCuradas = $state<Lexico | null>(null);

  const progressoLivre = $derived.by((): Progresso => {
    void versaoProgresso;
    return carregarProgresso('livre');
  });
  const progressoLivrissimo = $derived.by((): Progresso => {
    void versaoProgresso;
    return carregarProgresso('livrissimo');
  });

  const totalLivre = $derived(lexicoCuradas?.palavras.length ?? 0);
  const totalLivrissimo = $derived(9147);
  const livreCompleto = $derived(totalLivre > 0 && progressoLivre.jogados.length >= totalLivre);

  /** Cápsula do cabeçalho: sequência no diário, progresso nos modos livres. */
  const selo = $derived.by(() => {
    if (!controlador) return null;
    void versaoProgresso;
    const pct = (n: number, total: number) =>
      `${((n * 100) / total).toFixed(2).replace('.', ',')}% completo`;

    switch (controlador.modo.id) {
      case 'diario': {
        const s = carregarStats().sequencia;
        if (s <= 0) return null;
        return { icone: '🔥', texto: `${s} vitória${s === 1 ? '' : 's'} seguida${s === 1 ? '' : 's'}` };
      }
      case 'livre':
        return livreCompleto
          ? null
          : { icone: LIVRE.icone, texto: pct(progressoLivre.jogados.length, totalLivre) };
      case 'livrissimo':
        return {
          icone: LIVRISSIMO.icone,
          texto: pct(progressoLivrissimo.jogados.length, totalLivrissimo),
        };
    }
  });

  const alternar = $derived.by(() => {
    if (!controlador) return { icone: '🎲', rotulo: '', ao: () => {} };
    if (controlador.modo.id !== 'diario') {
      return { icone: DIARIO.icone, rotulo: 'Jogar o Desafio Diário', ao: () => irPara(BASE) };
    }
    const destino = livreCompleto ? LIVRISSIMO : LIVRE;
    return { icone: destino.icone, rotulo: rotulo(destino), ao: () => (modal = 'seletor') };
  });

  function irPara(url: string) {
    window.location.href = url;
  }

  /**
   * Dados do modal de resultado.
   *
   * Precisa passar pelo contador de versão: o controlador é uma classe comum e
   * sua identidade não muda ao fim da partida, então ler
   * `controlador.partida.ganhou` direto no template congelaria o valor do
   * primeiro render — o modal anunciava derrota depois de uma vitória.
   */
  const resultado = $derived.by(() => {
    void versaoProgresso;
    if (!controlador) return null;
    const { partida } = controlador;
    return {
      tentativas: partida.tentativas,
      ganhou: partida.ganhou,
      palavraAlvo: partida.palavraAlvo,
      extrato: config.atual.exibirPontuacao ? partida.extrato() : null,
    };
  });

  /** Botão principal do modal de resultado: sempre leva ao seletor. */
  const acaoDoResultado = $derived.by(() => {
    const destino = livreCompleto || controlador?.modo.id === 'livrissimo' ? LIVRISSIMO : LIVRE;
    return { rotulo: rotulo(destino), ao: () => (modal = 'seletor') };
  });

  /**
   * O resultado aparece depois da animação de revelação da grade. Os tempos são
   * os do site atual: mais folga na vitória, para dar tempo de ver a onda verde.
   */
  function agendarResultado(ganhou: boolean, atrasoMs = ganhou ? 1600 : 900) {
    setTimeout(() => (modal = 'resultado'), atrasoMs);
  }

  async function iniciar() {
    registrarConsole();
    // Antes de qualquer escrita: o beta divide o armazenamento com o site
    // publicado, então uma cópia do estado anterior fica guardada.
    garantirBackup();
    migrarChavesAntigas();
    const dia = numeroDoDia();
    limparSessoesDiariasAntigas(dia);

    const pedido = lerDesafioDaUrl(window.location.search);

    try {
      const lexico = await carregarLexico(pedido?.modo.fonte ?? 'curadas');
      lexicoCuradas = pedido?.modo.fonte === 'livrissimo' ? await carregarLexico('curadas') : lexico;

      const resolucao = resolverModo(pedido, {
        dia,
        totalDoModo: lexico.palavras.length,
        totalLivre: lexicoCuradas.palavras.length,
        jogadosLivre: carregarProgresso('livre').jogados.length,
        jaJogado:
          pedido !== null &&
          pedido.modo.persistencia !== null &&
          jaJogado(pedido.modo.persistencia, pedido.indice),
      });

      if (resolucao.redirecionado) {
        history.replaceState(null, '', window.location.pathname);
      }

      // Se a resolução mandou para outro modo, a lista pode ser outra. Não custa
      // nova requisição: os arquivos já estão em cache.
      const lexicoFinal = await carregarLexico(resolucao.modo.fonte);

      const c = new ControladorJogo({
        modo: resolucao.modo,
        indice: resolucao.indice,
        lexico: lexicoFinal,
        config: lerConfig,
        base: BASE,
      });
      c.aoEncerrar = (ganhou) => {
        versaoProgresso++;
        agendarResultado(ganhou);
      };
      const restaurou = c.iniciar();
      controlador = c;

      // Reabrir uma partida já encerrada mostra o resultado de novo, sem
      // recontar nada: o encerramento não é disparado outra vez.
      if (restaurou && c.partida.encerrada) {
        versaoProgresso++;
        agendarResultado(c.partida.ganhou, 400);
      }

      if (resolucao.aviso) setTimeout(() => toast?.mostrar(resolucao.aviso!), 300);
      if (!tutorialJaVisto()) {
        marcarTutorialVisto();
        setTimeout(() => (modal = 'ajuda'), 500);
      }
    } catch (e) {
      erro = e instanceof Error ? e.message : 'Não consegui carregar o jogo';
    }
  }

  function escolherDesafio(modo: ModoDefinicao, indice: number) {
    irPara(linkDoDesafio(modo, indice, BASE));
  }

  iniciar();
</script>

<Toast bind:this={toast} />

{#if erro}
  <div class="aviso">
    <p>{erro}</p>
    <button class="mbtn" onclick={() => window.location.reload()}>Tentar de novo</button>
  </div>
{:else if controlador}
  <Jogo
    {controlador}
    {selo}
    bloqueado={modal !== null}
    espiar={DEPURANDO ? controlador.partida.palavraAlvo : null}
    iconeAlternar={alternar.icone}
    rotuloAlternar={alternar.rotulo}
    aoAlternarModo={alternar.ao}
    aoAbrirAjuda={() => (modal = 'ajuda')}
    aoAbrirConfig={() => (modal = 'config')}
    aoAvisar={(m) => toast?.mostrar(m)}
  />

  <Ajuda
    aberto={modal === 'ajuda'}
    aoFechar={() => (modal = null)}
    mostrarPontuacao={config.atual.exibirPontuacao}
    base={BASE}
    aoAvisar={(m) => toast?.mostrar(m)}
  />

  <Config aberto={modal === 'config'} aoFechar={() => (modal = null)} />

  <Resultado
    aberto={modal === 'resultado'}
    aoFechar={() => (modal = null)}
    modo={controlador.modo}
    indice={controlador.indice}
    tentativas={resultado?.tentativas ?? []}
    ganhou={resultado?.ganhou ?? false}
    palavraAlvo={resultado?.palavraAlvo ?? ''}
    extrato={resultado?.extrato ?? null}
    textoCompartilhamento={() => controlador!.textoCompartilhamento()}
    acao={acaoDoResultado}
    aoAvisar={(m) => toast?.mostrar(m)}
  />

  <Seletor
    aberto={modal === 'seletor'}
    aoFechar={() => (modal = null)}
    {totalLivre}
    {totalLivrissimo}
    {progressoLivre}
    {progressoLivrissimo}
    base={BASE}
    aoEscolher={escolherDesafio}
    aoAvisar={(m) => toast?.mostrar(m)}
  />
{:else}
  <div class="carregando">carregando…</div>
{/if}

<style>
  .carregando,
  .aviso {
    margin: auto;
    color: var(--muted);
    font-size: 0.85rem;
    text-align: center;
    padding: 24px;
    max-width: 320px;
  }
</style>
