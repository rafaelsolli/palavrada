import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { readFileSync } from 'node:fs';
import App from '../App.svelte';
import { palavraDoDia } from '../modos/palavraDoDia';
import { numeroDoDia } from '../nucleo/tempo';
import { carregarConfig, marcarTutorialVisto } from '../nucleo/armazenamento';
import { config } from '../config/estado.svelte';
import { CHAVES, DEFINICOES } from '../config/definicoes';

const curadas = readFileSync('public/lexico/curadas.txt', 'utf8').trim().split('\n');

async function abrirJogo({ tutorial = false } = {}) {
  if (!tutorial) marcarTutorialVisto();
  render(App);
  await waitFor(() => expect(screen.getByLabelText('Letra 1')).toBeInTheDocument(), {
    timeout: 3000,
  });
}

async function clicar(elemento: HTMLElement) {
  elemento.click();
  await tick();
}

async function teclar(...teclas: string[]) {
  for (const t of teclas) {
    const botoes = screen.getAllByRole('button', { name: t });
    botoes[botoes.length - 1]!.click();
    await tick();
  }
}

const digitar = (palavra: string) => teclar(...palavra.split(''));

/** O botão de ciclo de uma opção. O nome acessível é "<opção> <valor>". */
const botaoDaOpcao = (rotulo: string) =>
  screen.getByRole('button', { name: new RegExp(`^${rotulo}\\b`) });

describe('modal de configurações', () => {
  it('gera todas as opções a partir das definições', async () => {
    await abrirJogo();
    await clicar(screen.getByRole('button', { name: 'Configurações' }));

    // Se alguém acrescentar uma opção às definições, ela aparece aqui sozinha.
    // O nome do botão é "<opção> <valor>", daí a âncora no início.
    for (const chave of CHAVES) {
      expect(botaoDaOpcao(DEFINICOES[chave].rotulo)).toBeInTheDocument();
    }
    expect(CHAVES.length).toBe(12);
  });

  it('cicla um valor e só persiste ao aplicar', async () => {
    await abrirJogo();
    await clicar(screen.getByRole('button', { name: 'Configurações' }));

    const botao = botaoDaOpcao('Layout');
    expect(botao).toHaveTextContent('QWERTY');

    await clicar(botao);
    expect(botao).toHaveTextContent('Alfabético');
    expect(carregarConfig().teclado).toBe('qwerty'); // ainda não aplicado

    await clicar(screen.getByRole('button', { name: 'Aplicar' }));
    expect(carregarConfig().teclado).toBe('alfabetico');
  });

  it('fechar sem aplicar descarta a mudança', async () => {
    await abrirJogo();
    await clicar(screen.getByRole('button', { name: 'Configurações' }));
    await clicar(botaoDaOpcao('Layout'));
    await clicar(screen.getByRole('button', { name: 'Fechar' }));

    expect(carregarConfig().teclado).toBe('qwerty');

    await clicar(screen.getByRole('button', { name: 'Configurações' }));
    expect(botaoDaOpcao('Layout')).toHaveTextContent('QWERTY');
  });

  it('aplicar o layout alfabético reordena o teclado na hora', async () => {
    await abrirJogo();
    await clicar(screen.getByRole('button', { name: 'Configurações' }));
    await clicar(botaoDaOpcao('Layout'));
    await clicar(screen.getByRole('button', { name: 'Aplicar' }));
    await tick();

    // No layout alfabético a primeira linha começa em A; no QWERTY, em Q.
    const teclas = screen
      .getAllByRole('button')
      .map((b) => b.textContent?.trim())
      .filter((t) => t?.length === 1 && /[A-Z]/.test(t));
    expect(teclas[0]).toBe('A');
  });

  it('mostra a explicação de uma opção sob demanda', async () => {
    await abrirJogo();
    await clicar(screen.getByRole('button', { name: 'Configurações' }));

    const trecho = 'linhas de referência horizontais';
    expect(screen.queryByText(new RegExp(trecho))).not.toBeInTheDocument();

    const botoesAjuda = screen.getAllByRole('button', { name: /O que isso faz\?/ });
    await clicar(botoesAjuda[0]!);
    expect(screen.getByText(new RegExp(trecho))).toBeInTheDocument();
  });

  it('redefinir volta tudo ao padrão', async () => {
    await abrirJogo();
    await clicar(screen.getByRole('button', { name: 'Configurações' }));
    await clicar(botaoDaOpcao('Layout'));
    await clicar(botaoDaOpcao('Autocomplete'));
    await clicar(screen.getByRole('button', { name: 'Redefinir' }));

    expect(botaoDaOpcao('Layout')).toHaveTextContent('QWERTY');
    expect(botaoDaOpcao('Autocomplete')).toHaveTextContent('não');
  });
});

describe('modal de ajuda', () => {
  it('abre sozinho na primeira visita e não na segunda', async () => {
    await abrirJogo({ tutorial: true });
    await waitFor(() => expect(screen.getByText('Como Jogar 🌊')).toBeVisible(), { timeout: 2000 });
  });

  it('esconde a pontuação quando a opção está desligada', async () => {
    await abrirJogo();
    await clicar(screen.getByRole('button', { name: 'Como jogar' }));
    expect(screen.queryByText(/pra quem é competitivo/)).not.toBeInTheDocument();
  });

  it('mostra a pontuação quando a opção está ligada', async () => {
    localStorage.setItem('palavrada.config', JSON.stringify({ exibirPontuacao: true }));
    config.recarregar();
    await abrirJogo();
    await clicar(screen.getByRole('button', { name: 'Como jogar' }));
    expect(screen.getByText(/pra quem é competitivo/)).toBeInTheDocument();
  });
});

describe('modal de resultado', () => {
  it('aparece depois da vitória, com a palavra e o botão de ação', async () => {
    await abrirJogo();
    const alvo = palavraDoDia(numeroDoDia(), curadas);
    await digitar(alvo);
    await teclar('ENTER');

    await waitFor(() => expect(screen.getByText(/Você/)).toBeVisible(), { timeout: 4000 });
    expect(screen.getByText('venceu, e')).toBeInTheDocument();
    expect(screen.getByText(/Próxima palavra em/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compartilhar' })).toBeInTheDocument();
  });

  it('mostra o extrato só com a pontuação ligada', async () => {
    localStorage.setItem('palavrada.config', JSON.stringify({ exibirPontuacao: true }));
    config.recarregar();
    await abrirJogo();
    const alvo = palavraDoDia(numeroDoDia(), curadas);
    await digitar(alvo);
    await teclar('ENTER');

    await waitFor(() => expect(screen.getByText('Pontuação base')).toBeVisible(), {
      timeout: 4000,
    });
    expect(screen.getByText('+1000')).toBeInTheDocument();
    expect(screen.getByText(/Pontuação final/)).toBeInTheDocument();
  });

  it('reabrir uma partida encerrada mostra o resultado de novo', async () => {
    await abrirJogo();
    const alvo = palavraDoDia(numeroDoDia(), curadas);
    await digitar(alvo);
    await teclar('ENTER');
    await waitFor(() => expect(screen.getByText('venceu, e')).toBeVisible(), { timeout: 4000 });

    await abrirJogo();
    await waitFor(() => expect(screen.getByText('venceu, e')).toBeVisible(), { timeout: 4000 });
  });
});
