import { describe, it, expect } from 'vitest';
import { numeroDoDia, segundosAteMeiaNoite, formatarContagem, formatarDuracao } from './tempo';

/** Réplica exata do cálculo do site legado (js/nucleo/ajudantes.js). */
function numeroDoDiaLegado(agoraMs: number): number {
  const origem = new Date(2024, 0, 1);
  const hoje = new Date(agoraMs);
  hoje.setHours(0, 0, 0, 0);
  return Math.floor((hoje.getTime() - origem.getTime()) / 86400000);
}

describe('numeroDoDia', () => {
  it('é 0 na origem', () => {
    const origem = new Date(2024, 0, 1, 12, 0, 0).getTime();
    expect(numeroDoDia(() => origem)).toBe(0);
  });

  it('avança um por dia local, independente da hora', () => {
    const manha = new Date(2024, 0, 2, 0, 1, 0).getTime();
    const noite = new Date(2024, 0, 2, 23, 59, 0).getTime();
    expect(numeroDoDia(() => manha)).toBe(1);
    expect(numeroDoDia(() => noite)).toBe(1);
  });

  it('bate com o cálculo legado em 1200 dias seguidos', () => {
    // Blindagem da virada: se este teste quebrar, todo jogador recebe uma
    // palavra do dia diferente da que receberia no site atual.
    const inicio = new Date(2024, 0, 1, 9, 30, 0).getTime();
    for (let i = 0; i < 1200; i++) {
      const instante = inicio + i * 86400000;
      expect(numeroDoDia(() => instante)).toBe(numeroDoDiaLegado(instante));
    }
  });
});

describe('segundosAteMeiaNoite', () => {
  it('conta o que falta para a virada local', () => {
    const t = new Date(2024, 5, 10, 23, 59, 30).getTime();
    expect(segundosAteMeiaNoite(() => t)).toBe(30);
  });

  it('é quase um dia inteiro logo depois da virada', () => {
    const t = new Date(2024, 5, 10, 0, 0, 0).getTime();
    expect(segundosAteMeiaNoite(() => t)).toBe(86400);
  });
});

describe('formatarContagem', () => {
  it('sempre usa H:MM:SS', () => {
    expect(formatarContagem(0)).toBe('00:00:00');
    expect(formatarContagem(59)).toBe('00:00:59');
    expect(formatarContagem(3661)).toBe('01:01:01');
    expect(formatarContagem(86399)).toBe('23:59:59');
  });

  it('não vaza negativo', () => {
    expect(formatarContagem(-5)).toBe('00:00:00');
  });
});

describe('formatarDuracao', () => {
  it('omite os minutos abaixo de 1 min', () => {
    expect(formatarDuracao(0)).toBe('0');
    expect(formatarDuracao(45)).toBe('45');
  });

  it('usa M:SS a partir de 1 min', () => {
    expect(formatarDuracao(60)).toBe('1:00');
    expect(formatarDuracao(125)).toBe('2:05');
    expect(formatarDuracao(900)).toBe('15:00');
  });
});
