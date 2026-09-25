import { AIRPORTS } from './data/airports';
import { hubDifficulty } from './data/airports';
import { BUSINESS_MODELS } from './data/businessModels';
import { START_CASH_BY_DIFFICULTY } from './formulas';
import { toSeed } from './rng';
import type { AirportCode, BusinessModelId, GameState } from './types';

export const SAVE_VERSION = 12;
/** primeira carta (Fase 4: era 25, para o jogador montar a primeira rota com calma) */
export const FIRST_EVENT_DAY = 40;
/** manutenção automática padrão de um jogo novo */
export const DEFAULT_AUTO_MAINT = 50;

export function newGame(
  name: string,
  hub: AirportCode,
  seed: number,
  now = 0,
  businessModel: BusinessModelId = 'tradicional',
): GameState {
  return {
    v: SAVE_VERSION,
    businessModel,
    divisions: [],
    hubs: [hub],
    seed: toSeed(seed),
    name,
    hub,
    day: 1,
    cash: BUSINESS_MODELS[businessModel].startCash ?? START_CASH_BY_DIFFICULTY[hubDifficulty(hub)],
    debt: 0,
    reputation: 50,
    fuelIdx: 1,
    fxIdx: 1,
    codeshare: false,
    contracts: [],
    autoMaint: DEFAULT_AUTO_MAINT,
    usedMarket: [],
    nextUsedMarket: 0,
    cargoOffer: null,
    nextCargoOffer: 0,
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
