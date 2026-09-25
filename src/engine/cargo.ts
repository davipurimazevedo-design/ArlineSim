// Divisão Cargas (Fase 3): demanda em toneladas, tarifa por tonelada e capacidade.
// Números marcados como ajustáveis em docs/fase3-cargas.md; calibração final no rebalanceamento.
import { AIRPORTS } from './data/airports';
import { MODELS } from './data/aircraft';
import { baseCompetition, clamp, dist, opsHalted, remoteFareFactor } from './formulas';
import type { AirportCode, GameState, Route, RouteRival } from './types';

/** escala da demanda de carga, t/dia */
export const CARGO_DEMAND_K = 0.3;
/** tarifa de referência: fixo + por km, R$ por tonelada */
export const CARGO_FARE_BASE = 2000;
export const CARGO_FARE_KM = 2;
/** taxa de manuseio por tonelada (no exterior, cotada em dólar) */
export const CARGO_HANDLING = 120;
/** sensibilidade a preço (menor que a de passageiros) */
export const CARGO_ELASTICITY = 1.8;
/** a concorrência na carga é mais rala que na de passageiros */
export const CARGO_AI_FACTOR = 0.7;

/** Peso logístico do aeroporto (padrão 1): terminais de carga grandes pesam mais. */
export const LOGISTIC_WEIGHT: Partial<Record<AirportCode, number>> = {
  VCP: 3,
  GRU: 2.5,
  MAO: 2.5,
  MIA: 2.5,
  GIG: 1.5,
  PNZ: 1.5,
  CNF: 1.3,
  REC: 1.3,
  FOR: 1.2,
  SSA: 1.2,
  POA: 1.2,
  CWB: 1.2,
  BEL: 1.2,
};

export function logisticWeight(code: AirportCode): number {
  return LOGISTIC_WEIGHT[code] ?? 1;
}

export function hasCargoDivision(s: GameState): boolean {
  return s.divisions.includes('cargas');
}

/** O par tem uma cidade remota (porte 1 ou 2), onde a carga aérea é quase a única opção? */
function remotePair(a: AirportCode, b: AirportCode): boolean {
  return Math.min(AIRPORTS[a].size, AIRPORTS[b].size) <= 2;
}

/**
 * Efeito da distância: rota curta perde para o caminhão; longa favorece o avião.
 * Cidade remota não tem estrada, então não sofre a perda.
 */
export function cargoDistFactor(a: AirportCode, b: AirportCode, d = dist(a, b)): number {
  if (d < 400) return remotePair(a, b) ? 1 : 0.3;
  return d > 1500 ? 1.2 : 1;
}

/** Demanda total do par, t/dia (ida e volta somadas). */
export function cargoDemand(a: AirportCode, b: AirportCode, d = dist(a, b)): number {
  const remote = remotePair(a, b) ? 3 : 1;
  return (
    CARGO_DEMAND_K *
    AIRPORTS[a].size *
    AIRPORTS[b].size *
    logisticWeight(a) *
    logisticWeight(b) *
    cargoDistFactor(a, b, d) *
    remote
  );
}

/**
 * Tarifa de referência por tonelada, múltiplo de R$ 10, com o prêmio de destino remoto.
 * Por km: R$ 2 até 1.500 km, R$ 1 até 3.500 km e R$ 0,50 depois (como a tarifa de passageiros, desacelera).
 */
export function cargoFair(a: AirportCode, b: AirportCode, d = dist(a, b)): number {
  const km = CARGO_FARE_KM * Math.min(d, 1500) + clamp(d - 1500, 0, 2000) + 0.5 * Math.max(0, d - 3500);
  return Math.round(((CARGO_FARE_BASE + km) * remoteFareFactor(a, b)) / 10) * 10;
}

/** Força inicial da concorrência numa rota de carga. */
export function cargoCompetition(a: AirportCode, b: AirportCode): number {
  return baseCompetition(a, b) * CARGO_AI_FACTOR;
}

/** Concorrentes de uma rota de carga. */
export function cargoRivals(): RouteRival[] {
  return [{ id: 'rotanorte', w: 1 }];
}

/** Rotas de carga no par (qualquer sentido). */
export function cargoRoutesOn(s: GameState, a: AirportCode, b: AirportCode): Route[] {
  return s.routes.filter(
    (r) => r.kind === 'cargo' && ((r.from === a && r.to === b) || (r.from === b && r.to === a)),
  );
}

/**
 * Capacidade de carga voando hoje no par, t/dia num sentido, e a condição média desses cargueiros.
 * Aviões em manutenção e operações suspensas não contam.
 */
export function cargoCapacityOn(
  s: GameState,
  a: AirportCode,
  b: AirportCode,
): { tons: number; cond: number } {
  if (opsHalted(s)) return { tons: 0, cond: 0 };
  let tons = 0;
  let condW = 0;
  for (const r of cargoRoutesOn(s, a, b)) {
    for (const x of r.planes) {
      const p = s.fleet.find((f) => f.id === x.id);
      if (!p || p.maint > 0) continue;
      const t = (MODELS[p.model].cargo ?? 0) * x.freq;
      tons += t;
      condW += t * p.condition;
    }
  }
  return { tons, cond: tons ? condW / tons : 0 };
}
