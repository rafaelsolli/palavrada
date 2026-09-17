import { DIARIO, LIVRE, LIVRISSIMO } from './definicoes';
import { rotuloDesafio, type ModoDefinicao } from './tipos';

/**
 * Decide qual modo abrir a partir da URL.
 *
 * Substitui o encadeado de `if` aninhados do bootstrap legado, que misturava
 * leitura de URL, regras de desbloqueio, `history.replaceState` e `setTimeout`
 * de toast no mesmo bloco. Aqui a decisão é uma função pura: quem chama aplica
 * o resultado.
 */

export interface DesafioPedido {
  modo: ModoDefinicao;
  indice: number;
}

export interface Resolucao {
  modo: ModoDefinicao;
  indice: number;
  /** Mensagem a mostrar quando a URL pediu algo indisponível. */
  aviso: string | null;
  /** A URL pedia outro desafio: limpar a query com `history.replaceState`. */
  redirecionado: boolean;
}

/** Lê `?w=N` ou `?x=N`. Não valida o limite superior — a lista ainda não foi carregada. */
export function lerDesafioDaUrl(busca: string): DesafioPedido | null {
  const params = new URLSearchParams(busca);
  for (const modo of [LIVRISSIMO, LIVRE]) {
    const cru = params.get(modo.param!);
    if (cru === null) continue;
    const n = Number.parseInt(cru, 10);
    if (Number.isInteger(n) && n >= 1) return { modo, indice: n - 1 };
  }
  return null;
}

export interface ContextoResolucao {
  /** Número do dia, usado como índice do Desafio Diário. */
  dia: number;
  /** Tamanho da lista do modo pedido, para validar o índice. */
  totalDoModo: number;
  /** Progresso no Modo Livre, que é o que destrava o Livríssimo. */
  totalLivre: number;
  jogadosLivre: number;
  /** Se o desafio pedido já foi concluído antes. */
  jaJogado: boolean;
}

function paraODiario(ctx: ContextoResolucao, aviso: string | null): Resolucao {
  return { modo: DIARIO, indice: ctx.dia, aviso, redirecionado: true };
}

export function resolverModo(pedido: DesafioPedido | null, ctx: ContextoResolucao): Resolucao {
  if (!pedido) {
    return { modo: DIARIO, indice: ctx.dia, aviso: null, redirecionado: false };
  }

  // Índice fora da lista: cai no diário em silêncio, como no site atual.
  if (pedido.indice >= ctx.totalDoModo) return paraODiario(ctx, null);

  if (pedido.modo.id === LIVRISSIMO.id && ctx.jogadosLivre < ctx.totalLivre) {
    return paraODiario(ctx, `Complete o ${LIVRE.icone} ${LIVRE.nome} primeiro!`);
  }

  if (ctx.jaJogado) {
    return paraODiario(ctx, `${rotuloDesafio(pedido.modo, pedido.indice)} já foi jogado!`);
  }

  return { modo: pedido.modo, indice: pedido.indice, aviso: null, redirecionado: false };
}
