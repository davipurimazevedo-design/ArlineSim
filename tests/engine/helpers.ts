import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { newGame } from '../../src/engine/newGame';
import type { AirportCode, GameState, ModelKey, Plane, Route } from '../../src/engine/types';
import { dist, fairPrice, defaultPriceJ } from '../../src/engine/formulas';

export function makeGame(hub: AirportCode = 'BSB', seed = 1): GameState {
  return newGame('Teste', hub, seed, 0);
}

let n = 0;
export function addTestPlane(s: GameState, model: ModelKey = 'AT7', extra: Partial<Plane> = {}): Plane {
  const p: Plane = {
    id: 'p' + ++n, reg: 'PR-T' + String.fromCharCode(65 + (n % 26)) + String.fromCharCode(65 + ((n / 26) | 0) % 26),
    model, owned: false, condition: 100, maint: 0, restore: true, hours: 0, since: s.day, ...extra,
  };
  s.fleet.push(p);
  return p;
}

export function addTestRoute(s: GameState, from: AirportCode, to: AirportCode, planeId: string | null, extra: Partial<Route> = {}): Route {
  const d = dist(from, to);
  const r: Route = {
    id: 'r' + ++n, from, to, dist: d, planeId, freq: 2, price: fairPrice(d), priceJ: defaultPriceJ(d),
    service: 1, ai: 1.2, opened: s.day, last: null, ...extra,
  };
  s.routes.push(r);
  for (const c of [from, to]) if (!s.slots.includes(c)) s.slots.push(c);
  return r;
}

/** Carrega o motor do protótipo (reference/prototipo.html) para testes de paridade. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadPrototypeEngine(): any {
  const path = fileURLToPath(new URL('../../reference/prototipo.html', import.meta.url));
  const html = readFileSync(path, 'utf8');
  const start = html.indexOf('// ===================== ENGINE');
  const end = html.indexOf('// ===================== FIM ENGINE');
  const code = html.slice(start, end);
  const module = { exports: {} };
  new Function('module', code)(module);
  return module.exports;
}
