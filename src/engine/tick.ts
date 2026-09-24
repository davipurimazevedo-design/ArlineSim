import { MODELS } from './data/aircraft';
import { pickEvent } from './events';
import {
  BANKRUPTCY_CASH,
  clamp,
  dailyInterest,
  DEFAULT_AI,
  maintCost,
  maintDays,
  modVal,
  slotFee,
} from './formulas';
import { addLog, changeRep, routeOfPlane } from './helpers';
import { chance, randInt, randRange } from './rng';
import { routeProfit, simRoute } from './simRoute';
import type { DayReport, GameState, SimResult } from './types';

export const HISTORY_MAX = 120;
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

  // 3–4. rotas e reação da IA
  const byRoute = new Map<string, SimResult>();
  for (const r of s.routes) {
    const x = simRoute(s, r);
    byRoute.set(r.id, x);
    day.rev += x.rev;
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
    if (s.day % 30 === 0) {
      if (x.share > 0.55) r.ai = clamp(r.ai + 0.06, 0.8, 2.2);
      else r.ai += (DEFAULT_AI - r.ai) * 0.2;
    }
  }

  // 5–6. frota: leasing, manutenção, desgaste, panes
  for (const p of s.fleet) {
    const m = MODELS[p.model];
    if (!p.owned) day.lease += m.lease;
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
      p.condition = clamp(p.condition - h * m.wearH * modVal(s, 'wear'), 0, 100);
      p.hours += h;
    }
    if (p.condition < 25 && chance(s, 0.06)) {
      const cost = Math.round(maintCost(p) * 1.5);
      p.maint = maintDays(p) + 2;
      p.restore = true;
      day.maint += cost;
      changeRep(s, -3);
      addLog(s, `Pane no ${p.reg}. Aeronave em solo (AOG) por ${p.maint} dias.`, 'bad');
    }
  }

  // 7. custos fixos
  day.slots = s.slots.reduce((a, c) => a + slotFee(c), 0);
  day.overhead = 8000 + 2500 * s.fleet.length;
  day.interest = dailyInterest(s.debt);

  // 8. relatório do dia
  const cost =
    day.fuel +
    day.crew +
    day.lease +
    day.fees +
    day.svc +
    day.slots +
    day.overhead +
    day.interest +
    day.maint;
  day.profit = day.rev - cost;
  s.cash += day.profit;

  // 9. reputação tende a um alvo
  const act = s.routes.filter((r) => byRoute.get(r.id)?.flying);
  if (act.length) {
    const svc = act.reduce((a, r) => a + r.service, 0) / act.length;
    const cond = s.fleet.length ? s.fleet.reduce((a, p) => a + p.condition, 0) / s.fleet.length : 80;
    const target = clamp(38 + svc * 12 + (cond - 60) / 3, 5, 95);
    changeRep(s, (target - s.reputation) * 0.015);
  }

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
    s.nextEvent = s.day + 20 + randInt(s, 20);
  }
}
