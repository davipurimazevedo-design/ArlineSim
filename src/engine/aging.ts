// Idade dos aviões e mercado de usados (Fase 4; docs/fase4-pendentes.md).
import { MODELS } from './data/aircraft';
import { rand, type Seeded } from './rng';
import type { GameState, ModelKey, Plane, UsedOffer } from './types';

/** manutenção: +4% por ano de idade */
export const AGE_MAINT_PER_YEAR = 0.04;
/** desgaste: +2% por ano de idade */
export const AGE_WEAR_PER_YEAR = 0.02;
/** revenda: −5% por ano, composto, até o piso */
export const AGE_VALUE_RATE = 0.95;
export const AGE_VALUE_FLOOR = 0.25;

export const USED_REFRESH_DAYS = 30;
export const USED_OFFERS = 5;
export const USED_MIN_AGE = 4;
export const USED_MAX_AGE = 20;
/** leasing de usado: −3% por ano de idade, com piso de 50% do novo */
export const USED_LEASE_PER_YEAR = 0.03;
export const USED_LEASE_FLOOR = 0.5;

/** Idade em anos (fração) no dia dado. */
export function ageYears(p: Pick<Plane, 'built'>, day: number): number {
  return Math.max(0, (day - p.built) / 365);
}

export function ageMaintFactor(p: Plane, day: number): number {
  return 1 + AGE_MAINT_PER_YEAR * ageYears(p, day);
}

export function ageWearFactor(p: Plane, day: number): number {
  return 1 + AGE_WEAR_PER_YEAR * ageYears(p, day);
}

/** Fração do valor de um avião novo que sobra com a idade. */
export function ageValueFactor(years: number): number {
  return Math.max(AGE_VALUE_FLOOR, AGE_VALUE_RATE ** years);
}

/** Leasing diário do avião: o próprio (usado) ou o do modelo. */
export function planeLease(p: Plane): number {
  return p.lease ?? MODELS[p.model].lease;
}

export function usedPrice(model: ModelKey, years: number, condition: number): number {
  const f = ageValueFactor(years) * (0.55 + (0.4 * condition) / 100);
  return Math.round((MODELS[model].price * f) / 1e5) * 1e5;
}

export function usedLease(model: ModelKey, years: number): number {
  const f = Math.max(USED_LEASE_FLOOR, 1 - USED_LEASE_PER_YEAR * years);
  return Math.round((MODELS[model].lease * f) / 100) * 100;
}

/**
 * Semente própria da lista de usados, derivada do dia e da companhia: a lista é reproduzível
 * sem consumir o RNG do jogo (o sorteio dos eventos não muda por causa dela).
 */
function listSeed(s: GameState): Seeded {
  let h = Math.imul(s.day + 1, 2654435761) ^ s.fleet.length;
  for (const ch of s.name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return { seed: h >>> 0 };
}

/** Sorteia uma lista nova de usados entre os modelos que a companhia pode ter. */
export function generateUsedMarket(s: GameState, models: ModelKey[]): UsedOffer[] {
  if (!models.length) return [];
  const rng = listSeed(s);
  const out: UsedOffer[] = [];
  for (let i = 0; i < USED_OFFERS; i++) {
    const model = models[Math.floor(rand(rng) * models.length)]!;
    const years = USED_MIN_AGE + Math.floor(rand(rng) * (USED_MAX_AGE - USED_MIN_AGE + 1));
    const condition = Math.round(55 + rand(rng) * 35);
    out.push({
      id: `u${s.day}-${i}`,
      model,
      built: s.day - years * 365,
      condition,
      price: usedPrice(model, years, condition),
      lease: usedLease(model, years),
    });
  }
  return out.sort((a, b) => MODELS[a.model].tier - MODELS[b.model].tier || a.price - b.price);
}
