// Contratos de carga (divisão Cargas): propostas sorteadas de tempos em tempos,
// receita fixa por dia enquanto a companhia mantiver a capacidade exigida no par.
import { cargoCapacityOn, cargoFair, hasCargoDivision } from './cargo';
import { AIRPORT_CODES, AIRPORTS } from './data/airports';
import { CARGO_CLIENTS, CARGO_CLIENTS_BY_ID, type CargoClient } from './data/cargoClients';
import { REGIONAL_MAX_KM } from './data/licenses';
import { fmtDec, fmtMoney } from './format';
import { dist } from './formulas';
import { addLog, changeRep, setFlag } from './helpers';
import { randInt, randRange, uid } from './rng';
import { rules } from './rules';
import type { AirportCode, CargoContract, GameState } from './types';

/** pagamento fixo: esta fração da receita de referência das toneladas exigidas */
export const CONTRACT_PAY_SHARE = 0.6;
export const CONTRACT_MIN_DAYS = 90;
export const CONTRACT_DAYS_SPREAD = 150;
export const OFFER_GAP_MIN = 60;
export const OFFER_GAP_SPREAD = 30;
/** dias para aceitar uma proposta */
export const OFFER_VALID_DAYS = 15;
/** dias seguidos sem capacidade até o contrato ser rompido */
export const CONTRACT_GRACE = 7;
/** multa por rompimento, em dias de pagamento */
export const CONTRACT_PENALTY_DAYS = 10;
export const CONTRACT_BREAK_REP = 3;
export const CONTRACT_DONE_REP = 1;
export const MAX_CONTRACTS = 3;

export function clientName(c: CargoContract): string {
  return CARGO_CLIENTS_BY_ID[c.client]?.name ?? c.client;
}

export function contractEnd(c: CargoContract): number {
  return c.start + c.days;
}

/** Só cargueiros de pequeno porte (Pequeno porte antes da certificação)? */
function smallOnly(s: GameState): boolean {
  const f = rules(s).freighters;
  return f !== null && f.length <= 2;
}

function maxKm(s: GameState): number {
  if (smallOnly(s)) return 1200;
  return s.license === 0 ? REGIONAL_MAX_KM : 3500;
}

/** Par de aeroportos (domésticos) para a proposta, com ao menos uma ponta onde a companhia tem slot. */
function pickPair(s: GameState, c: CargoClient): [AirportCode, AirportCode] | null {
  const domestic = AIRPORT_CODES.filter((x) => !AIRPORTS[x].intl);
  const origins = c.origins ?? domestic.filter((x) => AIRPORTS[x].size >= c.minSize);
  const lo = c.remote ? 150 : 400;
  const hi = maxKm(s);
  const busy = (a: AirportCode, b: AirportCode) =>
    s.contracts.some((k) => (k.from === a && k.to === b) || (k.from === b && k.to === a));
  const pairs: [AirportCode, AirportCode][] = [];
  for (const a of origins) {
    for (const b of domestic) {
      if (a === b || AIRPORTS[b].size < c.destMinSize) continue;
      if (!c.origins && AIRPORTS[b].size < c.minSize) continue;
      if (!s.slots.includes(a) && !s.slots.includes(b)) continue;
      if (c.remote && Math.min(AIRPORTS[a].size, AIRPORTS[b].size) > 3) continue;
      const d = dist(a, b);
      if (d < lo || d > hi || busy(a, b)) continue;
      pairs.push([a, b]);
    }
  }
  return pairs.length ? pairs[randInt(s, pairs.length)]! : null;
}

/** Sorteia uma proposta de contrato. Null se nenhum cliente tiver um par viável. */
export function generateOffer(s: GameState): CargoContract | null {
  const small = smallOnly(s);
  const pool = small ? CARGO_CLIENTS.filter((c) => c.remote || c.tons[0] <= 2) : CARGO_CLIENTS;
  const first = randInt(s, pool.length);
  for (let i = 0; i < pool.length; i++) {
    const c = pool[(first + i) % pool.length]!;
    const pair = pickPair(s, c);
    if (!pair) continue;
    const [from, to] = pair;
    let tons = Math.round(randRange(s, c.tons[0], c.tons[1]) * 2) / 2;
    if (small) tons = Math.min(tons, 3);
    tons = Math.max(0.5, tons);
    const pay = Math.max(
      1000,
      Math.round((tons * cargoFair(from, to) * CONTRACT_PAY_SHARE * c.payFactor) / 1000) * 1000,
    );
    return {
      id: uid(s),
      client: c.id,
      from,
      to,
      tons,
      pay,
      days: CONTRACT_MIN_DAYS + randInt(s, CONTRACT_DAYS_SPREAD + 1),
      start: 0,
      expires: s.day + OFFER_VALID_DAYS,
      miss: 0,
      minCond: c.minCond,
    };
  }
  return null;
}

/** A companhia cumpre hoje o contrato? */
export function contractMet(s: GameState, c: CargoContract): boolean {
  const cap = cargoCapacityOn(s, c.from, c.to);
  return cap.tons >= c.tons - 1e-9 && (c.minCond === 0 || cap.cond >= c.minCond);
}

/** Rompe o contrato: multa, reputação e registro. */
export function breakContract(s: GameState, c: CargoContract, why: string): void {
  const pen = c.pay * CONTRACT_PENALTY_DAYS;
  s.cash -= pen;
  changeRep(s, -CONTRACT_BREAK_REP);
  s.contracts = s.contracts.filter((k) => k.id !== c.id);
  addLog(s, `Contrato com a ${clientName(c)} rompido (${why}). Multa de ${fmtMoney(pen)}.`, 'bad');
}

/**
 * Passo diário: paga os contratos cumpridos, rompe os que ficaram sem capacidade,
 * encerra os que venceram e cuida das propostas. Devolve a receita fixa do dia.
 */
export function processContracts(s: GameState): number {
  let income = 0;
  for (const c of [...s.contracts]) {
    if (contractMet(s, c)) {
      c.miss = 0;
      income += c.pay;
    } else {
      c.miss++;
      if (c.miss === 1)
        addLog(
          s,
          `Contrato com a ${clientName(c)} sem a capacidade exigida (${fmtDec(c.tons)} t/dia em ${c.from}–${c.to}${c.minCond ? `, condição ≥ ${c.minCond}%` : ''}).`,
          'warn',
        );
      if (c.miss >= CONTRACT_GRACE) {
        breakContract(s, c, `${CONTRACT_GRACE} dias sem capacidade`);
        continue;
      }
    }
    if (s.day >= contractEnd(c)) {
      s.contracts = s.contracts.filter((k) => k.id !== c.id);
      changeRep(s, CONTRACT_DONE_REP);
      setFlag(s, 'contrato_cumprido');
      addLog(s, `Contrato com a ${clientName(c)} cumprido.`, 'good');
    }
  }

  if (s.cargoOffer && s.day > s.cargoOffer.expires) {
    addLog(s, `A proposta da ${clientName(s.cargoOffer)} expirou.`, 'info');
    s.cargoOffer = null;
  }
  if (
    hasCargoDivision(s) &&
    !s.cargoOffer &&
    s.contracts.length < MAX_CONTRACTS &&
    s.day >= s.nextCargoOffer
  ) {
    s.cargoOffer = generateOffer(s);
    s.nextCargoOffer = s.day + OFFER_GAP_MIN + randInt(s, OFFER_GAP_SPREAD + 1);
    const o = s.cargoOffer;
    if (o)
      addLog(
        s,
        `Proposta de contrato de carga: ${clientName(o)}, ${fmtDec(o.tons)} t/dia em ${o.from}–${o.to}.`,
        'event',
      );
  }
  return income;
}
