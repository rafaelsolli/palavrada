import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { readFileSync } from 'node:fs';
import App from '../App.svelte';
import { palavraDoDia } from '../modos/palavraDoDia';
import { numeroDoDia } from '../nucleo/tempo';
import { carregarProgresso, carregarStats, chaveSessao, carregarSessao } from '../nucleo/armazenamento';

/**
 * Testes de ponta a ponta da interface, no jsdom.
 *
 * É a rede que substitui abrir o jogo no navegador a cada mudança: monta o app
 * de verdade, digita no teclado de verdade e confere o que aparece na tela.
 */

const curadas = readFileSync('public/lexico/curadas.txt', 'utf8').trim().split('\n');

/** Espera o jogo sair do estado de carregamento. */
async function abrirJogo() {
  render(App);
  await waitFor(() => expect(screen.getByLabelText('Letra 1')).toBeInTheDocument(), {
    timeout: 3000,
  });
}

/**
 * Clica nas teclas do teclado virtual, como um jogador faria.
 *
 * O `tick` é necessário porque o Svelte aplica as mudanças no microtask
 * seguinte: ler a grade logo após o clique pegaria o DOM anterior.
 */
async function teclar(...teclas: string[]) {
  for (const t of teclas) {
    const botoes = screen.getAllByRole('button', { name: t });
    botoes[botoes.length - 1]!.click();
    await tick();
  }
}

const digitar = (palavra: string) => teclar(...palavra.split(''));

function letras(): string[] {
  return [0, 1, 2, 3, 4].map((i) => screen.getByLabelText(`Letra ${i + 1}`).textContent!.trim());
}

describe('a partida diária', () => {
  it('abre com a grade vazia e o histórico ainda sem palpites', async () => {
    await abrirJogo();
    expect(letras()).toEqual(['', '', '', '', '']);
    expect(screen.getByText(/Desafio Diário · #/)).toBeInTheDocument();
  });

  it('digita, apaga e confirma um palpite', async () => {
    await abrirJogo();

    await digitar('MUNDO');
    expect(letras()).toEqual(['M', 'U', 'N', 'D', 'O']);

    await teclar('⌫');
    expect(letras()).toEqual(['M', 'U', 'N', 'D', '']);

    await digitar('O');
    await teclar('ENTER');

    await waitFor(() => expect(screen.getByText('MUNDO')).toBeInTheDocument());
    expect(letras()).toEqual(['', '', '', '', '']); // grade limpa para o próximo
  });

  it('recusa palavra fora do dicionário e avisa', async () => {
    await abrirJogo();
    await digitar('XXXXX');
    await teclar('ENTER');

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Palavra inválida!'));
    expect(letras()).toEqual(['X', 'X', 'X', 'X', 'X']); // o texto fica para corrigir
  });

  it('avisa quando o palpite está incompleto', async () => {
    await abrirJogo();
    await digitar('MUN');
    await teclar('ENTER');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Preencha todas as letras!'),
    );
  });

  it('ao vencer, revela a palavra e conta a sequência', async () => {
    await abrirJogo();
    const alvo = palavraDoDia(numeroDoDia(), curadas);

    await digitar(alvo);
    await teclar('ENTER');

    await waitFor(() => expect(carregarStats().vitorias).toBe(1));
    expect(letras().join('')).toBe(alvo);
    expect(carregarStats().sequencia).toBe(1);
    await waitFor(() => expect(screen.getByText(/vitória seguida/)).toBeInTheDocument());
  });

  it('perde depois de seis palpites e revela a resposta', async () => {
    await abrirJogo();
    const alvo = palavraDoDia(numeroDoDia(), curadas);
    const erradas = curadas.filter((p) => p !== alvo).slice(0, 6);

    for (const p of erradas) {
      await digitar(p);
      await teclar('ENTER');
    }

    await waitFor(() => expect(carregarStats().jogadas).toBe(1));
    expect(carregarStats().vitorias).toBe(0);
    expect(letras().join('')).toBe(alvo);
  });
});

describe('persistência', () => {
  it('um recarregamento devolve os palpites já dados', async () => {
    await abrirJogo();
    await digitar('MUNDO');
    await teclar('ENTER');
    await waitFor(() => expect(screen.getByText('MUNDO')).toBeInTheDocument());

    // Segunda visita: mesmo dia, mesma sessão.
    await abrirJogo();
    await waitFor(() => expect(screen.getByText('MUNDO')).toBeInTheDocument());
  });

  it('grava a sessão com o tempo acumulado', async () => {
    await abrirJogo();
    await digitar('MUNDO');
    await teclar('ENTER');

    await waitFor(() => {
      const sessao = carregarSessao(chaveSessao('diario', numeroDoDia()));
      expect(sessao?.tentativas).toHaveLength(1);
    });
    const sessao = carregarSessao(chaveSessao('diario', numeroDoDia()))!;
    expect(sessao.cronometroMs).toBeGreaterThanOrEqual(0);
    expect(sessao.jogadas).toHaveLength(1);
  });
});

describe('modo livre pela URL', () => {
  it('abre o desafio pedido e grava o progresso ao vencer', async () => {
    history.replaceState(null, '', '/?w=42');
    await abrirJogo();

    expect(screen.getByText(/Modo Livre · #42/)).toBeInTheDocument();

    await digitar(curadas[41]!);
    await teclar('ENTER');

    await waitFor(() =>
      expect(carregarProgresso('livre').jogados).toEqual([
        { id: 41, ganhou: true, tentativas: 1 },
      ]),
    );
    history.replaceState(null, '', '/');
  });

  it('desafio já jogado cai no diário com aviso', async () => {
    localStorage.setItem(
      'palavrada.livre',
      JSON.stringify({ jogados: [{ id: 41, ganhou: true, tentativas: 3 }] }),
    );
    history.replaceState(null, '', '/?w=42');
    await abrirJogo();

    expect(screen.getByText(/Desafio Diário · #/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('🎲 Modo Livre #42 já foi jogado!'),
    );
    history.replaceState(null, '', '/');
  });

  it('Livríssimo trancado manda terminar o Livre primeiro', async () => {
    history.replaceState(null, '', '/?x=5');
    await abrirJogo();

    expect(screen.getByText(/Desafio Diário · #/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Complete o 🎲 Modo Livre primeiro!'),
    );
    history.replaceState(null, '', '/');
  });
});
