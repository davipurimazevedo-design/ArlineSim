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
  baseCompetition,
  dist,
  routeFair,
  routeFairJ,
  LEASE_DEPOSIT_DAYS,
  planeValue,
  runwayIssue,
} from './formulas';
import { addLog, changeRep, findPlane, setFlag, unassignPlane } from './helpers';
import { rivalsFor } from './rivals';
import { hasRegionalCert, maxFreqFor, modelAllowed, rules, slotCostFor } from './rules';
import { FINANCE_TERMS, financedBalance, financeLimit, financeQuote, type FinanceTerm } from './finance';
import { hubSetupCost, maintCostFor, maintDaysFor } from './hubs';
import { randInt, uid } from './rng';
import { BUSINESS_MODELS, REGIONAL_CERT_COST } from './data/businessModels';
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
  if (!modelAllowed(s, model))
    return `O modelo ${BUSINESS_MODELS[s.businessModel].name} não opera o ${m.name}.`;
  if (m.tier > s.license) return 'Licença insuficiente.';
  if (s.cash < dep) return 'Caixa insuficiente para o depósito.';
  s.cash -= dep;
  const p = addPlane(s, model, false);
  addLog(s, `${m.name} ${p.reg} arrendado.`, 'info');
  return null;
}

export function buy(s: GameState, model: ModelKey): ActionResult {
  const m = MODELS[model];
  if (!modelAllowed(s, model))
    return `O modelo ${BUSINESS_MODELS[s.businessModel].name} não opera o ${m.name}.`;
  if (m.tier > s.license) return 'Licença insuficiente.';
  if (s.cash < m.price) return 'Caixa insuficiente.';
  s.cash -= m.price;
  const p = addPlane(s, model, true);
  addLog(s, `${m.name} ${p.reg} comprado.`, 'good');
  return null;
}

/** Comprar com financiamento: entrada à vista e parcelas diárias pelo prazo escolhido. */
export function finance(s: GameState, model: ModelKey, days: FinanceTerm): ActionResult {
  const m = MODELS[model];
  if (!modelAllowed(s, model))
    return `O modelo ${BUSINESS_MODELS[s.businessModel].name} não opera o ${m.name}.`;
  if (m.tier > s.license) return 'Licença insuficiente.';
  if (!FINANCE_TERMS.includes(days)) return 'Prazo inválido.';
  const q = financeQuote(model, days);
  if (financedBalance(s) + q.principal > financeLimit(s))
    return `Limite de financiamento atingido (${fmtMoney(financeLimit(s))}).`;
  if (s.cash < q.down) return 'Caixa insuficiente para a entrada.';
  s.cash -= q.down;
  const p = addPlane(s, model, true);
  p.loan = { balance: q.principal, payment: q.payment, left: days };
  addLog(
    s,
    `${m.name} ${p.reg} financiado em ${Math.round(days / 365)} anos (${fmtMoney(q.payment)}/dia).`,
    'good',
  );
  return null;
}

/** Quitar o saldo devedor de um avião financiado. */
export function payoffLoan(s: GameState, id: string): ActionResult {
  const p = findPlane(s, id);
  if (!p?.loan) return 'Inválido.';
  const b = Math.round(p.loan.balance);
  if (s.cash < b) return 'Caixa insuficiente.';
  s.cash -= b;
  delete p.loan;
  addLog(s, `Financiamento do ${p.reg} quitado antecipadamente.`, 'good');
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
  // avião financiado: a venda quita o saldo primeiro
  const net = p.owned ? planeValue(p) - (p.loan?.balance ?? 0) : 0;
  if (s.cash + net < 0) return 'A venda não cobre o saldo do financiamento.';
  s.cash += net;
  unassignPlane(s, id);
  s.fleet = s.fleet.filter((x) => x.id !== id);
  addLog(s, p.owned ? `${p.reg} vendido.` : `${p.reg} devolvido ao arrendador.`, 'info');
  return null;
}

export function maintain(s: GameState, id: string): ActionResult {
  const p = findPlane(s, id);
  if (!p || p.maint > 0) return 'Inválido.';
  const c = maintCostFor(s, p);
  if (s.cash < c) return 'Caixa insuficiente.';
  s.cash -= c;
  p.maint = maintDaysFor(s, p);
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
  if (layouts[layout].j > 0 && !rules(s).allowJ)
    return `O modelo ${BUSINESS_MODELS[s.businessModel].name} não opera classe executiva.`;
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
  const c = slotCostFor(s, code);
  if (s.cash < c) return 'Caixa insuficiente.';
  s.cash -= c;
  s.slots.push(code);
  addLog(s, `Slots adquiridos em ${AIRPORTS[code].city}.`, 'good');
  return null;
}

/** Pequeno porte: certificação regional (ATR, jatos regionais e caminho das licenças). */
export function buyRegionalCert(s: GameState): ActionResult {
  if (s.businessModel !== 'pequeno') return 'Só o Pequeno porte precisa de certificação regional.';
  if (hasRegionalCert(s)) return 'A companhia já tem a certificação regional.';
  if (s.cash < REGIONAL_CERT_COST) return 'Caixa insuficiente.';
  s.cash -= REGIONAL_CERT_COST;
  setFlag(s, 'cert_regional');
  addLog(s, 'Certificação regional concedida pela ANAC: ATR e o caminho das licenças liberados.', 'good');
  return null;
}

/** Abre um hub adicional numa cidade doméstica onde a companhia tem slot. */
export function openHub(s: GameState, code: AirportCode): ActionResult {
  const a = AIRPORTS[code];
  if (s.hubs.includes(code)) return `${a.city} já é hub.`;
  if (a.intl) return 'Hubs no exterior chegam com a divisão Base internacional.';
  if (!s.slots.includes(code)) return `Compre slots em ${a.city} antes de abrir um hub.`;
  const cost = hubSetupCost(code);
  if (s.cash < cost) return 'Caixa insuficiente.';
  s.cash -= cost;
  s.hubs.push(code);
  addLog(s, `Hub aberto em ${a.city}: base de manutenção, tripulações e conexões.`, 'good');
  return null;
}

export function buyLicense(s: GameState, tier: LicenseTier): ActionResult {
  if (tier !== s.license + 1) return 'Inválido.';
  if (tier > rules(s).maxLicense)
    return `O modelo ${BUSINESS_MODELS[s.businessModel].name} não opera com a licença ${LICENSES[tier].name}.`;
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
  // vale com ou sem aeronave (o protótipo só checava com aeronave)
  if (s.license === 0 && d > REGIONAL_MAX_KM) return 'Licença regional limita rotas a 1.500 km.';
  const p = findPlane(s, planeId);
  if (p) {
    const m = MODELS[p.model];
    if (d > m.range) return `Fora do alcance do ${m.name}.`;
    if (maxFreqFor(s, p.model, d) < 1) return 'Rota longa demais para a utilização diária da aeronave.';
    const runway = runwayIssue(p.model, [from, to]);
    if (runway) return runway;
    unassignPlane(s, p.id);
  }
  const r: Route = {
    id: uid(s),
    from,
    to,
    dist: d,
    planes: p ? [{ id: p.id, freq: defaultFreq(s, p, d) }] : [],
    price: routeFair(from, to, d),
    priceJ: Math.round(routeFairJ(from, to, d) / 10) * 10,
    service: rules(s).services[0]!,
    ai: baseCompetition(from, to),
    rivals: rivalsFor(from, to),
    opened: s.day,
    last: null,
  };
  s.routes.push(r);
  addLog(s, `Nova rota ${from}–${to} (${fmtInt(d)} km).`, 'good');
  return null;
}

/** Frequência padrão ao escalar uma aeronave: min(2, máximo). */
export function defaultFreq(s: GameState, p: Plane, d: number): number {
  return Math.min(2, maxFreqFor(s, p.model, d));
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
  if (patch.service !== undefined) {
    if (!rules(s).services.includes(patch.service))
      return `O modelo ${BUSINESS_MODELS[s.businessModel].name} não oferece esse serviço de bordo.`;
    r.service = patch.service;
  }
  return null;
}

/** Escala uma aeronave na rota. Se ela estava em outra rota, sai de lá. */
export function assignPlane(s: GameState, routeId: string, planeId: string): ActionResult {
  const r = s.routes.find((r) => r.id === routeId);
  const p = findPlane(s, planeId);
  if (!r || !p) return 'Inválido.';
  if (r.planes.some((x) => x.id === planeId)) return 'Aeronave já escalada nesta rota.';
  const m = MODELS[p.model];
  if (s.license === 0 && r.dist > REGIONAL_MAX_KM) return 'Licença regional limita rotas a 1.500 km.';
  if (r.dist > m.range) return `Fora do alcance do ${m.name}.`;
  if (maxFreqFor(s, p.model, r.dist) < 1) return 'Rota longa demais para essa aeronave.';
  const runway = runwayIssue(p.model, [r.from, r.to]);
  if (runway) return runway;
  unassignPlane(s, planeId);
  r.planes.push({ id: planeId, freq: defaultFreq(s, p, r.dist) });
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
  x.freq = clamp(Math.round(freq), 1, Math.max(1, maxFreqFor(s, p.model, r.dist)));
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
