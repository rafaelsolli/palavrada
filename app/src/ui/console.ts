import {
  exportarProgresso,
  restaurarBackup,
  temBackup,
} from '../nucleo/armazenamento';

/**
 * Pequena API de console, para quem quiser conferir ou resgatar o próprio
 * progresso enquanto o beta divide o armazenamento com o site publicado.
 *
 * Fica em `window.palavrada`, documentada por um aviso discreto no console.
 */
export function registrarConsole(): void {
  const api = {
    /** Copia tudo que o jogo guarda, para salvar em arquivo. */
    exportar: () => exportarProgresso(),
    /** Baixa um .json com o progresso. */
    baixar() {
      const conteudo = JSON.stringify(exportarProgresso(), null, 2);
      const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `palavrada-progresso-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      return 'baixando…';
    },
    /** Volta ao progresso de antes da primeira visita ao beta. */
    restaurar() {
      if (!temBackup()) return 'Não há backup guardado.';
      const n = restaurarBackup();
      return `${n} chave(s) restaurada(s). Recarregue a página.`;
    },
    temBackup,
  };

  Object.defineProperty(window, 'palavrada', { value: Object.freeze(api), configurable: true });

  console.info(
    '%cPalavRada beta%c\n' +
      'Seu progresso é o mesmo do site publicado. Antes da primeira alteração foi\n' +
      'guardado um backup automático.\n\n' +
      '  palavrada.baixar()    salva seu progresso em um arquivo\n' +
      '  palavrada.restaurar() volta ao estado anterior ao beta',
    'font-weight:bold;color:#60a5fa',
    'color:inherit',
  );
}
