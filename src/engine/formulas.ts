import { AIRPORTS } from './data/airports';
import { MODELS } from './data/aircraft';
import { CABINS } from './data/cabins';
import { fmtInt } from './format';
import type { AircraftModel, AirportCode, GameState, ModType, ModelKey, Plane } from './types';

export const START_CASH = 12e6;
/** Capital inicial por dificuldade do hub: hubs pequenos começam com mais caixa. */
export const START_CASH_BY_DIFFICULTY = { Fácil: 12e6, Médio: 14e6, Difícil: 18e6 } as const;
export const BANKRUPTCY_CASH = -15e6;
export const INTEREST_RATE = 0.0006;
export const LOAN_STEP = 5e6;
export const LEASE_DEPOSIT_DAYS = 10;
export const BUYOUT_FACTOR = 0.9;
export const J_PRICE_FACTOR = 3.5;
export const DEFAULT_AI = 1.2;
/** fatia da demanda do par que procura executiva (protótipo: 0,12) */
export const J_DEMAND_SHARE = 0.08;
/** taxa aeroportuária por passageiro (protótipo: 25 doméstico, 80 internacional) */
export const FEE_DOMESTIC = 25;
export const FEE_INTL = 150;

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
  // Até 1.500 km, igual ao protótipo. Acima, cresce mais devagar (protótipo: 0,45/km até 3.500 e 0,25 depois),
  // para jatos em rotas longas e voos internacionais não dispararem o fim de jogo.
  const a = Math.min(d, 1500);
  const b = clamp(d - 1500, 0, 2000);
  const c = Math.max(0, d - 3500);
  return Math.round((150 + 0.45 * a + 0.3 * b + 0.2 * c) / 5) * 5;
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

/** Assentos da aeronave (Y e J), conforme o layout de cabine e o fator de densidade do modelo de negócio. */
export function seatsOf(p: Plane, seatFactor = 1): { y: number; j: number } {
  const m = MODELS[p.model];
  const layout = CABINS[p.model]?.[p.cabin] ?? { y: m.y, j: m.j };
  return seatFactor === 1 ? layout : { y: Math.round(layout.y * seatFactor), j: layout.j };
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
  return Math.round(((m.maintBase ?? m.price) * 0.00015 * (100 - p.condition)) / 1000) * 1000;
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
  // só conta o que já é da companhia: valor do avião menos o saldo financiado
  const owned = s.fleet
    .filter((p) => p.owned)
    .reduce((a, p) => a + Math.max(0, planeValue(p) - (p.loan?.balance ?? 0)), 0);
  return Math.round((10e6 + owned * 0.5) / 1e6) * 1e6;
}

export function dailyInterest(debt: number): number {
  return debt * INTEREST_RATE;
}

/**
 * Modificador criado no dia D com N dias vale nos dias D+1 a D+N (N dias de efeito).
 * O protótipo usava `until > dia`, o que dava só N−1 dias.
 */
export function modActive(m: { until: number }, day: number): boolean {
  return m.until >= day;
}

/** Produto de todos os modificadores ativos do tipo. */
export function modVal(s: GameState, type: ModType): number {
  return s.mods.filter((m) => m.type === type && modActive(m, s.day)).reduce((a, m) => a * m.value, 1);
}

export function opsHalted(s: GameState): boolean {
  return s.mods.some((m) => m.type === 'halt' && modActive(m, s.day));
}

/**
 * Força base da concorrência num par: 1,2 entre aeroportos grandes (porte ≥ 8, como no protótipo)
 * e menor em mercados pequenos, onde há menos concorrentes. A IA sempre volta para esse valor.
 */
export function baseCompetition(a: AirportCode, b: AirportCode): number {
  const small = Math.min(AIRPORTS[a].size, AIRPORTS[b].size);
  return clamp(0.7 + 0.0625 * small, 0.85, DEFAULT_AI);
}

/** Aeroporto ao qual a companhia pode comprar slot (licença permitindo). */
export function slotAllowed(s: GameState, code: AirportCode): boolean {
  return !AIRPORTS[code].intl || s.license >= 2;
}

/**
 * Problema de pista para a aeronave operar entre os aeroportos, ou null.
 * Pista curta: abaixo da mínima operacional do modelo. Terra/cascalho: só modelos que operam fora de pista pavimentada.
 */
export function runwayIssue(model: ModelKey, codes: AirportCode[]): string | null {
  const m = MODELS[model];
  for (const c of codes) {
    const a = AIRPORTS[c];
    if (!a.paved && !m.unpaved) return `A pista de ${a.city} não é pavimentada; o ${m.name} não opera nela.`;
    if (a.runway < m.minRunway)
      return `A pista de ${a.city} (${fmtInt(a.runway)} m) é curta para o ${m.name} (mínimo ${fmtInt(m.minRunway)} m).`;
  }
  return null;
}

/** Destinos remotos (porte ≤ 2) têm tarifa de referência maior: há pouca alternativa de transporte. */
export function remoteFareFactor(a: AirportCode, b: AirportCode): number {
  const small = Math.min(AIRPORTS[a].size, AIRPORTS[b].size);
  // porte 2: +50%; porte 1: +100% (voos regionais para cidades remotas custam 2–3× mais por km)
  return small <= 2 ? 1 + 0.5 * (3 - small) : 1;
}

/** Tarifa de referência da econômica numa rota (distância + prêmio de destino remoto), múltiplo de R$ 5. */
export function routeFair(a: AirportCode, b: AirportCode, d = dist(a, b)): number {
  return Math.round((fairPrice(d) * remoteFareFactor(a, b)) / 5) * 5;
}

/** Tarifa de referência da executiva numa rota. */
export function routeFairJ(a: AirportCode, b: AirportCode, d = dist(a, b)): number {
  return routeFair(a, b, d) * J_PRICE_FACTOR;
}
