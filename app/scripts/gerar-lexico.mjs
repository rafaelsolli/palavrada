/**
 * Extrai os dicionários dos módulos JS legados para arquivos de texto simples.
 *
 * A ORDEM importa: `?w=N` indexa as curadas e `?x=N` indexa a lista do
 * Livríssimo, então qualquer reordenação quebraria links já compartilhados por
 * jogadores. O teste de léxico fixa essa ordem por checksum.
 *
 * Uso: node scripts/gerar-lexico.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raizLegado = resolve(aqui, '../../js/dados');
const destino = resolve(aqui, '../public/lexico');

const { PALAVRAS } = await import(`${raizLegado}/palavras.js`);
const { VALIDAS_SET } = await import(`${raizLegado}/validador.js`);

const curadas = [...PALAVRAS];
const validas = [...VALIDAS_SET];
// Mesma derivação do legado (js/dados/palavrasLivrissimo.js): as válidas que
// não são curadas, ordenadas.
const curadasSet = new Set(curadas.map((p) => p.toUpperCase()));
const livrissimo = validas.filter((w) => !curadasSet.has(w)).sort();

mkdirSync(destino, { recursive: true });

for (const [nome, lista] of [
  ['curadas', curadas],
  ['validas', validas],
]) {
  const conteudo = lista.join('\n') + '\n';
  writeFileSync(`${destino}/${nome}.txt`, conteudo);
  const sha = createHash('sha256').update(conteudo).digest('hex');
  console.log(`${nome.padEnd(10)} ${String(lista.length).padStart(6)} palavras  sha256=${sha}`);
}

const shaLivrissimo = createHash('sha256').update(livrissimo.join('\n') + '\n').digest('hex');
console.log(`${'livríssimo'.padEnd(10)} ${String(livrissimo.length).padStart(6)} palavras  sha256=${shaLivrissimo}  (derivado)`);
console.log(`validas ordenadas? ${[...validas].sort().join() === validas.join()}`);
