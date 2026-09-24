// Game loop: requestAnimationFrame acumulando tempo real; um tick a cada 1000/speed ms,
// no máximo 8 por frame. Pausa com a aba oculta, com carta pendente ou de resultado aberta,
// com o resumo offline aberto, com uma confirmação aberta e em fim de jogo.
import { useGame } from './gameStore';

const MAX_TICKS_PER_FRAME = 8;

export function startLoop(): () => void {
  let acc = 0;
  let last = performance.now();
  let raf = 0;

  const frame = (now: number) => {
    const st = useGame.getState();
    const g = st.game;
    const dt = now - last;
    last = now;
    const running =
      g &&
      !g.gameOver &&
      !g.pendingEvent &&
      !st.result &&
      !st.offline &&
      !st.confirm &&
      g.speed > 0 &&
      !document.hidden;
    if (running) {
      acc += dt;
      const step = 1000 / g.speed;
      const n = Math.min(MAX_TICKS_PER_FRAME, Math.floor(acc / step));
      if (n > 0) {
        st.advance(n);
        // ao bater o limite, descarta o atraso em vez de acumular rajadas
        acc = n === MAX_TICKS_PER_FRAME ? 0 : acc - n * step;
      }
    } else {
      acc = 0;
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  const onVisibility = () => {
    const st = useGame.getState();
    if (!st.game) return;
    if (document.hidden) st.save();
    else st.catchUpNow();
  };
  const onPageHide = () => useGame.getState().save();

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);

  return () => {
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
  };
}
