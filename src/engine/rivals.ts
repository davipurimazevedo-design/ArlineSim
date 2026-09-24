// Concorrentes com nome por rota. Não alteram o total da concorrência (Route.ai),
// só como ele se divide, então não mexem no balanceamento.
import { AIRPORTS } from './data/airports';
import { COMPETITORS, MAX_RIVALS_PER_ROUTE, type RivalId } from './data/competitors';
import { clamp, fairPrice, isIntlPair } from './formulas';
import { routeFreq } from './helpers';
import type { AirportCode, Route, RouteRival } from './types';

const MIN_WEIGHT = 0.05;

/** Concorrentes que operam o par, os de maior peso primeiro (no máximo 3), com pesos normalizados. */
export function rivalsFor(a: AirportCode, b: AirportCode): RouteRival[] {
  const A = AIRPORTS[a];
  const B = AIRPORTS[b];
  const intl = isIntlPair(a, b);
  const list = Object.values(COMPETITORS)
    .filter((c) => c.serves(A, B, intl))
    .sort((x, y) => y.weight - x.weight)
    .slice(0, MAX_RIVALS_PER_ROUTE);
  return normalize(list.map((c) => ({ id: c.id, w: c.weight })));
}

function normalize(rivals: RouteRival[]): RouteRival[] {
  const total = rivals.reduce((a, r) => a + r.w, 0) || 1;
  return rivals.map((r) => ({ ...r, w: r.w / total }));
}

/** Quanto a personalidade favorece o concorrente diante da estratégia atual do jogador na rota. */
function pressure(id: RivalId, r: Route): number {
  switch (id) {
    case 'aerovia':
      // tarifa acima da referência abre espaço para a low-cost
      return 1 + 0.15 * clamp((r.price / fairPrice(r.dist) - 1) * 2, 0, 1);
    case 'ipe':
      return r.service === 0 ? 1.15 : r.service === 2 ? 0.9 : 1;
    case 'sabia':
      return routeFreq(r) < 3 ? 1.1 : 1;
    default:
      return 1;
  }
}

/** Redistribui os pesos dos concorrentes (chamado a cada reação da IA). Muta a rota. */
export function driftRivals(r: Route): void {
  if (r.rivals.length < 2) return;
  const moved = r.rivals.map((x) => ({ id: x.id, w: x.w * pressure(x.id as RivalId, r) }));
  r.rivals = normalize(normalize(moved).map((x) => ({ ...x, w: Math.max(MIN_WEIGHT, x.w) })));
}

/** Fatia do mercado de cada concorrente, dado o share do jogador. */
export function rivalShares(
  r: Route,
  share: number,
): { id: string; name: string; style: string; share: number }[] {
  return r.rivals.map((x) => {
    const c = COMPETITORS[x.id as RivalId];
    return { id: x.id, name: c?.name ?? x.id, style: c?.style ?? '', share: (1 - share) * x.w };
  });
}
