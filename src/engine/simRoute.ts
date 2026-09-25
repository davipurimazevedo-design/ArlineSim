import { MODELS } from './data/aircraft';
import { SERVICE, SERVICE_J_MULT } from './data/service';
import {
  baseDemand,
  FEE_DOMESTIC,
  FEE_INTL,
  J_DEMAND_SHARE,
  blockHours,
  routeFair,
  routeFairJ,
  freqFactor,
  isIntlPair,
  leaseCost,
  modVal,
  opsHalted,
  seasonality,
  seatsOf,
} from './formulas';
import { AIRPORTS } from './data/airports';
import { findPlane } from './helpers';
import { rules } from './rules';
import { connectionFactor, crewFactor } from './hubs';
import { codeshareAiFactor, fxFeeFactor, fxRevenueFactor } from './international';
import { overlapFactor } from './overlap';
import { CARGO_ELASTICITY, CARGO_HANDLING, cargoDemand, cargoFair, hasCargoDivision } from './cargo';
import type { GameState, Plane, Route, SimResult } from './types';

function emptyResult(r: Route, reason: string): SimResult {
  return {
    id: r.id,
    pax: 0,
    tons: 0,
    cargoRev: 0,
    paxJ: 0,
    rev: 0,
    fuel: 0,
    crew: 0,
    fees: 0,
    svc: 0,
    share: 0,
    lf: 0,
    flying: false,
    hours: 0,
    planeHours: {},
    freq: 0,
    overlap: 1,
    reason,
  };
}

/** Aeronaves escaladas que existem na frota, com a frequência de cada uma. */
export function routePlanes(s: GameState, r: Route): { p: Plane; freq: number }[] {
  const out: { p: Plane; freq: number }[] = [];
  for (const x of r.planes) {
    const p = findPlane(s, x.id);
    if (p) out.push({ p, freq: x.freq });
  }
  return out;
}

type Active = { p: Plane; freq: number }[];

/** Horas, combustível e tripulação das aeronaves que voam a rota hoje. */
function flightCosts(s: GameState, r: Route, active: Active) {
  let hours = 0;
  let fuel = 0;
  let crew = 0;
  const planeHours: Record<string, number> = {};
  for (const { p, freq: f } of active) {
    const m = MODELS[p.model];
    const h = f * 2 * blockHours(m, r.dist);
    planeHours[p.id] = h;
    hours += h;
    fuel += m.fuelKm * r.dist * f * 2;
    crew += m.crewH * h;
  }
  return {
    hours,
    planeHours,
    fuel: fuel * s.fuelIdx * modVal(s, 'fuel'),
    crew: crew * modVal(s, 'salary') * crewFactor(s, r),
  };
}

/** Simula um dia de operação de uma rota. Não altera o estado. */
export function simRoute(s: GameState, r: Route): SimResult {
  const assigned = routePlanes(s, r);
  if (!assigned.length) return emptyResult(r, 'Sem aeronave');
  const active = assigned.filter((x) => x.p.maint === 0);
  if (!active.length) return emptyResult(r, 'Em manutenção');
  if (opsHalted(s)) return emptyResult(r, 'Operações suspensas');
  if (r.kind === 'cargo') return simCargo(s, r, active);

  const d = r.dist;
  const fp = routeFair(r.from, r.to, d);
  const intl = isIntlPair(r.from, r.to);
  const svc = SERVICE[r.service];

  const R = rules(s);
  let freq = 0;
  let capY = 0;
  let capJ = 0;
  let worn = 0; // capacidade de aeronaves com condição < 50
  for (const { p, freq: f } of active) {
    const seats = seatsOf(p, R.seatFactor);
    freq += f;
    capY += seats.y * f * 2;
    capJ += seats.j * f * 2;
    if (p.condition < 50) worn += (seats.y + seats.j) * f * 2;
  }

  const overlap = overlapFactor(s, r);
  const demand =
    baseDemand(r.from, r.to) *
    modVal(s, 'demand') *
    seasonality(s.day) *
    overlap *
    connectionFactor(s, r) *
    R.demandFactor(AIRPORTS[r.from], AIRPORTS[r.to]);
  const fare = modVal(s, 'fare');
  const price = r.price * fare;
  const priceF = Math.pow(fp / price, R.elasticity);
  // com um avião só, equivale ao protótipo: −0,1 se a condição estiver abaixo de 50
  const q = 0.75 + 0.5 * (s.reputation / 100) + svc.q - 0.1 * (worn / (capY + capJ));
  const freqF = freqFactor(freq);
  const A = priceF * q * freqF * modVal(s, 'share');
  const share = A / (A + r.ai * codeshareAiFactor(s, r));
  const pax = Math.round(Math.min(capY, demand * share));

  let paxJ = 0;
  let rev = 0;
  if (capJ > 0 && s.license >= 2) {
    const fpJ = routeFairJ(r.from, r.to, d);
    const pj = (r.priceJ || fpJ) * fare;
    const AJ = Math.pow(fpJ / pj, 1.8) * q * freqF;
    paxJ = Math.round(Math.min(capJ, (demand * J_DEMAND_SHARE * AJ) / (AJ + r.ai)));
    rev += paxJ * pj;
  }
  rev += pax * price;
  rev *= fxRevenueFactor(s, r);

  // carga no porão (divisão Cargas): parte da demanda de carga do par, pela participação da rota
  const belly = hasCargoDivision(s) ? bellyCargo(s, r, active, share) : { tons: 0, rev: 0 };
  rev += belly.rev;

  const fc = flightCosts(s, r, active);

  return {
    ...emptyResult(r, ''),
    pax,
    paxJ,
    rev,
    fuel: fc.fuel,
    crew: fc.crew,
    tons: belly.tons,
    cargoRev: belly.rev,
    fees: ((pax + paxJ) * (intl ? FEE_INTL : FEE_DOMESTIC) + belly.tons * CARGO_HANDLING) * fxFeeFactor(s, r),
    svc: pax * svc.cost + paxJ * svc.cost * SERVICE_J_MULT,
    share,
    lf: (pax + paxJ) / (capY + capJ),
    flying: true,
    hours: fc.hours,
    planeHours: fc.planeHours,
    freq,
    overlap,
  };
}

/** fração da demanda de carga do par que vai no porão (o resto: cargueiros e concorrência) */
export const BELLY_DEMAND_SHARE = 0.5;
/** o frete do porão sai mais barato que o do cargueiro */
export const BELLY_FARE_FACTOR = 0.8;

/** Carga no porão de uma rota de passageiros: toneladas e receita do dia. */
function bellyCargo(s: GameState, r: Route, active: Active, share: number): { tons: number; rev: number } {
  let cap = 0;
  for (const { p, freq } of active) cap += (MODELS[p.model].belly ?? 0) * freq * 2;
  if (cap <= 0) return { tons: 0, rev: 0 };
  const demand =
    cargoDemand(r.from, r.to, r.dist) * BELLY_DEMAND_SHARE * share * modVal(s, 'cargo') * seasonality(s.day);
  const tons = Math.round(Math.min(cap, demand) * 10) / 10;
  return { tons, rev: tons * cargoFair(r.from, r.to, r.dist) * BELLY_FARE_FACTOR * fxRevenueFactor(s, r) };
}

/**
 * Rota de carga: demanda em toneladas, sem reputação nem serviço de bordo.
 * Pesam a tarifa, a pontualidade (condição dos cargueiros) e a frequência.
 */
function simCargo(s: GameState, r: Route, active: Active): SimResult {
  let freq = 0;
  let cap = 0;
  let condW = 0;
  for (const { p, freq: f } of active) {
    const t = (MODELS[p.model].cargo ?? 0) * f * 2;
    freq += f;
    cap += t;
    condW += t * p.condition;
  }
  if (cap <= 0) return emptyResult(r, 'Sem cargueiro');
  const overlap = overlapFactor(s, r);
  const demand =
    cargoDemand(r.from, r.to, r.dist) *
    modVal(s, 'demand') *
    modVal(s, 'cargo') *
    seasonality(s.day) *
    overlap;
  const fair = cargoFair(r.from, r.to, r.dist);
  const price = r.price * modVal(s, 'fare');
  const q = 0.8 + 0.4 * (condW / cap / 100);
  const A = Math.pow(fair / price, CARGO_ELASTICITY) * q * freqFactor(freq);
  const share = A / (A + r.ai);
  const tons = Math.round(Math.min(cap, demand * share) * 10) / 10;
  const fc = flightCosts(s, r, active);
  return {
    ...emptyResult(r, ''),
    tons,
    rev: tons * price * fxRevenueFactor(s, r),
    cargoRev: tons * price * fxRevenueFactor(s, r),
    fuel: fc.fuel,
    crew: fc.crew,
    fees: tons * CARGO_HANDLING * fxFeeFactor(s, r),
    share,
    lf: tons / cap,
    flying: true,
    hours: fc.hours,
    planeHours: fc.planeHours,
    freq,
    overlap,
  };
}

/** Resultado da rota mostrado na tabela: receita − custos variáveis − leasing dos aviões escalados. */
export function routeProfit(s: GameState, r: Route, x: SimResult): number {
  const lease = routePlanes(s, r).reduce((a, { p }) => a + leaseCost(p), 0);
  return x.rev - x.fuel - x.crew - x.fees - x.svc - lease;
}
