import { MODEL_KEYS, MODELS } from './data/aircraft';
import { acquireBlock } from './actions';
import { ageWearFactor, generateUsedMarket, planeLease, USED_REFRESH_DAYS } from './aging';
import { EVENT_GAP_MIN, EVENT_GAP_SPREAD, pickEvent } from './events';
import { checkGoals } from './goals';
import { payInstallment } from './finance';
import { processContracts } from './contracts';
import { codeshareDailyCost, driftFx } from './international';
import { extraHubsDailyCost, maintCostFor, maintDaysFor } from './hubs';
import { BANKRUPTCY_CASH, clamp, dailyInterest, baseCompetition, modVal } from './formulas';
import { addLog, changeRep, routeOfPlane } from './helpers';
import { chance, randInt, randRange } from './rng';
import { driftRivals } from './rivals';
import { rules, slotFeeFor } from './rules';
import { routeProfit, simRoute } from './simRoute';
import type { DayReport, GameState, SimResult } from './types';

export const HISTORY_MAX = 120;
export const AI_REACTION_DAYS = 30;
export const LOG_MAX = 60;

export interface TickOptions {
  /** true na simulação offline: nenhum evento é sorteado */
  noEvents?: boolean;
}

/** Avança um dia de jogo. Muta o estado. */
export function tick(s: GameState, opts: TickOptions = {}): void {
  if (s.gameOver) return;

  // 1. dia
  s.day++;
  const day: DayReport = {
    day: s.day,
    rev: 0,
    fuel: 0,
    crew: 0,
    lease: 0,
    loans: 0,
    cargo: 0,
    contracts: 0,
    tons: 0,
    fees: 0,
    svc: 0,
    slots: 0,
    overhead: 0,
    interest: 0,
    maint: 0,
    pax: 0,
    profit: 0,
  };

  // 2. querosene: passeio aleatório com reversão à média
  s.fuelIdx = clamp(s.fuelIdx + (1 - s.fuelIdx) * 0.02 + randRange(s, -0.0125, 0.0125), 0.7, 1.6);
  driftFx(s);

  // 3–4. rotas e reação da IA
  const byRoute = new Map<string, SimResult>();
  for (const r of s.routes) {
    const x = simRoute(s, r);
    byRoute.set(r.id, x);
    day.cargo += x.cargoRev;
    day.rev += x.rev - x.cargoRev;
    day.tons += x.tons;
    day.fuel += x.fuel;
    day.crew += x.crew;
    day.fees += x.fees;
    day.svc += x.svc;
    day.pax += x.pax + x.paxJ;
    r.last = {
      pax: x.pax,
      paxJ: x.paxJ,
      share: x.share,
      lf: x.lf,
      profit: routeProfit(s, r, x),
      reason: x.reason,
      flying: x.flying,
    };
    // a cada 30 dias de vida da rota (o protótipo usava o calendário global)
    const age = s.day - r.opened;
    if (age > 0 && age % AI_REACTION_DAYS === 0) {
      if (x.share > 0.55) r.ai = clamp(r.ai + rules(s).aiStep, 0.8, 2.2);
      else r.ai += (baseCompetition(r.from, r.to) - r.ai) * 0.2;
      driftRivals(r);
    }
  }

  // 5–6. frota: leasing, manutenção, desgaste, panes
  for (const p of s.fleet) {
    const m = MODELS[p.model];
    if (!p.owned) day.lease += planeLease(p);
    if (p.loan) {
      day.loans += payInstallment(p);
      if (!p.loan) addLog(s, `Financiamento do ${p.reg} quitado.`, 'good');
    }
    if (p.maint > 0) {
      p.maint--;
      if (p.maint === 0) {
        if (p.restore) p.condition = 100;
        addLog(s, p.restore ? `${p.reg} liberado da manutenção.` : `${p.reg} voltou à operação.`, 'good');
      }
      continue;
    }
    const r = routeOfPlane(s, p.id);
    const h = (r && byRoute.get(r.id)?.planeHours[p.id]) ?? 0;
    if (h > 0) {
      p.condition = clamp(p.condition - h * m.wearH * modVal(s, 'wear') * ageWearFactor(p, s.day), 0, 100);
      p.hours += h;
    }
    if (p.condition < 25 && chance(s, 0.06)) {
      const cost = Math.round(maintCostFor(s, p) * 1.5);
      p.maint = maintDaysFor(s, p) + 2;
      p.restore = true;
      day.maint += cost;
      changeRep(s, -3);
      addLog(s, `Pane no ${p.reg}. Aeronave em solo (AOG) por ${p.maint} dias.`, 'bad');
    }
  }

  // 6b. contratos de carga e lista de usados
  day.contracts = processContracts(s);
  if (s.day >= s.nextUsedMarket) {
    s.usedMarket = generateUsedMarket(
      s,
      MODEL_KEYS.filter((k) => !acquireBlock(s, k)),
    );
    s.nextUsedMarket = s.day + USED_REFRESH_DAYS;
  }

  // 7. custos fixos
  day.slots = s.slots.reduce((a, c) => a + slotFeeFor(s, c), 0);
  day.overhead =
    (8000 + 2500 * s.fleet.length) * rules(s).overheadFactor + extraHubsDailyCost(s) + codeshareDailyCost(s);
  day.interest = dailyInterest(s.debt);

  // 8. relatório do dia
  const cost =
    day.fuel +
    day.crew +
    day.lease +
    day.loans +
    day.fees +
    day.svc +
    day.slots +
    day.overhead +
    day.interest +
    day.maint;
  day.profit = day.rev + day.cargo + day.contracts - cost;
  s.cash += day.profit;

  // 9. reputação tende a um alvo
  const act = s.routes.filter((r) => byRoute.get(r.id)?.flying);
  if (act.length) {
    const svc = act.reduce((a, r) => a + r.service, 0) / act.length;
    const cond = s.fleet.length ? s.fleet.reduce((a, p) => a + p.condition, 0) / s.fleet.length : 80;
    const target = clamp(38 + svc * 12 + (cond - 60) / 3, 5, Math.min(95, rules(s).repCap));
    changeRep(s, (target - s.reputation) * 0.015);
  }

  // 9b. objetivos cumpridos viram conquistas (prêmio em reputação)
  checkGoals(s);

  // 10. limpeza e histórico
  s.mods = s.mods.filter((m) => m.until > s.day);
  s.lastDay = day;
  s.history.push({
    day: s.day,
    cash: Math.round(s.cash),
    profit: Math.round(day.profit),
    rep: Math.round(s.reputation),
  });
  if (s.history.length > HISTORY_MAX) s.history.splice(0, s.history.length - HISTORY_MAX);

  // 11. falência (encerra o tick antes do sorteio de eventos)
  if (s.cash < BANKRUPTCY_CASH) {
    s.gameOver = true;
    addLog(s, 'Os credores assumiram a companhia.', 'bad');
  }
  if (s.log.length > LOG_MAX) s.log.length = LOG_MAX;
  if (s.gameOver) return;

  // 12. eventos
  if (!opts.noEvents && !s.pendingEvent && s.day >= s.nextEvent) {
    const ev = pickEvent(s);
    if (ev) s.pendingEvent = ev.id;
    s.nextEvent = s.day + EVENT_GAP_MIN + randInt(s, EVENT_GAP_SPREAD);
  }
}
