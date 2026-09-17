/**
 * Compartilhar texto, com as quedas de braço habituais entre navegadores.
 *
 * No site atual esta lógica estava copiada em quatro lugares, e em três deles a
 * falha do `navigator.share` não era tratada — cancelar a folha de
 * compartilhamento no iOS deixava o usuário sem nada.
 */
export async function compartilhar(texto: string): Promise<'compartilhado' | 'copiado' | 'falhou'> {
  if (navigator.share) {
    try {
      await navigator.share({ text: texto });
      return 'compartilhado';
    } catch (erro) {
      // Cancelar não é erro: não vale cair para a área de transferência.
      if (erro instanceof DOMException && erro.name === 'AbortError') return 'compartilhado';
    }
  }
  return (await copiar(texto)) ? 'copiado' : 'falhou';
}

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return copiarPorCampoOculto(texto);
  }
}

/** Último recurso para navegadores sem acesso à área de transferência. */
function copiarPorCampoOculto(texto: string): boolean {
  try {
    const campo = document.createElement('textarea');
    campo.value = texto;
    campo.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(campo);
    campo.select();
    const deuCerto = document.execCommand('copy');
    document.body.removeChild(campo);
    return deuCerto;
  } catch {
    return false;
  }
}
