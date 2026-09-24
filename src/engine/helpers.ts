// Pequenas mutações compartilhadas por ações, eventos e tick.
import { clamp } from './formulas';
import type { GameState, ModType, Plane, Route, Tone } from './types';

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

/** Marca uma escolha para cadeias de eventos. */
export function setFlag(s: GameState, name: string, day = s.day): void {
  s.flags[name] = day;
}

/**
 * Evento de cadeia pronto: a marca existe, já passaram `after` dias
 * e o evento ainda não saiu desde que a marca foi feita.
 */
export function chainReady(s: GameState, flag: string, after: number, eventId: string): boolean {
  const f = s.flags[flag];
  return f !== undefined && s.day >= f + after && (s.usedEvents[eventId] ?? -Infinity) < f;
}

/** Dia do ano (1–365) de um dia de jogo; o dia 1 é 1º de janeiro. */
export function dayOfYear(day: number): number {
  return ((day - 1) % 365) + 1;
}

/** Tira a aeronave de qualquer rota em que esteja escalada. */
export function unassignPlane(s: GameState, planeId: string): void {
  for (const r of s.routes) r.planes = r.planes.filter((x) => x.id !== planeId);
}

/** Rota em que a aeronave está escalada. */
export function routeOfPlane(s: GameState, planeId: string): Route | undefined {
  return s.routes.find((r) => r.planes.some((x) => x.id === planeId));
}

/** Frequência total da rota (todas as aeronaves escaladas). */
export function routeFreq(r: Route): number {
  return r.planes.reduce((a, x) => a + x.freq, 0);
}
