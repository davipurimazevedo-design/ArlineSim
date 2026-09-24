// Pequenas mutações compartilhadas por ações, eventos e tick.
import { clamp } from './formulas';
import type { GameState, ModType, Plane, Tone } from './types';

export function addLog(s: GameState, text: string, tone: Tone): void {
  s.log.unshift({ day: s.day, text, tone });
}

export function addMod(s: GameState, type: ModType, value: number, days: number): void {
  s.mods.push({ type, value, until: s.day + days });
}

export function changeRep(s: GameState, delta: number): void {
  s.reputation = clamp(s.reputation + delta, 0, 100);
}

/** Soma n à condição de todas as aeronaves fora de manutenção. */
export function hitFleet(s: GameState, n: number): void {
  for (const p of s.fleet) if (!p.maint) p.condition = clamp(p.condition + n, 0, 100);
}

/** Custos de eventos escalam com o tamanho da empresa. */
export function scaleCost(s: GameState): number {
  return Math.max(1, s.fleet.length);
}

export function findPlane(s: GameState, id: string | null): Plane | undefined {
  return id ? s.fleet.find((p) => p.id === id) : undefined;
}

/** Tira a aeronave de qualquer rota em que esteja escalada. */
export function unassignPlane(s: GameState, planeId: string): void {
  for (const r of s.routes) if (r.planeId === planeId) r.planeId = null;
}
