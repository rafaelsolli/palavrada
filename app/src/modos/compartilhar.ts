import { faixaDelta, type FaixaDelta } from '../nucleo/ondas';
import { MAX_TENTATIVAS, type Tentativa } from '../nucleo/partida';
import { linkDoDesafio, rotulo, numeroExibido, type ModoDefinicao } from './tipos';

/**
 * Texto de compartilhamento.
 *
 * Os três modos tinham a mesma função copiada, e cada cópia repetia os limiares
 * 10/20/40 na mão. Um deles gerava `?l=` enquanto o jogo lia `?x=`, então o link
 * do Livríssimo abria o Desafio Diário para quem recebesse. Agora o link vem do
 * mesmo campo `param` que a leitura da URL usa.
 */

const EMOJI: Record<FaixaDelta, string> = {
  otimo: '🟢',
  bom: '🟡',
  medio: '🟠',
  ruim: '🔴',
};

const VAZIO = '⚫';

/** Uma bolinha por palpite, completando com vazias até 6. */
export function bolinhas(tentativas: readonly Tentativa[]): string[] {
  const usadas = tentativas.map((t) => EMOJI[faixaDelta(t.delta, t.ganhou)]);
  const restantes = Array(Math.max(0, MAX_TENTATIVAS - tentativas.length)).fill(VAZIO);
  return [...usadas, ...restantes];
}

export interface DadosCompartilhamento {
  modo: ModoDefinicao;
  indice: number;
  tentativas: readonly Tentativa[];
  ganhou: boolean;
  /** Incluída apenas quando "Exibir pontuação" está ligada. */
  pontuacao: number | null;
  /** Origem + caminho, sem query. */
  base: string;
}

export function textoCompartilhamento(d: DadosCompartilhamento): string {
  const titulo = `*${rotulo(d.modo)}* #${numeroExibido(d.modo, d.indice)}`;
  const verbo = d.ganhou ? 'Venci' : 'Perdi';
  const resultado = d.pontuacao === null ? `${verbo}!` : `${verbo} com ${d.pontuacao} pontos!`;
  return [
    titulo,
    resultado,
    bolinhas(d.tentativas).join(' '),
    `Sua vez: ${linkDoDesafio(d.modo, d.indice, d.base)}`,
  ].join('\n');
}

/** Texto do botão "Compartilhar jogo" no modal de ajuda. */
export function textoConvite(base: string): string {
  return (
    'Conheça o PalavRada! 🌊 Jogo de palavras onde você tenta adivinhar uma ' +
    `palavra de 5 letras combinando ondas.\n${base}`
  );
}

/** Texto do botão "Compartilhar" no seletor de desafios. */
export function textoProgresso(
  jogados: readonly { ganhou: boolean }[],
  total: number,
  base: string,
): string {
  const ganhos = jogados.filter((j) => j.ganhou).length;
  const perdidos = jogados.length - ganhos;
  const pendentes = total - jogados.length;
  const pct = (n: number) => ((n * 100) / total).toFixed(2).replace('.', ',');
  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

  return [
    `Estou com ${pct(jogados.length)}% do 🎲 Modo Livre completo!`,
    `⚫ ${plural(pendentes, 'pendente', 'pendentes')}`,
    `🟢 ${plural(ganhos, 'certo', 'certos')}`,
    `🔴 ${plural(perdidos, 'errado', 'errados')}`,
    `Sua vez! ${base}`,
  ].join('\n');
}
