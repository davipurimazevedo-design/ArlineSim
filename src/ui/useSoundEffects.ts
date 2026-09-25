// Liga os sons aos acontecimentos do jogo, observando as mudanças do store.
import { useEffect } from 'react';
import { useGame } from '../store/gameStore';
import { play, unlockAudio } from './sound';

/** marcos de caixa que tocam o som de dinheiro ao serem cruzados para cima */
const CASH_MARKS = [10e6, 25e6, 50e6, 100e6, 250e6, 500e6, 1e9, 2e9, 5e9];

export function useSoundEffects(): void {
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    const unsub = useGame.subscribe((st, prev) => {
      const g = st.game;
      const p = prev.game;
      if (!g || !p || g === p) {
        if (st.result && !prev.result) play('choose');
        return;
      }
      // outro jogo carregado ou fundado: nada a comparar
      if (g.name !== p.name || g.day < p.day) return;
      if (g.gameOver && !p.gameOver) return play('bankrupt');
      if (g.pendingEvent && !p.pendingEvent) play('event');
      if (st.result && !prev.result) play('choose');
      if (Object.keys(g.achievements).length > Object.keys(p.achievements).length) play('achievement');
      if (g.routes.length > p.routes.length) play('route');
      if (g.log !== p.log && g.log[0] !== p.log[0] && g.log[0]?.text.startsWith('Pane no')) play('pane');
      if (CASH_MARKS.some((m) => p.cash < m && g.cash >= m)) play('cash');
    });

    return () => {
      unsub();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);
}
