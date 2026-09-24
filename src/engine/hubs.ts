// Hubs (Fase 3): conexões, base de manutenção e tripulação, pernoite e hubs adicionais.
import { AIRPORTS } from './data/airports';
import { maintCost, maintDays } from './formulas';
import { routeOfPlane } from './helpers';
import { rules } from './rules';
import type { AirportCode, GameState, Plane, Route } from './types';

/** demanda extra por outra rota da companhia no mesmo hub */
export const CONN_PER_ROUTE = 0.02;
/** teto da demanda extra por conexões */
export const CONN_MAX = 0.3;
/** custo de tripulação em rota ponto a ponto (pernoite fora da base) */
export const PERNOITE_FACTOR = 1.2;
/** manutenção de avião baseado num hub */
export const HUB_MAINT_COST_FACTOR = 0.8;
export const HUB_MAINT_DAYS_OFF = 1;
/** implantação de hub adicional: porte² × este valor */
export const HUB_SETUP_PER_SIZE2 = 400_000;
/** estrutura diária de hub adicional: porte × este valor */
export const HUB_DAILY_PER_SIZE = 1_500;

export function isHub(s: GameState, code: AirportCode): boolean {
  return s.hubs.includes(code);
}

/** A rota sai ou chega num hub da companhia? */
export function routeTouchesHub(s: GameState, r: Route): boolean {
  return isHub(s, r.from) || isHub(s, r.to);
}

/** Rotas da companhia, com aeronave, que tocam o aeroporto. */
export function routesAt(s: GameState, code: AirportCode): number {
  return s.routes.filter((r) => r.planes.length > 0 && (r.from === code || r.to === code)).length;
}

/** Demanda extra de conexão de um hub para uma rota que o toca (sem contar a própria rota). */
export function hubConnectionBonus(s: GameState, code: AirportCode, r: Route): number {
  if (!isHub(s, code)) return 0;
  const others = routesAt(s, code) - (r.planes.length > 0 ? 1 : 0);
  return Math.min(CONN_MAX, CONN_PER_ROUTE * Math.max(0, others));
}

/** Multiplicador de demanda por conexões: o melhor dos dois hubs, se a rota tocar dois. */
export function connectionFactor(s: GameState, r: Route): number {
  return 1 + Math.max(hubConnectionBonus(s, r.from, r), hubConnectionBonus(s, r.to, r));
}

/** Multiplicador de tripulação: pernoite em rota ponto a ponto (Low-cost isenta). */
export function crewFactor(s: GameState, r: Route): number {
  if (routeTouchesHub(s, r) || s.businessModel === 'lowcost') return 1;
  return PERNOITE_FACTOR;
}

/** Avião baseado num hub: a rota dele toca um hub, ou está parado (fica na base principal). */
export function planeAtHub(s: GameState, p: Plane): boolean {
  const r = routeOfPlane(s, p.id);
  return !r || routeTouchesHub(s, r);
}

/** Custo de manutenção, com desconto na base. */
export function maintCostFor(s: GameState, p: Plane): number {
  const c = maintCost(p);
  return planeAtHub(s, p) ? Math.round((c * HUB_MAINT_COST_FACTOR) / 1000) * 1000 : c;
}

/** Dias de manutenção, um a menos na base (mínimo 2). */
export function maintDaysFor(s: GameState, p: Plane): number {
  const d = maintDays(p);
  return planeAtHub(s, p) ? Math.max(2, d - HUB_MAINT_DAYS_OFF) : d;
}

export function hubSetupCost(code: AirportCode): number {
  return AIRPORTS[code].size ** 2 * HUB_SETUP_PER_SIZE2;
}

export function hubDailyCost(s: GameState, code: AirportCode): number {
  return AIRPORTS[code].size * HUB_DAILY_PER_SIZE * rules(s).overheadFactor;
}

/** Estrutura diária de todos os hubs adicionais (o da fundação já está na estrutura básica). */
export function extraHubsDailyCost(s: GameState): number {
  return s.hubs.filter((c) => c !== s.hub).reduce((a, c) => a + hubDailyCost(s, c), 0);
}
