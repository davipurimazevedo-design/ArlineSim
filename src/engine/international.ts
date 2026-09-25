// Base internacional (Fase 3): câmbio, custos no exterior, hubs fora do Brasil e codeshare.
import { AIRPORTS } from './data/airports';
import type { RivalId } from './data/competitors';
import { clamp, isIntlPair } from './formulas';
import { randRange } from './rng';
import type { AirportCode, GameState, Route } from './types';

export const FX_MIN = 0.75;
export const FX_MAX = 1.5;
/** fração da receita internacional vendida em dólar (acompanha o câmbio) */
export const FX_REVENUE_SHARE = 0.5;
/** taxa diária de slot num hub da companhia no exterior */
export const FOREIGN_HUB_FEE_FACTOR = 0.5;

export const CODESHARE_PARTNER: RivalId = 'atlantica';
export const CODESHARE_COST = 15e6;
/** mensalidade do acordo, em dólar (R$ ao câmbio 1,00) */
export const CODESHARE_DAILY = 20_000;
/** quanto da força da parceira deixa de competir com você nas rotas internacionais */
export const CODESHARE_AI_CUT = 0.3;

export function hasIntlDivision(s: GameState): boolean {
  return s.divisions.includes('internacional');
}

export function isForeign(code: AirportCode): boolean {
  return AIRPORTS[code].intl;
}

/**
 * Câmbio: passeio aleatório com reversão à média, como o querosene.
 * Só anda depois da licença Internacional, para não mexer no sorteio do começo de jogo.
 */
export function driftFx(s: GameState): void {
  if (s.license < 2) return;
  s.fxIdx = clamp(s.fxIdx + (1 - s.fxIdx) * 0.02 + randRange(s, -0.01, 0.01), FX_MIN, FX_MAX);
}

/** Custo cotado em dólar: multiplica pelo câmbio no exterior. */
export function fxCost(s: GameState, code: AirportCode, value: number): number {
  return isForeign(code) ? value * s.fxIdx : value;
}

/** Receita de rota internacional: a parte vendida lá fora sobe com o dólar. */
export function fxRevenueFactor(s: GameState, r: Route): number {
  return isIntlPair(r.from, r.to) ? 1 + FX_REVENUE_SHARE * (s.fxIdx - 1) : 1;
}

/** Taxas aeroportuárias de rota internacional acompanham o câmbio. */
export function fxFeeFactor(s: GameState, r: Route): number {
  return isIntlPair(r.from, r.to) ? s.fxIdx : 1;
}

/** Concorrência efetiva: a parceira de codeshare disputa menos nas rotas internacionais. */
export function codeshareAiFactor(s: GameState, r: Route): number {
  if (!s.codeshare || !isIntlPair(r.from, r.to)) return 1;
  const w = r.rivals.find((x) => x.id === CODESHARE_PARTNER)?.w ?? 0;
  return 1 - CODESHARE_AI_CUT * w;
}

export function codeshareDailyCost(s: GameState): number {
  return s.codeshare ? CODESHARE_DAILY * s.fxIdx : 0;
}
