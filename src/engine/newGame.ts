import { AIRPORTS } from './data/airports';
import { START_CASH } from './formulas';
import { toSeed } from './rng';
import type { AirportCode, GameState } from './types';

export const SAVE_VERSION = 5;
export const FIRST_EVENT_DAY = 25;

export function newGame(name: string, hub: AirportCode, seed: number, now = 0): GameState {
  return {
    v: SAVE_VERSION,
    seed: toSeed(seed),
    name,
    hub,
    day: 1,
    cash: START_CASH,
    debt: 0,
    reputation: 50,
    fuelIdx: 1,
    license: 0,
    slots: [hub],
    fleet: [],
    routes: [],
    mods: [],
    history: [],
    log: [
      { day: 1, text: `${name} recebe o certificado de operação em ${AIRPORTS[hub].city}.`, tone: 'info' },
    ],
    nextEvent: FIRST_EVENT_DAY,
    pendingEvent: null,
    usedEvents: {},
    flags: {},
    achievements: {},
    lastDay: null,
    speed: 1,
    savedAt: now,
    gameOver: false,
  };
}
