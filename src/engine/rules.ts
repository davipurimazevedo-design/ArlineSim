// Regras do modelo de negócio da companhia. O motor consulta tudo por aqui.
import { AIRPORTS } from './data/airports';
import { MODELS } from './data/aircraft';
import { BUSINESS_MODELS, type Rules } from './data/businessModels';
import { blockHours, slotCost, slotFee } from './formulas';
import type { AirportCode, GameState, ModelKey } from './types';

export function rules(s: GameState): Rules {
  return (BUSINESS_MODELS[s.businessModel] ?? BUSINESS_MODELS.tradicional).rules;
}

/** Idas e voltas por dia do modelo na distância, com o bônus de utilização do modelo de negócio. */
export function maxFreqFor(s: GameState, model: ModelKey, d: number): number {
  const m = MODELS[model];
  return Math.max(0, Math.floor((m.util + rules(s).utilBonus) / (2 * blockHours(m, d))));
}

/** O modelo de negócio opera essa aeronave? */
export function modelAllowed(s: GameState, model: ModelKey): boolean {
  const list = rules(s).models;
  return !list || list.includes(model);
}

export function slotCostFor(s: GameState, code: AirportCode): number {
  return Math.round(slotCost(code) * rules(s).slotCostFactor(AIRPORTS[code]));
}

export function slotFeeFor(s: GameState, code: AirportCode): number {
  return Math.round(slotFee(code) * rules(s).slotFeeFactor(AIRPORTS[code]));
}
