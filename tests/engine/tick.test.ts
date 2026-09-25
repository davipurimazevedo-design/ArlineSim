import * as actions from '../../src/engine/actions';
import { describe, expect, it } from 'vitest';
import { MODELS } from '../../src/engine/data/aircraft';
import { slotFee } from '../../src/engine/formulas';
import { simRoute } from '../../src/engine/simRoute';
import { maintCostFor } from '../../src/engine/hubs';
import { tick } from '../../src/engine/tick';
import { addTestPlane, addTestRoute, makeGame } from './helpers';

describe('tick', () => {
  it('avança o dia, registra histórico e relatório', () => {
    const s = makeGame();
    tick(s);
    expect(s.day).toBe(2);
    expect(s.history).toHaveLength(1);
    expect(s.lastDay?.day).toBe(2);
    expect(s.lastDay?.slots).toBe(slotFee('BSB'));
    expect(s.lastDay?.overhead).toBe(8000);
  });

  it('mantém o querosene entre 0,7 e 1,6', () => {
    const s = makeGame();
    s.fuelIdx = 1.6;
    for (let i = 0; i < 300; i++) {
      tick(s);
      expect(s.fuelIdx).toBeGreaterThanOrEqual(0.7);
      expect(s.fuelIdx).toBeLessThanOrEqual(1.6);
    }
  });

  it('cobra leasing com avião parado e em manutenção', () => {
    const s = makeGame();
    addTestPlane(s, 'AT7');
    addTestPlane(s, 'E295', { maint: 3 });
    addTestPlane(s, 'A20N', { owned: true });
    tick(s);
    expect(s.lastDay?.lease).toBe(MODELS.AT7.lease + MODELS.E295.lease);
    expect(s.lastDay?.overhead).toBe(8000 + 2500 * 3);
  });

  it('manutenção restaura a condição para 100 ao terminar', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7', { condition: 30, maint: 2 });
    tick(s);
    expect(p.maint).toBe(1);
    expect(p.condition).toBe(30);
    tick(s);
    expect(p.maint).toBe(0);
    expect(p.condition).toBe(100);
    expect(s.log[0]?.text).toContain('liberado da manutenção');
  });

  it('inspeção (restore = false) não restaura a condição', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7', { condition: 70, maint: 1, restore: false });
    tick(s);
    expect(p.maint).toBe(0);
    expect(p.condition).toBe(70);
  });

  it('avião voando se desgasta e acumula horas', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'CNF', p.id, { freq: 2 });
    tick(s);
    const hours = 2 * 2 * (r.dist / 500 + 0.5);
    expect(p.hours).toBeCloseTo(hours);
    expect(p.condition).toBeCloseTo(100 - hours * 0.08);
    expect(r.last?.flying).toBe(true);
  });

  it('cada avião da rota se desgasta pelas próprias horas', () => {
    const s = makeGame();
    const a = addTestPlane(s, 'AT7');
    const b = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'CNF', a.id, { freq: 1 });
    r.planes.push({ id: b.id, freq: 3 });
    tick(s);
    expect(b.hours).toBeCloseTo(3 * a.hours);
    expect(100 - b.condition).toBeCloseTo(3 * (100 - a.condition));
  });

  it('pane: avião abaixo de 25% quebra em algum momento, com custo 1,5× e +2 dias', () => {
    const s = makeGame('BSB', 7);
    s.autoMaint = 0; // sem a manutenção automática, que se anteciparia à pane
    const p = addTestPlane(s, 'AT7', { condition: 20 });
    let days = 0;
    while (p.maint === 0 && days < 500) {
      const expectedCost = Math.round(maintCostFor(s, p) * 1.5);
      const rep = s.reputation;
      tick(s);
      days++;
      if (p.maint > 0) {
        expect(s.lastDay?.maint).toBe(expectedCost);
        expect(p.maint).toBe(2 + Math.ceil(80 / 20) - 1 + 2); // base do hub: 1 dia a menos
        expect(s.reputation).toBeCloseTo(rep - 3);
        expect(s.log[0]?.text).toContain('Pane no');
      }
    }
    expect(p.maint).toBeGreaterThan(0);
  });

  it('IA endurece com share alto a cada 30 dias', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'CNF', p.id, { price: 200, ai: 1.2 });
    s.day = 30; // rota aberta no dia 1: reage no dia 31 (30 dias de vida)
    s.nextEvent = 9999;
    tick(s);
    expect(r.last!.share).toBeGreaterThan(0.55);
    expect(r.ai).toBeCloseTo(1.26);
  });

  it('decreta falência abaixo de −R$ 15 mi e não sorteia evento', () => {
    const s = makeGame();
    s.cash = -14.99e6;
    s.nextEvent = 1;
    addTestPlane(s, 'A339');
    tick(s);
    expect(s.gameOver).toBe(true);
    expect(s.pendingEvent).toBeNull();
    expect(s.log[0]?.text).toBe('Os credores assumiram a companhia.');
    const day = s.day;
    tick(s);
    expect(s.day).toBe(day);
  });

  it('sorteia o primeiro evento no dia 40 e agenda o próximo em 45–89 dias', () => {
    const s = makeGame();
    for (let i = 0; i < 38; i++) tick(s);
    expect(s.day).toBe(39);
    expect(s.pendingEvent).toBeNull();
    tick(s);
    expect(s.pendingEvent).not.toBeNull();
    expect(s.nextEvent).toBeGreaterThanOrEqual(85);
    expect(s.nextEvent).toBeLessThanOrEqual(129);
  });

  it('manutenção automática: abaixo do limite, entra sozinha se houver caixa', () => {
    const s = makeGame();
    s.nextEvent = 1e9;
    expect(s.autoMaint).toBe(50);
    const p = addTestPlane(s, 'AT7', { condition: 48 });
    tick(s);
    expect(p.maint).toBeGreaterThan(0);
    expect(s.lastDay!.maint).toBeGreaterThan(0);
    expect(s.log[0]?.text).toContain('Manutenção automática');
    // sem caixa, espera
    const t = makeGame();
    t.nextEvent = 1e9;
    t.cash = 0;
    const q = addTestPlane(t, 'AT7', { condition: 48 });
    tick(t);
    expect(q.maint).toBe(0);
    // desligada
    const u = makeGame();
    u.nextEvent = 1e9;
    expect(actions.setAutoMaint(u, 0)).toBeNull();
    expect(actions.setAutoMaint(u, 33)).toBe('Limite inválido.');
    const r = addTestPlane(u, 'AT7', { condition: 48 });
    tick(u);
    expect(r.maint).toBe(0);
  });

  it('remove modificadores vencidos e limita histórico e diário', () => {
    const s = makeGame();
    s.mods.push({ type: 'demand', value: 2, until: 3 });
    s.nextEvent = 1e9;
    tick(s);
    expect(s.mods).toHaveLength(1);
    tick(s);
    expect(s.mods).toHaveLength(0);
    for (let i = 0; i < 100; i++) s.log.push({ day: 1, text: 'x', tone: 'info' });
    for (let i = 0; i < 150; i++) tick(s);
    expect(s.history).toHaveLength(120);
    expect(s.log.length).toBeLessThanOrEqual(60);
  });

  it('é determinístico para a mesma semente', () => {
    const run = () => {
      const s = makeGame('GRU', 42);
      const p = addTestPlane(s, 'AT7', { id: 'x' });
      addTestRoute(s, 'GRU', 'CWB', p.id);
      for (let i = 0; i < 200; i++) {
        tick(s);
        s.pendingEvent = null;
      }
      return JSON.stringify([s.cash, s.reputation, s.fuelIdx, s.seed, s.history, s.usedEvents]);
    };
    expect(run()).toBe(run());
  });
});

describe('correções do balanceamento', () => {
  it('modificador de N dias vale exatamente N dias', () => {
    const s = makeGame();
    s.nextEvent = 1e9;
    s.mods.push({ type: 'halt', value: 1, until: s.day + 3 });
    const p = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'CNF', p.id);
    const flying: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      tick(s);
      flying.push(r.last!.flying);
    }
    expect(flying).toEqual([false, false, false, true, true]);
  });

  it('IA reage pela idade de cada rota, não pelo calendário', () => {
    const s = makeGame();
    s.nextEvent = 1e9;
    const a = addTestPlane(s, 'AT7');
    const b = addTestPlane(s, 'AT7');
    const r1 = addTestRoute(s, 'BSB', 'CNF', a.id, { price: 200 });
    s.day = 10;
    const r2 = addTestRoute(s, 'BSB', 'SSA', b.id, { price: 200 });
    s.day = 30;
    tick(s); // dia 31: r1 faz 30 dias
    expect(r1.ai).toBeCloseTo(1.26);
    expect(r2.ai).toBe(1.2);
    for (let i = 0; i < 9; i++) tick(s); // dia 40: r2 faz 30 dias
    expect(r2.ai).toBeCloseTo(1.26);
  });

  it('guerra tarifária baixa a tarifa cobrada por 30 dias e depois volta', () => {
    const s = makeGame();
    s.nextEvent = 1e9;
    const p = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'CNF', p.id, { freq: 1 });
    s.mods.push({ type: 'fare', value: 0.85, until: s.day + 30 });
    tick(s);
    const during = r.last!;
    const x = simRoute(s, r);
    expect(x.rev / Math.max(1, x.pax)).toBeCloseTo(r.price * 0.85);
    for (let i = 0; i < 30; i++) tick(s);
    expect(s.mods).toHaveLength(0);
    const after = simRoute(s, r);
    expect(after.rev / Math.max(1, after.pax)).toBeCloseTo(r.price);
    expect(during.share).toBeGreaterThan(after.share);
  });
});
