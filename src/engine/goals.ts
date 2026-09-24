import { GOALS, type Goal, type Progress } from './data/goals';
import { addLog, changeRep } from './helpers';
import type { GameState } from './types';

export function isDone(p: Progress): boolean {
  return p.cur >= p.target;
}

/** Objetivos ainda não cumpridos, na ordem de progressão. */
export function pendingGoals(s: GameState): Goal[] {
  return GOALS.filter((g) => s.achievements[g.id] === undefined);
}

/**
 * Confere os objetivos: cada um cumprido vira conquista (com o dia), dá a reputação
 * prometida e entra no diário. Devolve os ids conquistados agora.
 */
export function checkGoals(s: GameState): string[] {
  const won: string[] = [];
  for (const g of pendingGoals(s)) {
    if (!isDone(g.progress(s))) continue;
    s.achievements[g.id] = s.day;
    changeRep(s, g.rep);
    addLog(s, `Conquista: ${g.title}. Reputação +${g.rep}.`, 'good');
    won.push(g.id);
  }
  return won;
}
