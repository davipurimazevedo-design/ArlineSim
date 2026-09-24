// Demanda compartilhada: rotas da própria companhia que saem do mesmo aeroporto para destinos
// próximos disputam os mesmos passageiros.
import { dist } from './formulas';
import type { AirportCode, GameState, Route } from './types';

/** destinos a menos desta distância entre si dividem demanda */
export const OVERLAP_RADIUS_KM = 400;
/** intensidade da divisão */
export const OVERLAP_STRENGTH = 0.5;

export interface Overlap {
  route: Route;
  /** 0–1: quanto os destinos se sobrepõem (1 = mesmo lugar) */
  w: number;
}

/** A outra ponta da rota, dado um aeroporto dela. */
function otherEnd(r: Route, code: AirportCode): AirportCode {
  return r.from === code ? r.to : r.from;
}

/** Rotas próprias, com aeronave escalada, que disputam passageiros com r. */
export function overlapsOf(s: GameState, r: Route): Overlap[] {
  const out: Overlap[] = [];
  for (const o of s.routes) {
    if (o.id === r.id || !o.planes.length) continue;
    const shared = [r.from, r.to].find((c) => c === o.from || c === o.to);
    if (!shared) continue;
    const w = 1 - dist(otherEnd(r, shared), otherEnd(o, shared)) / OVERLAP_RADIUS_KM;
    if (w > 0) out.push({ route: o, w });
  }
  return out;
}

/** Multiplicador da demanda da rota (1 = sem disputa). */
export function overlapFactor(s: GameState, r: Route): number {
  const total = overlapsOf(s, r).reduce((a, x) => a + x.w, 0);
  return 1 / (1 + OVERLAP_STRENGTH * total);
}
