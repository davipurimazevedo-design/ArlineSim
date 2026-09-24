// Ações do jogador: (state, ...args) => string | null. null = sucesso; string = erro para o toast.
import { AIRPORTS } from './data/airports';
import { CABIN_CHANGE_COST, CABIN_CHANGE_DAYS, CABINS, cabinLabel } from './data/cabins';
import { MODELS } from './data/aircraft';
import { LICENSES, REGIONAL_MAX_KM } from './data/licenses';
import { fmtInt, fmtMoney } from './format';
import {
  BUYOUT_FACTOR,
  clamp,
  creditLimit,
  DEFAULT_AI,
  defaultPriceJ,
  dist,
  fairPrice,
  LEASE_DEPOSIT_DAYS,
  maintCost,
  maintDays,
  maxFreq,
  planeValue,
  slotCost,
} from './formulas';
import { addLog, changeRep, findPlane, unassignPlane } from './helpers';
import { randInt, uid } from './rng';
import type {
  ActionResult,
  AirportCode,
  GameState,
  LicenseTier,
  ModelKey,
  Plane,
  Route,
  ServiceLevel,
} from './types';

const REG_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sem I e O

/** Matrícula PR-XXX única na frota. */
export function newReg(s: GameState): string {
  let r: string;
  do {
    r = 'PR-';
    for (let i = 0; i < 3; i++) r += REG_LETTERS[randInt(s, REG_LETTERS.length)];
  } while (s.fleet.some((p) => p.reg === r));
  return r;
}

function addPlane(s: GameState, model: ModelKey, owned: boolean): Plane {
  const p: Plane = {
    id: uid(s),
    reg: newReg(s),
    model,
    owned,
    condition: 100,
    maint: 0,
    restore: true,
    cabin: 0,
    hours: 0,
    since: s.day,
  };
  s.fleet.push(p);
  return p;
}

export function leaseDeposit(model: ModelKey): number {
  return MODELS[model].lease * LEASE_DEPOSIT_DAYS;
}

export function buyoutCost(p: Plane): number {
  return Math.round(MODELS[p.model].price * BUYOUT_FACTOR);
}

export function lease(s: GameState, model: ModelKey): ActionResult {
  const m = MODELS[model];
  const dep = leaseDeposit(model);
  if (m.tier > s.license) return 'Licença insuficiente.';
  if (s.cash < dep) return 'Caixa insuficiente para o depósito.';
  s.cash -= dep;
  const p = addPlane(s, model, false);
  addLog(s, `${m.name} ${p.reg} arrendado.`, 'info');
  return null;
}

export function buy(s: GameState, model: ModelKey): ActionResult {
  const m = MODELS[model];
  if (m.tier > s.license) return 'Licença insuficiente.';
  if (s.cash < m.price) return 'Caixa insuficiente.';
  s.cash -= m.price;
  const p = addPlane(s, model, true);
  addLog(s, `${m.name} ${p.reg} comprado.`, 'good');
  return null;
}

/** Comprar um avião arrendado por 90% do preço. */
export function buyOut(s: GameState, id: string): ActionResult {
  const p = findPlane(s, id);
  if (!p || p.owned) return 'Inválido.';
  const cost = buyoutCost(p);
  if (s.cash < cost) return 'Caixa insuficiente.';
  s.cash -= cost;
  p.owned = true;
  addLog(s, `${p.reg} agora é próprio.`, 'good');
  return null;
}

/** Vender (própria) ou devolver (arrendada). */
export function release(s: GameState, id: string): ActionResult {
  const p = findPlane(s, id);
  if (!p) return 'Inválido.';
  if (p.owned) s.cash += planeValue(p);
  unassignPlane(s, id);
  s.fleet = s.fleet.filter((x) => x.id !== id);
  addLog(s, p.owned ? `${p.reg} vendido.` : `${p.reg} devolvido ao arrendador.`, 'info');
  return null;
}

export function maintain(s: GameState, id: string): ActionResult {
  const p = findPlane(s, id);
  if (!p || p.maint > 0) return 'Inválido.';
  const c = maintCost(p);
  if (s.cash < c) return 'Caixa insuficiente.';
  s.cash -= c;
  p.maint = maintDays(p);
  p.restore = true;
  addLog(s, `${p.reg} entrou em manutenção por ${p.maint} dias.`, 'warn');
  return null;
}

/** Reconfigura a cabine de um narrowbody. Exige licença internacional; o avião fica parado alguns dias. */
export function setCabin(s: GameState, id: string, layout: number): ActionResult {
  const p = findPlane(s, id);
  const layouts = p && CABINS[p.model];
  if (!p || !layouts || !layouts[layout]) return 'Inválido.';
  if (s.license < 2) return 'Requer licença internacional.';
  if (p.cabin === layout) return 'A cabine já tem esse layout.';
  if (p.maint > 0) return 'Aeronave em manutenção.';
  if (s.cash < CABIN_CHANGE_COST) return 'Caixa insuficiente.';
  s.cash -= CABIN_CHANGE_COST;
  p.cabin = layout;
  p.maint = CABIN_CHANGE_DAYS;
  p.restore = false;
  addLog(
    s,
    `${p.reg} em reconfiguração de cabine (${cabinLabel(layouts[layout])}) por ${CABIN_CHANGE_DAYS} dias.`,
    'warn',
  );
  return null;
}

export function buySlot(s: GameState, code: AirportCode): ActionResult {
  if (s.slots.includes(code)) return 'Já possui.';
  if (AIRPORTS[code].intl && s.license < 2) return 'Requer licença internacional.';
  const c = slotCost(code);
  if (s.cash < c) return 'Caixa insuficiente.';
  s.cash -= c;
  s.slots.push(code);
  addLog(s, `Slots adquiridos em ${AIRPORTS[code].city}.`, 'good');
  return null;
}

export function buyLicense(s: GameState, tier: LicenseTier): ActionResult {
  if (tier !== s.license + 1) return 'Inválido.';
  const L = LICENSES[tier];
  if (s.cash < L.cost) return 'Caixa insuficiente.';
  s.cash -= L.cost;
  s.license = tier;
  addLog(s, `Licença ${L.name} concedida pela ANAC.`, 'good');
  return null;
}

export interface OpenRouteArgs {
  from: AirportCode;
  to: AirportCode;
  planeId: string | null;
}

export function routeExists(s: GameState, a: AirportCode, b: AirportCode): boolean {
  return s.routes.some((r) => (r.from === a && r.to === b) || (r.from === b && r.to === a));
}

export function openRoute(s: GameState, { from, to, planeId }: OpenRouteArgs): ActionResult {
  if (from === to) return 'Escolha dois aeroportos diferentes.';
  if (!s.slots.includes(from) || !s.slots.includes(to)) return 'Você precisa de slots nos dois aeroportos.';
  if (routeExists(s, from, to)) return 'Rota já existe.';
  const d = dist(from, to);
  const p = findPlane(s, planeId);
  // Como no protótipo: sem aeronave, alcance e limite regional não são checados.
  if (p) {
    const m = MODELS[p.model];
    if (d > m.range) return `Fora do alcance do ${m.name}.`;
    if (s.license === 0 && d > REGIONAL_MAX_KM) return 'Licença regional limita rotas a 1.500 km.';
    if (maxFreq(m, d) < 1) return 'Rota longa demais para a utilização diária da aeronave.';
    unassignPlane(s, p.id);
  }
  const r: Route = {
    id: uid(s),
    from,
    to,
    dist: d,
    planes: p ? [{ id: p.id, freq: defaultFreq(p, d) }] : [],
    price: fairPrice(d),
    priceJ: defaultPriceJ(d),
    service: 1,
    ai: DEFAULT_AI,
    opened: s.day,
    last: null,
  };
  s.routes.push(r);
  addLog(s, `Nova rota ${from}–${to} (${fmtInt(d)} km).`, 'good');
  return null;
}

/** Frequência padrão ao escalar uma aeronave: min(2, máximo). */
export function defaultFreq(p: Plane, d: number): number {
  return Math.min(2, maxFreq(MODELS[p.model], d));
}

export interface RoutePatch {
  price?: number;
  priceJ?: number;
  service?: ServiceLevel;
}

/** Tarifas e serviço. */
export function updateRoute(s: GameState, id: string, patch: RoutePatch): ActionResult {
  const r = s.routes.find((r) => r.id === id);
  if (!r) return 'Inválido.';
  if (patch.price !== undefined) r.price = clamp(Math.round(patch.price), 50, 50000);
  if (patch.priceJ !== undefined) r.priceJ = clamp(Math.round(patch.priceJ), 100, 150000);
  if (patch.service !== undefined) r.service = clamp(patch.service, 0, 2) as ServiceLevel;
  return null;
}

/** Escala uma aeronave na rota. Se ela estava em outra rota, sai de lá. */
export function assignPlane(s: GameState, routeId: string, planeId: string): ActionResult {
  const r = s.routes.find((r) => r.id === routeId);
  const p = findPlane(s, planeId);
  if (!r || !p) return 'Inválido.';
  if (r.planes.some((x) => x.id === planeId)) return 'Aeronave já escalada nesta rota.';
  const m = MODELS[p.model];
  if (r.dist > m.range) return `Fora do alcance do ${m.name}.`;
  if (maxFreq(m, r.dist) < 1) return 'Rota longa demais para essa aeronave.';
  unassignPlane(s, planeId);
  r.planes.push({ id: planeId, freq: defaultFreq(p, r.dist) });
  return null;
}

/** Tira uma aeronave da rota. */
export function unassignFromRoute(s: GameState, routeId: string, planeId: string): ActionResult {
  const r = s.routes.find((r) => r.id === routeId);
  if (!r || !r.planes.some((x) => x.id === planeId)) return 'Inválido.';
  r.planes = r.planes.filter((x) => x.id !== planeId);
  return null;
}

/** Frequência de uma aeronave na rota, de 1 ao máximo dela. */
export function setPlaneFreq(s: GameState, routeId: string, planeId: string, freq: number): ActionResult {
  const r = s.routes.find((r) => r.id === routeId);
  const x = r?.planes.find((x) => x.id === planeId);
  const p = findPlane(s, planeId);
  if (!r || !x || !p) return 'Inválido.';
  x.freq = clamp(Math.round(freq), 1, Math.max(1, maxFreq(MODELS[p.model], r.dist)));
  return null;
}

export function closeRoute(s: GameState, id: string): ActionResult {
  const r = s.routes.find((r) => r.id === id);
  if (!r) return 'Inválido.';
  s.routes = s.routes.filter((x) => x.id !== id);
  changeRep(s, -1);
  addLog(s, `Rota ${r.from}–${r.to} encerrada.`, 'warn');
  return null;
}

export function borrow(s: GameState, amt: number): ActionResult {
  if (s.debt + amt > creditLimit(s)) return 'Limite de crédito atingido.';
  s.debt += amt;
  s.cash += amt;
  addLog(s, `Empréstimo de ${fmtMoney(amt)} contratado.`, 'info');
  return null;
}

export function repay(s: GameState, amt: number): ActionResult {
  const a = Math.min(amt, s.debt);
  if (a <= 0) return 'Nenhuma dívida a quitar.';
  if (s.cash < a) return 'Caixa insuficiente.';
  s.debt -= a;
  s.cash -= a;
  addLog(s, `Dívida amortizada em ${fmtMoney(a)}.`, 'info');
  return null;
}
