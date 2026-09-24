import { tick } from './tick';
import type { GameState, OfflineSummary } from './types';

export const OFFLINE_MAX_DAYS = 60;
/** segundos reais por dia de jogo fora */
export const OFFLINE_SECONDS_PER_DAY = 60;

/**
 * Simula o tempo fora: cada minuto real vale um dia, até 60, sem eventos.
 * Não roda com carta de evento pendente (corrigido em relação ao protótipo).
 */
export function catchUp(s: GameState, now: number): OfflineSummary | null {
  if (s.gameOver || s.pendingEvent) return null;
  const elapsed = (now - (s.savedAt || now)) / 1000;
  const days = Math.min(OFFLINE_MAX_DAYS, Math.floor(elapsed / OFFLINE_SECONDS_PER_DAY));
  if (days < 1) return null;
  const cash0 = s.cash;
  const rep0 = s.reputation;
  const day0 = s.day;
  for (let i = 0; i < days && !s.gameOver; i++) tick(s, { noEvents: true });
  return { days: s.day - day0, profit: s.cash - cash0, rep: s.reputation - rep0, away: elapsed };
}
