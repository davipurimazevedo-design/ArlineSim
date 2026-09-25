// Registro do service worker (só no build) e aviso de versão nova.
// A versão nova fica esperando até o jogador tocar em "Atualizar": nada troca no meio da partida.
import { useGame } from './gameStore';

let waiting: ServiceWorker | null = null;
/** o jogador tocou em "Atualizar": só então a troca de service worker recarrega a página */
let updating = false;

function offer(sw: ServiceWorker | null): void {
  if (!sw || !navigator.serviceWorker.controller) return; // primeira instalação: nada a atualizar
  waiting = sw;
  useGame.setState({ updateReady: true });
}

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        offer(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          sw?.addEventListener('statechange', () => {
            if (sw.state === 'installed') offer(sw);
          });
        });
        // procura versão nova ao voltar para o jogo e a cada 30 minutos
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) void reg.update().catch(() => {});
        });
        setInterval(() => void reg.update().catch(() => {}), 30 * 60 * 1000);
      })
      .catch(() => {
        /* sem service worker o jogo funciona normalmente, só não abre offline */
      });
    // na primeira visita o service worker assume a página (clients.claim) sem nada a recarregar;
    // só recarrega quando a troca veio de um "Atualizar"
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!updating) return;
      updating = false;
      location.reload();
    });
  });
}

/** Salva o jogo e troca para a versão nova (a página recarrega em seguida). */
export function applyUpdate(): void {
  useGame.getState().save();
  updating = true;
  if (waiting) waiting.postMessage('SKIP_WAITING');
  else location.reload();
}
