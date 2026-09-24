import { AIRPORTS } from './data/airports';
import { MODELS } from './data/aircraft';
import { CABINS } from './data/cabins';
import type { AircraftModel, AirportCode, GameState, ModType, Plane } from './types';

export const START_CASH = 12e6;
export const BANKRUPTCY_CASH = -15e6;
export const INTEREST_RATE = 0.0006;
export const LOAN_STEP = 5e6;
export const LEASE_DEPOSIT_DAYS = 10;
export const BUYOUT_FACTOR = 0.9;
export const J_PRICE_FACTOR = 3.5;
export const DEFAULT_AI = 1.2;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** Distância haversine em km, arredondada. */
export function dist(a: AirportCode, b: AirportCode): number {
  const A = AIRPORTS[a];
  const B = AIRPORTS[b];
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (B.lat - A.lat) * rad;
  const dLon = (B.lon - A.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(A.lat * rad) * Math.cos(B.lat * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function isIntlPair(a: AirportCode, b: AirportCode): boolean {
  return AIRPORTS[a].intl || AIRPORTS[b].intl;
}

/** Tarifa de referência da econômica, múltiplo de R$ 5. */
export function fairPrice(d: number): number {
  const base = d <= 3500 ? 150 + 0.45 * d : 150 + 0.45 * 3500 + 0.25 * (d - 3500);
  return Math.round(base / 5) * 5;
}

/** Tarifa de referência da executiva (sem arredondamento, como no simulador). */
export function fairPriceJ(d: number): number {
  return fairPrice(d) * J_PRICE_FACTOR;
}

/** Tarifa executiva padrão de uma rota nova. */
export function defaultPriceJ(d: number): number {
  return Math.round((fairPrice(d) * J_PRICE_FACTOR) / 10) * 10;
}

/** Demanda base, pax/dia, total do par. */
export function baseDemand(a: AirportCode, b: AirportCode): number {
  const d = dist(a, b);
  let f = d < 300 ? 0.6 : d < 2500 ? 1 : 0.85;
  if (isIntlPair(a, b)) f *= 0.7;
  return 14 * AIRPORTS[a].size * AIRPORTS[b].size * f;
}

/** Sazonalidade: ±8%, dois ciclos por ano. */
export function seasonality(day: number): number {
  return 1 + 0.08 * Math.sin((day / 365) * 2 * Math.PI * 2);
}

export function slotCost(code: AirportCode): number {
  const a = AIRPORTS[code];
  return a.size * a.size * 60000 * (a.intl ? 2 : 1);
}

export function slotFee(code: AirportCode): number {
  const a = AIRPORTS[code];
  return a.size * 800 * (a.intl ? 2 : 1);
}

export function blockHours(m: AircraftModel, d: number): number {
  return d / m.speed + 0.5;
}

/** Assentos da aeronave (Y e J), conforme o layout de cabine. */
export function seatsOf(p: Plane): { y: number; j: number } {
  const layout = CABINS[p.model]?.[p.cabin];
  if (layout) return layout;
  const m = MODELS[p.model];
  return { y: m.y, j: m.j };
}

/**
 * Efeito da frequência na atratividade: +0,1 por voo até 6 (como no protótipo)
 * e +0,05 por voo do 7º ao 10º.
 */
export function freqFactor(freq: number): number {
  return 0.7 + 0.1 * Math.min(freq, 6) + 0.05 * clamp(freq - 6, 0, 4);
}

/** Idas e voltas por dia. */
export function maxFreq(m: AircraftModel, d: number): number {
  return Math.max(0, Math.floor(m.util / (2 * blockHours(m, d))));
}

export function maintCost(p: Plane): number {
  const m = MODELS[p.model];
  return Math.round((m.price * 0.00015 * (100 - p.condition)) / 1000) * 1000;
}

export function maintDays(p: Plane): number {
  return 2 + Math.ceil((100 - p.condition) / 20);
}

/** Valor de revenda. */
export function planeValue(p: Plane): number {
  return MODELS[p.model].price * 0.6 * (0.5 + p.condition / 200);
}

export function leaseCost(p: Plane): number {
  return p.owned ? 0 : MODELS[p.model].lease;
}

export function creditLimit(s: GameState): number {
  const owned = s.fleet.filter((p) => p.owned).reduce((a, p) => a + planeValue(p), 0);
  return Math.round((10e6 + owned * 0.5) / 1e6) * 1e6;
}

export function dailyInterest(debt: number): number {
  return debt * INTEREST_RATE;
}

/** Produto de todos os modificadores ativos do tipo. */
export function modVal(s: GameState, type: ModType): number {
  return s.mods.filter((m) => m.type === type && m.until > s.day).reduce((a, m) => a * m.value, 1);
}

export function opsHalted(s: GameState): boolean {
  return s.mods.some((m) => m.type === 'halt' && m.until > s.day);
}

/** Aeroporto ao qual a companhia pode comprar slot (licença permitindo). */
export function slotAllowed(s: GameState, code: AirportCode): boolean {
  return !AIRPORTS[code].intl || s.license >= 2;
}
