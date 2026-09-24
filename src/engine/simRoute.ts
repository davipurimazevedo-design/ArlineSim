import { MODELS } from './data/aircraft';
import { SERVICE, SERVICE_J_MULT } from './data/service';
import {
  baseDemand,
  blockHours,
  fairPrice,
  fairPriceJ,
  isIntlPair,
  leaseCost,
  modVal,
  opsHalted,
  seasonality,
} from './formulas';
import { findPlane } from './helpers';
import type { GameState, Route, SimResult } from './types';

/** Simula um dia de operação de uma rota. Não altera o estado. */
export function simRoute(s: GameState, r: Route): SimResult {
  const res: SimResult = {
    id: r.id, pax: 0, paxJ: 0, rev: 0, fuel: 0, crew: 0, fees: 0, svc: 0,
    share: 0, lf: 0, flying: false, hours: 0, reason: '',
  };
  const p = findPlane(s, r.planeId);
  if (!p) return { ...res, reason: 'Sem aeronave' };
  if (p.maint > 0) return { ...res, reason: 'Em manutenção' };
  if (opsHalted(s)) return { ...res, reason: 'Operações suspensas' };

  const m = MODELS[p.model];
  const d = r.dist;
  const fp = fairPrice(d);
  const intl = isIntlPair(r.from, r.to);
  const svc = SERVICE[r.service];
  const demand = baseDemand(r.from, r.to) * modVal(s, 'demand') * seasonality(s.day);
  const priceF = Math.pow(fp / r.price, 2.2);
  let q = 0.75 + 0.5 * (s.reputation / 100) + svc.q;
  if (p.condition < 50) q -= 0.1;
  const freqF = 0.7 + 0.1 * Math.min(r.freq, 6);
  const A = priceF * q * freqF * modVal(s, 'share');
  const share = A / (A + r.ai);
  const capY = m.y * r.freq * 2;
  const capJ = m.j * r.freq * 2;
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

  const hours = r.freq * 2 * blockHours(m, d);
  return {
    ...res,
    pax,
    paxJ,
    rev,
    fuel: m.fuelKm * d * r.freq * 2 * s.fuelIdx * modVal(s, 'fuel'),
    crew: m.crewH * hours * modVal(s, 'salary'),
    fees: (pax + paxJ) * (intl ? 80 : 25),
    svc: pax * svc.cost + paxJ * svc.cost * SERVICE_J_MULT,
    share,
    lf: (pax + paxJ) / (capY + capJ),
    flying: true,
    hours,
  };
}

/** Resultado da rota mostrado na tabela: receita − custos variáveis − leasing do avião escalado. */
export function routeProfit(s: GameState, r: Route, x: SimResult): number {
  const p = findPlane(s, r.planeId);
  return x.rev - x.fuel - x.crew - x.fees - x.svc - (p ? leaseCost(p) : 0);
}
