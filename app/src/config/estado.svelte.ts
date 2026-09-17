import { carregarConfig, salvarConfig } from '../nucleo/armazenamento';
import { proximoValor, type ChaveConfig, type Config } from './definicoes';

/**
 * Configuração viva da sessão.
 *
 * No site atual, mudar uma opção disparava `aoMudarConfig`, que enumerava à mão
 * qual componente redesenhar para cada chave — e esquecer uma entrada ali
 * significava uma opção que só fazia efeito depois de recarregar a página. Aqui
 * a interface deriva deste estado, então o efeito é automático.
 */
class EstadoConfig {
  atual = $state<Config>(carregarConfig());

  /** Alterações ainda não aplicadas, enquanto o modal está aberto. */
  rascunho = $state<Partial<Config>>({});

  /** Valor a exibir: o do rascunho, se houver, senão o vigente. */
  valorExibido<K extends ChaveConfig>(chave: K): Config[K] {
    return (this.rascunho[chave] ?? this.atual[chave]) as Config[K];
  }

  foiAlterado(chave: ChaveConfig): boolean {
    return chave in this.rascunho && this.rascunho[chave] !== this.atual[chave];
  }

  /** Avança a opção para o próximo valor do ciclo, sem aplicar ainda. */
  ciclar(chave: ChaveConfig): void {
    this.rascunho = {
      ...this.rascunho,
      [chave]: proximoValor(chave, this.valorExibido(chave)),
    };
  }

  definirRascunho(parcial: Partial<Config>): void {
    this.rascunho = { ...this.rascunho, ...parcial };
  }

  descartarRascunho(): void {
    this.rascunho = {};
  }

  /** Aplica o rascunho e persiste. Devolve as chaves que de fato mudaram. */
  aplicar(): ChaveConfig[] {
    const mudadas = (Object.keys(this.rascunho) as ChaveConfig[]).filter((k) =>
      this.foiAlterado(k),
    );
    if (mudadas.length) {
      this.atual = { ...this.atual, ...this.rascunho };
      salvarConfig(this.atual);
    }
    this.rascunho = {};
    return mudadas;
  }
}

export const config = new EstadoConfig();

/** Leitura simples para quem não precisa de reatividade (o núcleo, por exemplo). */
export const lerConfig = (): Config => config.atual;
