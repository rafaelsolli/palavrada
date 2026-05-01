import { PALAVRAS } from './dados/palavras.js';
import { idxUrlPalavra } from './nucleo/ajudantes.js';
import { ModoDesafioDiario } from './modos/diario/modoDesafioDiario.js';
import { ModoLivre } from './modos/livre/modoLivre.js';
import { ModalSeletor, carregarProgresso } from './modos/livre/modalSeletor.js';
import { toast } from './modos/base/toast.js';
import { carregarConfig } from './configuracoes.js';
import { registrarModalConfig } from './modos/base/modalConfig.js';
import { redesenharPrincipal } from './nucleo/canvas.js';

// ── Migração de localStorage (chaves antigas → novas) ──────────────────────
function migrarLocalStorage() {
  // Stats do diário: "pr_s" → "palavrada.diario"
  const statsAntigos = localStorage.getItem('pr_s');
  if (statsAntigos && !localStorage.getItem('palavrada.diario')) {
    try {
      const s = JSON.parse(statsAntigos);
      const novos = {
        jogadas:          s.p  ?? 0,
        vitorias:         s.w  ?? 0,
        sequencia:        s.streak ?? s.s ?? 0,
        ultimoDiaVencido: s.lastWonDay ?? -1,
      };
      localStorage.setItem('palavrada.diario', JSON.stringify(novos));
    } catch {}
    localStorage.removeItem('pr_s');
  }

  // Progresso livre: "pr_free_h" → "palavrada.livre"
  const progressoAntigo = localStorage.getItem('pr_free_h');
  if (progressoAntigo && !localStorage.getItem('palavrada.livre')) {
    try {
      const d = JSON.parse(progressoAntigo);
      if (d?.played && Array.isArray(d.played)) {
        const novo = { jogados: d.played.map(p => ({ id: p.id, ganhou: p.won, tentativas: p.tries })) };
        localStorage.setItem('palavrada.livre', JSON.stringify(novo));
      }
    } catch {}
    localStorage.removeItem('pr_free_h');
  }

  // Remove chaves mortas que nunca foram usadas
  localStorage.removeItem('pr_free');
  localStorage.removeItem('pr_free_completed');
}

// ── Tutorial / Ajuda ────────────────────────────────────────────────────────
function registrarModalAjuda() {
  const modal  = document.getElementById('modalAjuda');
  const scroll = document.getElementById('ajudaScroll');
  const fade   = document.getElementById('ajudaFade');

  function atualizarFade() {
    fade.style.opacity = scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 4 ? '0' : '1';
  }
  scroll.addEventListener('scroll', atualizarFade);

  function abrir() {
    modal.classList.add('aberto');
    scroll.scrollTop = 0;
    setTimeout(atualizarFade, 50);
  }

  document.getElementById('btnAjuda').addEventListener('click', abrir);
  document.getElementById('fecharAjuda').addEventListener('click', () => modal.classList.remove('aberto'));
  document.getElementById('btnEntendidoAjuda').addEventListener('click', () => modal.classList.remove('aberto'));
  document.getElementById('btnCompartilharJogo').addEventListener('click', () => {
    const texto = 'Conheça o PalavRada! 🌊 Jogo de palavras onde você tenta adivinhar uma palavra de 5 letras combinando ondas.\nhttps://palavrada.com.br/';
    if (navigator.share) navigator.share({ text: texto });
    else navigator.clipboard.writeText(texto).then(() => toast('Copiado!'));
  });
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('aberto'); });
}

function verificarTutorial() {
  if (!localStorage.getItem('palavrada.tutorial')) {
    localStorage.setItem('palavrada.tutorial', '1');
    setTimeout(() => {
      document.getElementById('modalAjuda').classList.add('aberto');
      const scroll = document.getElementById('ajudaScroll');
      const fade   = document.getElementById('ajudaFade');
      scroll.scrollTop = 0;
      setTimeout(() => {
        fade.style.opacity = scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 4 ? '0' : '1';
      }, 50);
    }, 500);
  }
}

// ── Resize ──────────────────────────────────────────────────────────────────
function registrarResize(modoAtivo) {
  window.addEventListener('resize', () => {
    if (modoAtivo._partida) redesenharPrincipal(modoAtivo._partida);
    document.querySelectorAll('.h-mini').forEach(mini => {
      const idx = parseInt(mini.dataset.idx);
      if (!isNaN(idx) && modoAtivo._partida?.tentativas[idx]) {
        import('./nucleo/canvas.js').then(({ redesenharMini }) => {
          redesenharMini(mini, modoAtivo._partida.tentativas[idx], modoAtivo._partida.valoresAlvo);
        });
      }
    });
  });
}

// ── Callback de mudança de configuração ─────────────────────────────────────
function aoMudarConfig(chave, valor) {
  const p = modoAtivo?._partida;
  if (!p) return;

  const canvasSettings = ['regraHorizontal', 'eixoY', 'bolinhas', 'letrasNoGrafico', 'maxPalpites'];
  if (canvasSettings.includes(chave)) redesenharPrincipal(p);
  if (chave === 'maxPalpites') modoAtivo._historico.reconstruir(p);
  if (chave === 'alvoNosPalpites') modoAtivo._historico.redesenharMinis(p);
  if (chave === 'teclado') modoAtivo._teclado.reconstruir();
  if (chave === 'autocomplete') modoAtivo._grade.atualizar(p);
  if (chave === 'fixarLetrasAcertadas') {
    if (valor) p.fixar();
    else p.letrasFixas = Array(5).fill(false);
    modoAtivo._grade.atualizar(p);
  }
}

// ── Bootstrap ───────────────────────────────────────────────────────────────
migrarLocalStorage();
carregarConfig();
registrarModalConfig(aoMudarConfig);
registrarModalAjuda();

const idxUrl = idxUrlPalavra(PALAVRAS.length);
let modoAtivo;

function irParaDiario() {
  window.location.href = window.location.pathname;
}

function abrirSeletorLivre() {
  const seletor = new ModalSeletor(id => { window.location.href = '?w=' + (id + 1); });
  seletor.abrir();
}

if (idxUrl !== null) {
  const progresso = carregarProgresso();
  const jaJogado = progresso.jogados.find(j => j.id === idxUrl);
  if (jaJogado) {
    history.replaceState(null, '', window.location.pathname);
    modoAtivo = new ModoDesafioDiario(abrirSeletorLivre);
    modoAtivo.iniciar();
    setTimeout(() => toast(`Desafio #${idxUrl + 1} já foi jogado!`), 300);
  } else {
    modoAtivo = new ModoLivre(idxUrl, irParaDiario);
    modoAtivo.iniciar();
  }
} else {
  modoAtivo = new ModoDesafioDiario(abrirSeletorLivre);
  modoAtivo.iniciar();
}

registrarResize(modoAtivo);
verificarTutorial();
