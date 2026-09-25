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
import {
  FINANCE_TERMS,
  financedBalance,
  financeLimit,
  financeQuote,
  financeQuoteFor,
  type FinanceTerm,
} from './finance';
import { ageValueFactor, ageYears } from './aging';
import { CODESHARE_COST, CODESHARE_PARTNER, hasIntlDivision } from './international';
import { COMPETITORS } from './data/competitors';
import { DIVISIONS } from './data/divisions';
import { breakContract, clientName, MAX_CONTRACTS } from './contracts';
import { cargoCompetition, cargoFair, cargoRivals, hasCargoDivision } from './cargo';
import { hubSetupCost, maintCostFor, maintDaysFor } from './hubs';
import { randInt, uid } from './rng';
import { BUSINESS_MODELS, REGIONAL_CERT_COST } from './data/businessModels';
import type {
  ActionResult,
  AirportCode,
  DivisionId,
  GameState,
  LicenseTier,
  ModelKey,
  Plane,
  Route,
  RouteKind,
  ServiceLevel,
  UsedOffer,
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

function addPlane(s: GameState, model: ModelKey, owned: boolean, used?: UsedOffer): Plane {
  const p: Plane = {
    id: uid(s),
    reg: newReg(s),
    model,
    owned,
    condition: used?.condition ?? 100,
    maint: 0,
    restore: true,
    cabin: 0,
    hours: 0,
    since: s.day,
    built: used?.built ?? s.day,
  };
  if (used && !owned) p.lease = used.lease;
  s.fleet.push(p);
  return p;
}

export function leaseDeposit(model: ModelKey): number {
  return MODELS[model].lease * LEASE_DEPOSIT_DAYS;
}

/** Compra de um arrendado: 90% do preço do novo, descontada a idade (usado arrendado sai mais barato). */
export function buyoutCost(p: Plane, day = p.built): number {
  return Math.round(MODELS[p.model].price * BUYOUT_FACTOR * ageValueFactor(ageYears(p, day)));
}

/** Por que a companhia não pode ter essa aeronave (null = pode). */
export function acquireBlock(s: GameState, model: ModelKey): string | null {
  const m = MODELS[model];
  if (m.cargo && !hasCargoDivision(s)) return 'Cargueiros exigem a divisão Cargas.';
  if (!modelAllowed(s, model))
    return `O modelo ${BUSINESS_MODELS[s.businessModel].name} não opera o ${m.name}.`;
  if (m.tier > s.license) return 'Licença insuficiente.';
  return null;
}

export function lease(s: GameState, model: ModelKey): ActionResult {
  const m = MODELS[model];
  const dep = leaseDeposit(model);
  const block = acquireBlock(s, model);
  if (block) return block;
  if (s.cash < dep) return 'Caixa insuficiente para o depósito.';
  s.cash -= dep;
  const p = addPlane(s, model, false);
  addLog(s, `${m.name} ${p.reg} arrendado.`, 'info');
  return null;
}

export function buy(s: GameState, model: ModelKey): ActionResult {
  const m = MODELS[model];
  const block = acquireBlock(s, model);
  if (block) return block;
  if (s.cash < m.price) return 'Caixa insuficiente.';
  s.cash -= m.price;
  const p = addPlane(s, model, true);
  addLog(s, `${m.name} ${p.reg} comprado.`, 'good');
  return null;
}

/** Comprar com financiamento: entrada à vista e parcelas diárias pelo prazo escolhido. */
export function finance(s: GameState, model: ModelKey, days: FinanceTerm): ActionResult {
  const m = MODELS[model];
  const block = acquireBlock(s, model);
  if (block) return block;
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

// ---------------------------------------------------------------- usados

function takeUsed(s: GameState, offerId: string): UsedOffer | string {
  const o = s.usedMarket.find((x) => x.id === offerId);
  if (!o) return 'Essa oferta não está mais disponível.';
  return acquireBlock(s, o.model) ?? o;
}

function usedLabel(s: GameState, o: UsedOffer): string {
  return `${MODELS[o.model].name} usado (${Math.round(ageYears(o, s.day))} anos)`;
}

export function usedDeposit(o: UsedOffer): number {
  return o.lease * LEASE_DEPOSIT_DAYS;
}

export function buyUsed(s: GameState, offerId: string): ActionResult {
  const o = takeUsed(s, offerId);
  if (typeof o === 'string') return o;
  if (s.cash < o.price) return 'Caixa insuficiente.';
  s.cash -= o.price;
  const p = addPlane(s, o.model, true, o);
  s.usedMarket = s.usedMarket.filter((x) => x.id !== o.id);
  addLog(s, `${usedLabel(s, o)} ${p.reg} comprado.`, 'good');
  return null;
}

export function leaseUsed(s: GameState, offerId: string): ActionResult {
  const o = takeUsed(s, offerId);
  if (typeof o === 'string') return o;
  const dep = usedDeposit(o);
  if (s.cash < dep) return 'Caixa insuficiente para o depósito.';
  s.cash -= dep;
  const p = addPlane(s, o.model, false, o);
  s.usedMarket = s.usedMarket.filter((x) => x.id !== o.id);
  addLog(s, `${usedLabel(s, o)} ${p.reg} arrendado.`, 'info');
  return null;
}

/** Usado financiado: só em 3 ou 5 anos. */
export const USED_FINANCE_TERMS: FinanceTerm[] = [1095, 1825];

export function financeUsed(s: GameState, offerId: string, days: FinanceTerm): ActionResult {
  const o = takeUsed(s, offerId);
  if (typeof o === 'string') return o;
  if (!USED_FINANCE_TERMS.includes(days)) return 'Usados financiam em 3 ou 5 anos.';
  const q = financeQuoteFor(o.price, days);
  if (financedBalance(s) + q.principal > financeLimit(s))
    return `Limite de financiamento atingido (${fmtMoney(financeLimit(s))}).`;
  if (s.cash < q.down) return 'Caixa insuficiente para a entrada.';
  s.cash -= q.down;
  const p = addPlane(s, o.model, true, o);
  p.loan = { balance: q.principal, payment: q.payment, left: days };
  s.usedMarket = s.usedMarket.filter((x) => x.id !== o.id);
  addLog(s, `${usedLabel(s, o)} ${p.reg} financiado em ${Math.round(days / 365)} anos.`, 'good');
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
  const cost = buyoutCost(p, s.day);
  if (s.cash < cost) return 'Caixa insuficiente.';
  s.cash -= cost;
  p.owned = true;
  delete p.lease;
  addLog(s, `${p.reg} agora é próprio.`, 'good');
  return null;
}

/** Vender (própria) ou devolver (arrendada). */
export function release(s: GameState, id: string): ActionResult {
  const p = findPlane(s, id);
  if (!p) return 'Inválido.';
  // avião financiado: a venda quita o saldo primeiro
  const net = p.owned ? planeValue(p, s.day) - (p.loan?.balance ?? 0) : 0;
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
  setFlag(s, 'tut_manut');
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
  if (a.intl && !hasIntlDivision(s)) return 'Hubs no exterior chegam com a divisão Base internacional.';
  if (!s.slots.includes(code)) return `Compre slots em ${a.city} antes de abrir um hub.`;
  const cost = hubSetupCost(code, s.fxIdx);
  if (s.cash < cost) return 'Caixa insuficiente.';
  s.cash -= cost;
  s.hubs.push(code);
  addLog(s, `Hub aberto em ${a.city}: base de manutenção, tripulações e conexões.`, 'good');
  return null;
}

/** Abre uma divisão (expansão do negócio). */
export function buyDivision(s: GameState, id: DivisionId): ActionResult {
  const d = DIVISIONS[id];
  if (!d || d.soon) return 'Divisão ainda não disponível.';
  if (s.divisions.includes(id)) return `A divisão ${d.name} já está aberta.`;
  if (s.license < d.license) return `Requer a licença ${LICENSES[d.license].name}.`;
  if (s.cash < d.cost) return 'Caixa insuficiente.';
  s.cash -= d.cost;
  s.divisions.push(id);
  // primeira proposta de contrato de carga logo depois da abertura
  if (id === 'cargas') s.nextCargoOffer = s.day + 10;
  addLog(s, `Divisão ${d.name} aberta.`, 'good');
  return null;
}

/** Codeshare com a parceira estrangeira: menos concorrência dela nas rotas internacionais. */
export function signCodeshare(s: GameState): ActionResult {
  const name = COMPETITORS[CODESHARE_PARTNER].name;
  if (!hasIntlDivision(s)) return 'Requer a divisão Base internacional.';
  if (s.codeshare) return `O acordo com a ${name} já está ativo.`;
  if (s.cash < CODESHARE_COST) return 'Caixa insuficiente.';
  s.cash -= CODESHARE_COST;
  s.codeshare = true;
  addLog(s, `Acordo de codeshare assinado com a ${name}.`, 'good');
  return null;
}

export function cancelCodeshare(s: GameState): ActionResult {
  if (!s.codeshare) return 'Nenhum acordo ativo.';
  s.codeshare = false;
  addLog(s, `Codeshare com a ${COMPETITORS[CODESHARE_PARTNER].name} encerrado.`, 'warn');
  return null;
}

/** Aceita a proposta de contrato de carga. A capacidade tem de estar voando em até 7 dias. */
export function acceptCargoOffer(s: GameState): ActionResult {
  const o = s.cargoOffer;
  if (!o) return 'Nenhuma proposta de contrato.';
  if (s.contracts.length >= MAX_CONTRACTS) return `Limite de ${MAX_CONTRACTS} contratos ao mesmo tempo.`;
  o.start = s.day;
  o.miss = 0;
  s.contracts.push(o);
  s.cargoOffer = null;
  addLog(s, `Contrato com a ${clientName(o)} assinado: ${o.from}–${o.to} por ${o.days} dias.`, 'good');
  return null;
}

export function declineCargoOffer(s: GameState): ActionResult {
  if (!s.cargoOffer) return 'Nenhuma proposta de contrato.';
  addLog(s, `Proposta da ${clientName(s.cargoOffer)} recusada.`, 'info');
  s.cargoOffer = null;
  return null;
}

/** Encerra um contrato antes do fim, com a multa de rompimento. */
export function cancelContract(s: GameState, id: string): ActionResult {
  const c = s.contracts.find((k) => k.id === id);
  if (!c) return 'Inválido.';
  breakContract(s, c, 'encerrado pela companhia');
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
  /** passageiros (padrão) ou carga */
  kind?: RouteKind;
}

export function routeExists(s: GameState, a: AirportCode, b: AirportCode, kind: RouteKind = 'pax'): boolean {
  return s.routes.some(
    (r) => r.kind === kind && ((r.from === a && r.to === b) || (r.from === b && r.to === a)),
  );
}

/** A aeronave serve para o tipo de rota? Cargueiro só na carga, avião de passageiros só na de passageiros. */
export function kindMismatch(model: ModelKey, kind: RouteKind): string | null {
  const m = MODELS[model];
  if (kind === 'cargo' && !m.cargo) return `O ${m.name} não é cargueiro.`;
  if (kind === 'pax' && m.cargo) return `O ${m.name} é cargueiro: só voa rota de carga.`;
  return null;
}

export function openRoute(s: GameState, { from, to, planeId, kind = 'pax' }: OpenRouteArgs): ActionResult {
  if (from === to) return 'Escolha dois aeroportos diferentes.';
  if (kind === 'cargo' && !hasCargoDivision(s)) return 'Rotas de carga exigem a divisão Cargas.';
  if (!s.slots.includes(from) || !s.slots.includes(to)) return 'Você precisa de slots nos dois aeroportos.';
  if (routeExists(s, from, to, kind)) return 'Rota já existe.';
  const d = dist(from, to);
  // vale com ou sem aeronave (o protótipo só checava com aeronave)
  if (s.license === 0 && d > REGIONAL_MAX_KM) return 'Licença regional limita rotas a 1.500 km.';
  const p = findPlane(s, planeId);
  if (p) {
    const m = MODELS[p.model];
    const wrong = kindMismatch(p.model, kind);
    if (wrong) return wrong;
    if (d > m.range) return `Fora do alcance do ${m.name}.`;
    if (maxFreqFor(s, p.model, d) < 1) return 'Rota longa demais para a utilização diária da aeronave.';
    const runway = runwayIssue(p.model, [from, to]);
    if (runway) return runway;
    unassignPlane(s, p.id);
  }
  const cargo = kind === 'cargo';
  const r: Route = {
    id: uid(s),
    kind,
    from,
    to,
    dist: d,
    planes: p ? [{ id: p.id, freq: defaultFreq(s, p, d) }] : [],
    price: cargo ? cargoFair(from, to, d) : routeFair(from, to, d),
    priceJ: cargo ? 0 : Math.round(routeFairJ(from, to, d) / 10) * 10,
    service: rules(s).services[0]!,
    ai: cargo ? cargoCompetition(from, to) : baseCompetition(from, to),
    rivals: cargo ? cargoRivals() : rivalsFor(from, to),
    opened: s.day,
    last: null,
  };
  s.routes.push(r);
  addLog(s, `Nova rota ${cargo ? 'de carga ' : ''}${from}–${to} (${fmtInt(d)} km).`, 'good');
  return null;
}

/** Frequência padrão ao escalar uma aeronave: min(2, máximo); cargueiro começa com 1 (demanda menor). */
export function defaultFreq(s: GameState, p: Plane, d: number): number {
  return Math.min(MODELS[p.model].cargo ? 1 : 2, maxFreqFor(s, p.model, d));
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
  if (patch.price !== undefined || patch.priceJ !== undefined) setFlag(s, 'tut_ajuste');
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
  const wrong = kindMismatch(p.model, r.kind);
  if (wrong) return wrong;
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
  setFlag(s, 'tut_ajuste');
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
