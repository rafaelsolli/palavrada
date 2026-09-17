/**
 * Confere que o bundle publicado é o de navegador.
 *
 * Existe porque um `resolve.conditions` mal configurado fez o build de produção
 * embutir o runtime de servidor do Svelte: a página subia, baixava o JS e ficava
 * em branco, sem nada nos testes acusando — o jsdom usava outra configuração.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist/assets/', import.meta.url).pathname;

const PROIBIDO = [
  'is not available on the server',
  'lifecycle_function_unavailable',
];

const scripts = readdirSync(DIST).filter((f) => f.endsWith('.js'));
if (!scripts.length) {
  console.error('✗ nenhum script encontrado em dist/assets/');
  process.exit(1);
}

let falhou = false;
for (const nome of scripts) {
  const conteudo = readFileSync(join(DIST, nome), 'utf8');
  for (const marca of PROIBIDO) {
    if (conteudo.includes(marca)) {
      console.error(`✗ ${nome} contém a build de servidor do Svelte ("${marca}")`);
      falhou = true;
    }
  }
}

if (falhou) {
  console.error('\nO bundle renderizaria uma página em branco. Confira resolve.conditions.');
  process.exit(1);
}

console.log(`✓ ${scripts.length} script(s) conferidos: build de navegador`);
