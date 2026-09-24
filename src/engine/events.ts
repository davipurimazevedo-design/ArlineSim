import { EVENTS, EVENTS_BY_ID } from './data/events';
import { addLog, dayOfYear } from './helpers';
import { chance, randInt } from './rng';
import type { GameEvent, GameState, Side } from './types';

/** Um evento não se repete antes deste intervalo (dias). */
export const EVENT_COOLDOWN = 180;
/** Eventos sazonais saem no máximo uma vez por ano. */
export const SEASONAL_COOLDOWN = 300;
/** Chance de um sazonal elegível ter prioridade no sorteio. */
export const SEASONAL_PRIORITY = 0.6;
/** Intervalo entre cartas: de EVENT_GAP_MIN a EVENT_GAP_MIN + EVENT_GAP_SPREAD − 1 dias. */
export const EVENT_GAP_MIN = 30;
export const EVENT_GAP_SPREAD = 30;

function inWindow(e: GameEvent, day: number): boolean {
  if (!e.window) return true;
  const d = dayOfYear(day);
  return d >= e.window[0] && d <= e.window[1];
}

export function eligibleEvents(s: GameState): GameEvent[] {
  return EVENTS.filter((e) => {
    const cooldown = e.cooldown ?? (e.window ? SEASONAL_COOLDOWN : EVENT_COOLDOWN);
    return (
      inWindow(e, s.day) && (!e.need || e.need(s)) && s.day - (s.usedEvents[e.id] ?? -Infinity) > cooldown
    );
  });
}

/**
 * Sorteia um evento elegível e o marca como usado.
 * Dentro da janela, um sazonal tem 60% de chance de ser o escolhido.
 */
export function pickEvent(s: GameState): GameEvent | null {
  const pool = eligibleEvents(s);
  if (!pool.length) return null;
  const seasonal = pool.filter((e) => e.window);
  const from = seasonal.length && chance(s, SEASONAL_PRIORITY) ? seasonal : pool;
  const e = from[randInt(s, from.length)]!;
  s.usedEvents[e.id] = s.day;
  return e;
}

export function currentEvent(s: GameState): GameEvent | null {
  return (s.pendingEvent && EVENTS_BY_ID[s.pendingEvent]) || null;
}

/** Aplica a opção escolhida. Devolve o texto do desfecho, ou null se não há evento pendente. */
export function resolveEvent(s: GameState, side: Side): string | null {
  const e = currentEvent(s);
  if (!e) return null;
  const out = (side === 'L' ? e.L : e.R).apply(s);
  addLog(s, `${e.title}: ${out}`, 'event');
  s.pendingEvent = null;
  return out;
}
