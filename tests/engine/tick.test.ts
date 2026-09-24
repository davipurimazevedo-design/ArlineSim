import { describe, expect, it } from 'vitest';
import { MODELS } from '../../src/engine/data/aircraft';
import { maintCost, slotFee } from '../../src/engine/formulas';
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
    const p = addTestPlane(s, 'AT7', { condition: 20 });
    let days = 0;
    while (p.maint === 0 && days < 500) {
      const expectedCost = Math.round(maintCost(p) * 1.5);
      const rep = s.reputation;
      tick(s);
      days++;
      if (p.maint > 0) {
        expect(s.lastDay?.maint).toBe(expectedCost);
        expect(p.maint).toBe(2 + Math.ceil(80 / 20) + 2);
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
    s.day = 29;
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

  it('sorteia o primeiro evento no dia 25 e agenda o próximo em 30–59 dias', () => {
    const s = makeGame();
    for (let i = 0; i < 23; i++) tick(s);
    expect(s.day).toBe(24);
    expect(s.pendingEvent).toBeNull();
    tick(s);
    expect(s.pendingEvent).not.toBeNull();
    expect(s.nextEvent).toBeGreaterThanOrEqual(55);
    expect(s.nextEvent).toBeLessThanOrEqual(84);
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
