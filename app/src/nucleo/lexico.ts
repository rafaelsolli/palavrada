import { normalizar, TAMANHO_PALAVRA } from './ondas';

/**
 * Dicionários do jogo, carregados como texto simples.
 *
 * No site atual os dois dicionários são módulos JS — 109 KB de literais
 * analisados de forma síncrona em toda visita, inclusive no Desafio Diário, que
 * nunca precisa da lista do Livríssimo. Pior: `palavrasLivrissimo.js` recalcula
 * a diferença entre 10.589 palavras a cada carregamento.
 *
 * Aqui são assets buscados uma vez, em paralelo, e cacheados pelo navegador. A
 * lista do Livríssimo continua sendo derivada, mas só quando esse modo é aberto.
 */

/** Listas publicadas em `public/lexico/`, geradas por `scripts/gerar-lexico.mjs`. */
export type Dicionario = 'curadas' | 'validas';

/** Qual lista um modo indexa. `?w=N` aponta para curadas, `?x=N` para livríssimo. */
export type FonteDePalavras = 'curadas' | 'livrissimo';

export interface Lexico {
  /** Lista que o modo indexa, na ordem que os links compartilhados assumem. */
  readonly palavras: readonly string[];
  /** Todas as palavras aceitas como palpite. */
  ehValida(palavra: string): boolean;
  /** Primeira curada que casa com as letras já digitadas (autocomplete). */
  sugerir(letras: readonly string[]): string | null;
}

export type Buscador = (url: string) => Promise<{ ok: boolean; text(): Promise<string> }>;

const cache = new Map<Dicionario, Promise<string[]>>();

function urlDe(nome: Dicionario): string {
  // BASE_URL é "/beta/" no staging e "/" em produção.
  return `${import.meta.env.BASE_URL}lexico/${nome}.txt`;
}

function analisar(texto: string): string[] {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length === TAMANHO_PALAVRA);
}

export function carregarLista(nome: Dicionario, buscar?: Buscador): Promise<string[]> {
  const emCache = cache.get(nome);
  if (emCache) return emCache;

  const buscarDe = buscar ?? ((url: string) => fetch(url));
  const promessa = buscarDe(urlDe(nome))
    .then((resposta) => {
      if (!resposta.ok) throw new Error(`Não foi possível carregar o dicionário "${nome}"`);
      return resposta.text();
    })
    .then(analisar)
    .catch((erro) => {
      // Sem cachear a falha: uma queda de rede não pode condenar a sessão inteira.
      cache.delete(nome);
      throw erro;
    });

  cache.set(nome, promessa);
  return promessa;
}

/** As válidas que não são curadas, ordenadas — mesma derivação do site atual. */
export function derivarLivrissimo(curadas: readonly string[], validas: readonly string[]): string[] {
  const curadasSet = new Set(curadas);
  return validas.filter((p) => !curadasSet.has(p)).sort();
}

/**
 * Carrega o que o modo precisa. Sempre traz as válidas (para validar palpites) e
 * as curadas (para o autocomplete), então os dois modos custam as mesmas duas
 * requisições — que o navegador cacheia.
 */
export async function carregarLexico(fonte: FonteDePalavras, buscar?: Buscador): Promise<Lexico> {
  const [curadas, validas] = await Promise.all([
    carregarLista('curadas', buscar),
    carregarLista('validas', buscar),
  ]);

  const validasSet = new Set(validas);
  const palavras = fonte === 'curadas' ? curadas : derivarLivrissimo(curadas, validas);

  return {
    palavras,
    ehValida: (palavra) => validasSet.has(normalizar(palavra)),
    sugerir(letras) {
      const postas = letras
        .map((letra, i) => (letra ? { i, letra } : null))
        .filter((x): x is { i: number; letra: string } => x !== null);
      if (!postas.length) return null;
      return curadas.find((p) => postas.every(({ i, letra }) => p[i] === letra)) ?? null;
    },
  };
}

/** Só para os testes: descarta o cache entre casos. */
export function limparCacheLexico(): void {
  cache.clear();
}
