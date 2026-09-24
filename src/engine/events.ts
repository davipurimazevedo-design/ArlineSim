import { EVENTS, EVENTS_BY_ID } from './data/events';
import { addLog } from './helpers';
import { randInt } from './rng';
import type { GameEvent, GameState, Side } from './types';

/** Um evento não se repete antes deste intervalo. */
export const EVENT_COOLDOWN = 120;

export function eligibleEvents(s: GameState): GameEvent[] {
  return EVENTS.filter(
    (e) => (!e.need || e.need(s)) && s.day - (s.usedEvents[e.id] ?? -999) > EVENT_COOLDOWN,
  );
}

/** Sorteia um evento elegível e o marca como usado. */
export function pickEvent(s: GameState): GameEvent | null {
  const pool = eligibleEvents(s);
  if (!pool.length) return null;
  const e = pool[randInt(s, pool.length)]!;
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
