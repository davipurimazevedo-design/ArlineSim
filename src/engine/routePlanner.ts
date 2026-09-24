// Criador de rotas: origem, destino e aeronave (da frota ou arrendada na hora).
// planRoute calcula tudo o que a tela mostra; createRoute executa de uma vez (tudo ou nada).
import { AIRPORTS } from './data/airports';
import { MODELS } from './data/aircraft';
import { REGIONAL_MAX_KM } from './data/licenses';
import { BUSINESS_MODELS } from './data/businessModels';
import * as actions from './actions';
import { baseDemand, dist, fairPrice } from './formulas';
import { fmtInt, fmtMoney } from './format';
import { findPlane } from './helpers';
import { maxFreqFor, modelAllowed, slotCostFor, slotFeeFor } from './rules';
import { routeProfit, simRoute } from './simRoute';
import type { ActionResult, AirportCode, GameState, ModelKey } from './types';

export interface RoutePlanArgs {
  from: AirportCode;
  to: AirportCode;
  /** aeronave da frota; ignorada se leaseModel vier preenchido */
  planeId: string | null;
  /** arrendar uma aeronave nova deste modelo junto com a rota */
  leaseModel?: ModelKey | null;
}

export interface RoutePlan {
  /** primeira validação que impede a criação (null = pode criar) */
  error: string | null;
  dist: number;
  /** demanda total do par, pax/dia */
  demand: number;
  fair: number;
  /** slots que faltam comprar, com o preço de cada um */
  slots: { code: AirportCode; cost: number }[];
  /** depósito do leasing, se arrendar na hora */
  deposit: number;
  /** tudo que sai do caixa agora */
  total: number;
  /** taxa diária dos slots novos */
  newSlotFees: number;
  /** previsão do primeiro dia de operação */
  preview: { pax: number; share: number; profit: number; freq: number } | null;
}

function validate(s: GameState, a: RoutePlanArgs, d: number): string | null {
  const { from, to } = a;
  if (!from || !to) return 'Escolha a origem e o destino.';
  if (from === to) return 'Escolha dois aeroportos diferentes.';
  if (actions.routeExists(s, from, to)) return 'Essa rota já existe.';
  if ((AIRPORTS[from].intl || AIRPORTS[to].intl) && s.license < 2)
    return 'Destinos no exterior exigem a licença Internacional.';
  if (s.license === 0 && d > REGIONAL_MAX_KM) return 'A licença regional limita rotas a 1.500 km.';
  const model = a.leaseModel ?? (a.planeId ? findPlane(s, a.planeId)?.model : undefined);
  if (a.leaseModel) {
    const m = MODELS[a.leaseModel];
    if (!modelAllowed(s, a.leaseModel))
      return `O modelo ${BUSINESS_MODELS[s.businessModel].name} não opera o ${m.name}.`;
    if (m.tier > s.license) return `O ${m.name} exige uma licença maior.`;
  }
  if (model) {
    const m = MODELS[model];
    if (d > m.range) return `Fora do alcance do ${m.name} (${fmtInt(m.range)} km).`;
    if (maxFreqFor(s, model, d) < 1) return `Rota longa demais para o ${m.name} num dia.`;
  }
  return null;
}

export function planRoute(s: GameState, a: RoutePlanArgs): RoutePlan {
  const d = a.from && a.to && a.from !== a.to ? dist(a.from, a.to) : 0;
  const slots = [a.from, a.to]
    .filter((c, i, list) => c && !s.slots.includes(c) && list.indexOf(c) === i)
    .map((code) => ({ code, cost: slotCostFor(s, code) }));
  const deposit = a.leaseModel ? actions.leaseDeposit(a.leaseModel) : 0;
  const total = slots.reduce((x, y) => x + y.cost, 0) + deposit;
  const plan: RoutePlan = {
    error: validate(s, a, d),
    dist: d,
    demand: d ? baseDemand(a.from, a.to) : 0,
    fair: d ? fairPrice(d) : 0,
    slots,
    deposit,
    total,
    newSlotFees: slots.reduce((x, y) => x + slotFeeFor(s, y.code), 0),
    preview: null,
  };
  if (!plan.error && total > s.cash) plan.error = `Caixa insuficiente: faltam ${fmtMoney(total - s.cash)}.`;
  // previsão: executa numa cópia do estado (sem limite de caixa) e simula um dia
  if (!validate(s, a, d) && (a.planeId || a.leaseModel)) {
    const copy: GameState = JSON.parse(JSON.stringify(s));
    copy.cash = Number.MAX_SAFE_INTEGER;
    if (!execute(copy, a)) {
      const r = copy.routes[copy.routes.length - 1]!;
      const x = simRoute(copy, r);
      plan.preview = { pax: x.pax + x.paxJ, share: x.share, profit: routeProfit(copy, r, x), freq: x.freq };
    }
  }
  return plan;
}

/** Compra os slots que faltam, arrenda se pedido e abre a rota. Supõe o plano já validado. */
function execute(s: GameState, a: RoutePlanArgs): ActionResult {
  for (const code of [a.from, a.to]) {
    if (s.slots.includes(code)) continue;
    const err = actions.buySlot(s, code);
    if (err) return err;
  }
  let planeId = a.planeId;
  if (a.leaseModel) {
    const err = actions.lease(s, a.leaseModel);
    if (err) return err;
    planeId = s.fleet[s.fleet.length - 1]!.id;
  }
  return actions.openRoute(s, { from: a.from, to: a.to, planeId });
}

/** Cria a rota de uma vez. Se algo impedir, nada é comprado. */
export function createRoute(s: GameState, a: RoutePlanArgs): ActionResult {
  const plan = planRoute(s, a);
  if (plan.error) return plan.error;
  return execute(s, a);
}
