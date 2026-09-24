import { MODELS } from './data/aircraft';
import { SERVICE, SERVICE_J_MULT } from './data/service';
import {
  baseDemand,
  blockHours,
  fairPrice,
  fairPriceJ,
  freqFactor,
  isIntlPair,
  leaseCost,
  modVal,
  opsHalted,
  seasonality,
  seatsOf,
} from './formulas';
import { findPlane } from './helpers';
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
  const fp = fairPrice(d);
  const intl = isIntlPair(r.from, r.to);
  const svc = SERVICE[r.service];

  let freq = 0;
  let capY = 0;
  let capJ = 0;
  let worn = 0; // capacidade de aeronaves com condição < 50
  for (const { p, freq: f } of active) {
    const seats = seatsOf(p);
    freq += f;
    capY += seats.y * f * 2;
    capJ += seats.j * f * 2;
    if (p.condition < 50) worn += (seats.y + seats.j) * f * 2;
  }

  const overlap = overlapFactor(s, r);
  const demand = baseDemand(r.from, r.to) * modVal(s, 'demand') * seasonality(s.day) * overlap;
  const priceF = Math.pow(fp / r.price, 2.2);
  // com um avião só, equivale ao protótipo: −0,1 se a condição estiver abaixo de 50
  const q = 0.75 + 0.5 * (s.reputation / 100) + svc.q - 0.1 * (worn / (capY + capJ));
  const freqF = freqFactor(freq);
  const A = priceF * q * freqF * modVal(s, 'share');
  const share = A / (A + r.ai);
  const pax = Math.round(Math.min(capY, demand * share));

  let paxJ = 0;
  let rev = 0;
  if (capJ > 0 && s.license >= 2) {
    const fpJ = fairPriceJ(d);
    const pj = r.priceJ || fpJ;
    const AJ = Math.pow(fpJ / pj, 1.8) * q * freqF;
    paxJ = Math.round(Math.min(capJ, (demand * 0.12 * AJ) / (AJ + r.ai)));
    rev += paxJ * pj;
  }
  rev += pax * r.price;

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
    fees: (pax + paxJ) * (intl ? 80 : 25),
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
