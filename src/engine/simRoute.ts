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
import { overlapFactor } from './overlap';
import type { GameState, Plane, Route, SimResult } from './types';

function emptyResult(r: Route, reason: string): SimResult {
  return {
    id: r.id,
    pax: 0,
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

/** Simula um dia de operação de uma rota. Não altera o estado. */
export function simRoute(s: GameState, r: Route): SimResult {
  const assigned = routePlanes(s, r);
  if (!assigned.length) return emptyResult(r, 'Sem aeronave');
  const active = assigned.filter((x) => x.p.maint === 0);
  if (!active.length) return emptyResult(r, 'Em manutenção');
  if (opsHalted(s)) return emptyResult(r, 'Operações suspensas');

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
    R.demandFactor(AIRPORTS[r.from], AIRPORTS[r.to]);
  const fare = modVal(s, 'fare');
  const price = r.price * fare;
  const priceF = Math.pow(fp / price, R.elasticity);
  // com um avião só, equivale ao protótipo: −0,1 se a condição estiver abaixo de 50
  const q = 0.75 + 0.5 * (s.reputation / 100) + svc.q - 0.1 * (worn / (capY + capJ));
  const freqF = freqFactor(freq);
  const A = priceF * q * freqF * modVal(s, 'share');
  const share = A / (A + r.ai);
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

  let hours = 0;
  let fuel = 0;
  let crew = 0;
  const planeHours: Record<string, number> = {};
  for (const { p, freq: f } of active) {
    const m = MODELS[p.model];
    const h = f * 2 * blockHours(m, d);
    planeHours[p.id] = h;
    hours += h;
    fuel += m.fuelKm * d * f * 2;
    crew += m.crewH * h;
  }

  return {
    ...emptyResult(r, ''),
    pax,
    paxJ,
    rev,
    fuel: fuel * s.fuelIdx * modVal(s, 'fuel'),
    crew: crew * modVal(s, 'salary'),
    fees: (pax + paxJ) * (intl ? FEE_INTL : FEE_DOMESTIC),
    svc: pax * svc.cost + paxJ * svc.cost * SERVICE_J_MULT,
    share,
    lf: (pax + paxJ) / (capY + capJ),
    flying: true,
    hours,
    planeHours,
    freq,
    overlap,
  };
}

/** Resultado da rota mostrado na tabela: receita − custos variáveis − leasing dos aviões escalados. */
export function routeProfit(s: GameState, r: Route, x: SimResult): number {
  const lease = routePlanes(s, r).reduce((a, { p }) => a + leaseCost(p), 0);
  return x.rev - x.fuel - x.crew - x.fees - x.svc - lease;
}
