import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  carregarLexico,
  carregarLista,
  derivarLivrissimo,
  limparCacheLexico,
  type Buscador,
} from './lexico';

const arquivos: Record<string, string> = {
  curadas: readFileSync('public/lexico/curadas.txt', 'utf8'),
  validas: readFileSync('public/lexico/validas.txt', 'utf8'),
};

/** Serve os arquivos reais e conta quantas requisições foram feitas. */
function buscadorReal() {
  const pedidos: string[] = [];
  const buscar: Buscador = async (url) => {
    pedidos.push(url);
    const nome = url.split('/').pop()!.replace('.txt', '');
    const texto = arquivos[nome];
    return { ok: texto !== undefined, text: async () => texto ?? '' };
  };
  return { buscar, pedidos };
}

beforeEach(limparCacheLexico);

describe('arquivos de léxico', () => {
  // Estes checksums fixam a ORDEM das listas. `?w=N` e `?x=N` são índices
  // nelas, então reordenar quebraria links já compartilhados por jogadores.
  const sha = (texto: string) => createHash('sha256').update(texto).digest('hex');

  it('as curadas mantêm conteúdo e ordem', () => {
    expect(sha(arquivos.curadas!)).toBe(
      '7d9b3951908854056c528fe33ab28cc4db6e4942c7e5fb2a70562770d05d2417',
    );
  });

  it('as válidas mantêm conteúdo e ordem', () => {
    expect(sha(arquivos.validas!)).toBe(
      '733f818cd22f9aa4010c21ea16db5fb7b0cd96dc3718acc668df72328201b7f4',
    );
  });

  it('a lista derivada do Livríssimo mantém conteúdo e ordem', async () => {
    const { buscar } = buscadorReal();
    const [curadas, validas] = await Promise.all([
      carregarLista('curadas', buscar),
      carregarLista('validas', buscar),
    ]);
    const livrissimo = derivarLivrissimo(curadas, validas);
    expect(livrissimo).toHaveLength(9147);
    expect(sha(livrissimo.join('\n') + '\n')).toBe(
      '94c836a173b805360e57e94be1a00371b752402b237738e4aefe992e5732dbab',
    );
  });
});

describe('carregarLista', () => {
  it('lê e limpa a lista', async () => {
    const { buscar } = buscadorReal();
    const curadas = await carregarLista('curadas', buscar);
    expect(curadas).toHaveLength(1442);
    expect(curadas.every((p) => p.length === 5)).toBe(true);
  });

  it('busca uma vez só e reaproveita', async () => {
    const { buscar, pedidos } = buscadorReal();
    await Promise.all([
      carregarLista('validas', buscar),
      carregarLista('validas', buscar),
      carregarLista('validas', buscar),
    ]);
    expect(pedidos).toHaveLength(1);
  });

  it('não cacheia a falha, permitindo nova tentativa', async () => {
    let falhar = true;
    const buscar: Buscador = async () =>
      falhar ? { ok: false, text: async () => '' } : { ok: true, text: async () => 'VERSO\n' };

    await expect(carregarLista('curadas', buscar)).rejects.toThrow(/dicionário/);
    falhar = false;
    await expect(carregarLista('curadas', buscar)).resolves.toEqual(['VERSO']);
  });
});

describe('carregarLexico', () => {
  it('modo curadas indexa a lista curada', async () => {
    const { buscar } = buscadorReal();
    const lexico = await carregarLexico('curadas', buscar);
    expect(lexico.palavras).toHaveLength(1442);
  });

  it('modo livríssimo indexa a lista derivada', async () => {
    const { buscar } = buscadorReal();
    const lexico = await carregarLexico('livrissimo', buscar);
    expect(lexico.palavras).toHaveLength(9147);
    // As duas listas não se sobrepõem.
    const curadas = new Set(await carregarLista('curadas', buscar));
    expect(lexico.palavras.some((p) => curadas.has(p))).toBe(false);
  });

  it('valida palpites contra o dicionário inteiro, não só o do modo', async () => {
    const { buscar } = buscadorReal();
    const lexico = await carregarLexico('curadas', buscar);
    expect(lexico.ehValida('VERSO')).toBe(true);
    expect(lexico.ehValida('verso')).toBe(true); // normaliza a entrada
    expect(lexico.ehValida('XPTOZ')).toBe(false);
  });

  it('os dois modos custam as mesmas duas requisições', async () => {
    const { buscar, pedidos } = buscadorReal();
    await carregarLexico('curadas', buscar);
    await carregarLexico('livrissimo', buscar);
    expect(pedidos).toHaveLength(2);
  });

  describe('autocomplete', () => {
    it('sugere pela primeira curada que casa com as posições preenchidas', async () => {
      const { buscar } = buscadorReal();
      const lexico = await carregarLexico('curadas', buscar);
      const sugestao = lexico.sugerir(['V', '', '', '', '']);
      expect(sugestao).not.toBeNull();
      expect(sugestao![0]).toBe('V');
    });

    it('sem letras não sugere nada', async () => {
      const { buscar } = buscadorReal();
      const lexico = await carregarLexico('curadas', buscar);
      expect(lexico.sugerir(['', '', '', '', ''])).toBeNull();
    });

    it('sem casamento possível devolve null', async () => {
      const { buscar } = buscadorReal();
      const lexico = await carregarLexico('curadas', buscar);
      expect(lexico.sugerir(['Q', 'Q', 'Q', 'Q', 'Q'])).toBeNull();
    });
  });
});
