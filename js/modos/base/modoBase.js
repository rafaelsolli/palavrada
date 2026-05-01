// Interface comum que os dois modos implementam.
// Não é usada diretamente - serve como contrato de referência.
export class ModoBase {
  iniciar()                     { throw new Error('não implementado'); }
  aoTecla(k)                    { throw new Error('não implementado'); }
  aoPreencher(tentativa, partida) { /* opcional */ }
  aoEncerrar(ganhou, partida)   { throw new Error('não implementado'); }
  atualizarBadge()              { throw new Error('não implementado'); }
}
