# PalavRada 🌊

Jogo de palavras com ondas, em <https://palavrada.com.br>.

Cada letra vale sua posição no alfabeto (A = 0 … Z = 25), a palavra vira uma
curva, e o palpite se aproxima do alvo pela distância entre as duas ondas.

## Rodando

```sh
cd app
npm install
npm run dev
```

`?debug=1` mostra a palavra-alvo em cinza na grade.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção, com verificação do bundle |
| `npm test` | testes de unidade e interface (Vitest, jsdom) |
| `npm run check` | tipos e componentes (svelte-check) |
| `npm run test:e2e` | testes em navegador (Playwright) |
| `npm run gerar-lexico` | regenera os dicionários em `public/lexico/` |

## Organização

```
app/src/
  nucleo/     regras do jogo em TypeScript puro, sem DOM
  config/     definição das opções — fonte única de verdade
  modos/      descritores dos modos e o controlador da partida
  ui/         componentes Svelte
  teste/      testes de interface e de compatibilidade de dados
```

Acrescentar uma opção ao jogo é uma entrada em `config/definicoes.ts`: o modal de
configurações, os tipos e o multiplicador de agravantes derivam dela.

## Cuidados

Três coisas quebram silenciosamente se mudarem, e têm testes que as travam:

- **A palavra do dia** (`modos/palavraDoDia.ts`) — cada operação do hash importa.
- **A ordem dos dicionários** (`public/lexico/`) — `?w=N` e `?x=N` são índices
  nessas listas, e links já compartilhados dependem dela. Travada por checksum.
- **O formato do `localStorage`** (`nucleo/armazenamento.ts`) — jogadores têm
  dados gravados pela versão anterior à reescrita. As fixtures em
  `teste/fixtures/legado.json` foram geradas rodando aquela versão.
