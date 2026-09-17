<script lang="ts">
  import Modal from './Modal.svelte';
  import AreaRolavel from '../AreaRolavel.svelte';
  import { textoConvite } from '../../modos/compartilhar';
  import { compartilhar } from '../compartilhar';
  import { COR } from '../desenho';
  import { MAX_TENTATIVAS } from '../../nucleo/partida';
  import { PONTOS_BASE, PENALIDADE_BASE_PALPITE } from '../../nucleo/pontuacao';

  interface Props {
    aberto: boolean;
    aoFechar: () => void;
    /** A seção de pontuação só aparece com a opção ligada. */
    mostrarPontuacao: boolean;
    base: string;
    aoAvisar: (mensagem: string) => void;
  }

  const props: Props = $props();
  let area = $state<AreaRolavel | null>(null);

  $effect(() => {
    if (props.aberto) area?.aoTopo();
  });

  async function convidar() {
    const r = await compartilhar(textoConvite(props.base));
    if (r === 'copiado') props.aoAvisar('✓ Copiado!');
    if (r === 'falhou') props.aoAvisar('Não consegui compartilhar');
  }

  const LETRAS_EXEMPLO = [
    { letra: 'V', x: 22, y: 22.6, valor: 21 },
    { letra: 'E', x: 66, y: 59.4, valor: 4 },
    { letra: 'R', x: 110, y: 31.3, valor: 17 },
    { letra: 'S', x: 154, y: 29.1, valor: 18 },
    { letra: 'O', x: 198, y: 37.8, valor: 14 },
  ];
</script>

<Modal aberto={props.aberto} aoFechar={props.aoFechar} titulo="Como Jogar 🌊">
  <AreaRolavel alturaMaxima="calc(100dvh - 210px)" bind:this={area} revisao={props.mostrarPontuacao}>
    <div class="bloco">
      <div class="bloco-titulo">Letras têm valores</div>
      <p>
        Cada letra equivale a um número, indo de <strong>A = 0</strong> até
        <strong>Z = 25</strong>, correspondente à sua posição no alfabeto.
      </p>
      <div class="escala">
        {#each [{ l: 'A', n: 0 }, { l: 'M', n: 12 }, { l: 'Z', n: 25 }] as ponto, i (ponto.l)}
          {#if i > 0}<div class="trilha"><div class="preenchimento"></div></div>{/if}
          <div class="escala-ponto">
            <span class="escala-letra">{ponto.l}</span>
            <span class="escala-num">{ponto.n}</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="bloco">
      <div class="bloco-titulo">Palavras viram ondas</div>
      <p>
        O jogo funciona apenas com palavras de exatamente 5 letras, e os valores das letras
        definem os pontos de uma curva — mais alto perto do Z, mais baixo perto do A.
      </p>
      <div class="caixa-onda">
        <svg class="svg" viewBox="0 0 220 76" xmlns="http://www.w3.org/2000/svg">
          {#each LETRAS_EXEMPLO as p (p.letra)}
            <text x={p.x} y="9" font-size="11" font-family="DM Sans,sans-serif" font-weight="700" fill="#e8f0fe" text-anchor="middle">{p.letra}</text>
            <circle cx={p.x} cy={p.y} r="3" fill={COR.alvo} />
            <text x={p.x} y="74" font-size="9" font-family="Space Grotesk,sans-serif" fill="rgba(59,130,246,0.65)" text-anchor="middle">{p.valor}</text>
          {/each}
          <path
            d="M22,22.6 C44,22.6 44,59.4 66,59.4 C88,59.4 88,31.3 110,31.3 C132,31.3 132,29.1 154,29.1 C176,29.1 176,37.8 198,37.8"
            stroke={COR.alvo}
            fill="none"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>

    <div class="bloco">
      <div class="bloco-titulo">Objetivo</div>
      <p>
        A onda <span class="azul">azul</span> representa a <strong>palavra alvo</strong> e fica
        sempre visível. Ao digitar um palpite e apertar "enter", a onda do palpite aparece. O
        <strong>Δ</strong> mede a distância entre as ondas — quanto menor, mais perto. E você tem
        <strong>{MAX_TENTATIVAS} palpites</strong> pra acertar.
      </p>
      <div class="par">
        <div class="exemplo">
          <div class="exemplo-rotulo">Δ = 54 — longe</div>
          <svg class="svg" viewBox="0 0 220 52" xmlns="http://www.w3.org/2000/svg">
            <path d="M22,11 C44,11 44,41 66,41 C88,41 88,18.1 110,18.1 C132,18.1 132,16.3 154,16.3 C176,16.3 176,23.4 198,23.4" stroke={COR.alvo} fill="none" stroke-width="2" stroke-linecap="round" opacity="0.8" />
            <path d="M22,44.5 C44,44.5 44,16.3 66,16.3 C88,16.3 88,39.2 110,39.2 C132,39.2 132,11 154,11 C176,11 176,33.9 198,33.9" stroke={COR.ultimo} fill="none" stroke-width="2" stroke-linecap="round" />
          </svg>
        </div>
        <div class="exemplo">
          <div class="exemplo-rotulo">Δ = 0 — acertou! 🎉</div>
          <svg class="svg" viewBox="0 0 220 52" xmlns="http://www.w3.org/2000/svg">
            <path d="M22,11 C44,11 44,41 66,41 C88,41 88,18.1 110,18.1 C132,18.1 132,16.3 154,16.3 C176,16.3 176,23.4 198,23.4" stroke={COR.vitoria} fill="none" stroke-width="3" stroke-linecap="round" />
          </svg>
        </div>
      </div>
    </div>

    {#if props.mostrarPontuacao}
      <div class="bloco">
        <div class="bloco-titulo">Pontuação (pra quem é competitivo)</div>
        <p>
          Você começa com <strong>{PONTOS_BASE} pontos</strong> e perde pontos a cada palpite. O
          objetivo é acertar gastando o menor número de pontos possível!
        </p>
        <p>Cada palpite errado gera uma penalidade calculada como:</p>
        <div class="formula"><strong>[base + delta + tempo] × agravantes</strong></div>
        <ul class="dicas">
          <li><strong>Base:</strong> {PENALIDADE_BASE_PALPITE} pontos fixos por palpite</li>
          <li><strong>Delta:</strong> distância da palavra alvo (0 a 100 pontos)</li>
          <li><strong>Tempo:</strong> penalidade crescente conforme você demora (0,5 a 2 pontos por segundo)</li>
          <li><strong>Agravantes:</strong> multiplicador baseado nas suas configurações</li>
        </ul>
        <p>
          Configurações que <strong>facilitam</strong> o jogo aumentam a penalidade, enquanto as que
          <strong>dificultam</strong> a reduzem:
        </p>
        <ul class="dicas">
          <li><strong>Réguas horizontais e letras no eixo Y:</strong> +2% cada</li>
          <li><strong>Bolinhas, letras no último palpite e onda-alvo no histórico:</strong> +5% cada</li>
          <li><strong>Palpites visíveis:</strong> −3% cada palpite oculto</li>
          <li><strong>Fixar letras:</strong> pode ajudar ou atrapalhar conforme o nº de palpites</li>
          <li><strong>Autocomplete:</strong> dobra a penalidade (×200%)</li>
          <li><strong>Palavras inválidas:</strong> aceitar = +20%, penalizar = −20%</li>
        </ul>
        <p><strong>Exemplo:</strong> palpite após 15 segundos com delta 28 e configuração padrão:</p>
        <div class="exemplo-conta">
          <strong>[100 + 7,5 + 28] × 121% = 164 pontos</strong><br />
          <small>Restam: 1000 − 164 = 836 pontos</small>
        </div>
      </div>
    {/if}
  </AreaRolavel>

  {#snippet rodape()}
    <div class="botoes">
      <button class="mbtn sec" onclick={convidar}>Compartilhar jogo</button>
      <button class="mbtn" onclick={props.aoFechar}>Entendi!</button>
    </div>
  {/snippet}
</Modal>

<style>
  .bloco {
    border-top: 1px solid var(--border);
    padding-top: 11px;
    margin-top: 11px;
  }
  .bloco:first-of-type {
    border-top: none;
    margin-top: 0;
    padding-top: 0;
  }
  .bloco-titulo {
    font-size: 0.65rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 7px;
  }
  p {
    color: var(--muted);
    line-height: 1.75;
    font-size: 0.86rem;
    margin-bottom: 9px;
  }
  strong {
    color: var(--text);
  }
  .azul {
    color: #60a5fa;
    font-weight: 600;
  }
  .escala {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
  }
  .escala-ponto {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }
  .escala-letra {
    font-family: 'DM Sans', sans-serif;
    font-weight: 800;
    font-size: 1rem;
    color: var(--text);
    line-height: 1;
  }
  .escala-num {
    font-size: 0.68rem;
    color: var(--muted);
  }
  .trilha {
    flex: 1;
    height: 3px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
  }
  .preenchimento {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    border-radius: 2px;
  }
  .caixa-onda {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 8px 8px 4px;
    margin-top: 8px;
  }
  .svg {
    width: 100%;
    display: block;
  }
  .par {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 10px;
  }
  .exemplo {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 7px 6px 5px;
  }
  .exemplo-rotulo {
    font-size: 0.64rem;
    color: var(--muted);
    text-align: center;
    margin-bottom: 4px;
  }
  .dicas {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 6px;
  }
  .dicas li {
    font-size: 0.82rem;
    color: var(--muted);
    padding-left: 16px;
    position: relative;
    line-height: 1.55;
  }
  .dicas li::before {
    content: '›';
    position: absolute;
    left: 2px;
    color: var(--accent);
    font-size: 1rem;
    line-height: 1.3;
  }
  .formula {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px;
    margin: 8px 0;
    text-align: center;
    font-family: 'Space Grotesk', monospace;
  }
  .exemplo-conta {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px;
    margin: 6px 0;
    font-family: 'Space Grotesk', monospace;
    font-size: 0.8rem;
    text-align: center;
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
