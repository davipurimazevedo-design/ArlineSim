import { describe, expect, it } from 'vitest';
import { MODELS, MODEL_KEYS } from '../../src/engine/data/aircraft';
import { baseDemand, blockHours, fairPrice, freqFactor, seasonality } from '../../src/engine/formulas';
import { routeProfit, simRoute } from '../../src/engine/simRoute';
import type { AirportCode } from '../../src/engine/types';
import { addTestPlane, addTestRoute, loadPrototypeEngine, makeGame, toProtoRoute } from './helpers';

const proto = loadPrototypeEngine();

describe('simRoute', () => {
  it('não voa sem aeronave, em manutenção ou com halt', () => {
    const s = makeGame();
    const r = addTestRoute(s, 'BSB', 'CNF', null);
    expect(simRoute(s, r)).toMatchObject({ flying: false, rev: 0, reason: 'Sem aeronave' });
    const p = addTestPlane(s, 'AT7', { maint: 3 });
    r.planes = [{ id: p.id, freq: 2 }];
    expect(simRoute(s, r)).toMatchObject({ flying: false, reason: 'Em manutenção' });
    p.maint = 0;
    s.mods.push({ type: 'halt', value: 1, until: s.day + 1 });
    expect(simRoute(s, r)).toMatchObject({ flying: false, reason: 'Operações suspensas' });
  });

  it('calcula share = A / (A + ai) na tarifa de referência', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'CNF', p.id, { freq: 2 });
    const x = simRoute(s, r);
    const q = 0.75 + 0.5 * 0.5;
    const A = 1 * q * (0.7 + 0.2);
    expect(x.share).toBeCloseTo(A / (A + 1.2));
    const demand = baseDemand('BSB', 'CNF') * seasonality(s.day);
    expect(x.pax).toBe(Math.round(Math.min(70 * 4, demand * x.share)));
  });

  it('tarifa mais alta derruba o share', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'CNF', p.id);
    const base = simRoute(s, r).share;
    r.price = fairPrice(r.dist) * 1.5;
    expect(simRoute(s, r).share).toBeLessThan(base);
  });

  it('respeita o teto de capacidade', () => {
    const s = makeGame('GRU');
    const p = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'GRU', 'GIG', p.id, { freq: 1, price: 100 });
    const x = simRoute(s, r);
    expect(x.pax).toBe(140);
    expect(x.lf).toBe(1);
  });

  it('executiva só com licença 2 e aeronave com J', () => {
    const s = makeGame('GRU');
    const p = addTestPlane(s, 'A339');
    const r = addTestRoute(s, 'GRU', 'LIS', p.id, { freq: 1 });
    s.license = 1;
    expect(simRoute(s, r).paxJ).toBe(0);
    s.license = 2;
    const x = simRoute(s, r);
    expect(x.paxJ).toBeGreaterThan(0);
    expect(x.paxJ).toBeLessThanOrEqual(MODELS.A339.j * 2);
    const narrow = addTestPlane(s, 'A20N');
    const r2 = addTestRoute(s, 'GRU', 'EZE', narrow.id, { freq: 1 });
    expect(simRoute(s, r2).paxJ).toBe(0);
  });

  it('condição < 50 reduz a qualidade', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'CNF', p.id);
    const good = simRoute(s, r).share;
    p.condition = 40;
    expect(simRoute(s, r).share).toBeLessThan(good);
  });

  it('resultado da rota desconta o leasing só de avião arrendado', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'CNF', p.id);
    const x = simRoute(s, r);
    const variable = x.rev - x.fuel - x.crew - x.fees - x.svc;
    expect(routeProfit(s, r, x)).toBeCloseTo(variable - MODELS.AT7.lease);
    p.owned = true;
    expect(routeProfit(s, r, x)).toBeCloseTo(variable);
  });

  it('é idêntica ao protótipo em vários cenários', () => {
    const pairs: [AirportCode, AirportCode][] = [
      ['BSB', 'CNF'],
      ['GRU', 'GIG'],
      ['BSB', 'GYN'],
      ['GRU', 'CWB'],
    ];
    for (const key of MODEL_KEYS) {
      for (const [a, b] of pairs) {
        // paridade só onde as regras não mudaram: rotas domésticas até 1.500 km, sem executiva
        for (const lic of [0, 1] as const) {
          const s = makeGame();
          s.day = 77;
          s.reputation = 63;
          s.license = lic;
          s.fuelIdx = 1.13;
          s.mods = [
            { type: 'demand', value: 1.2, until: 100 },
            { type: 'fuel', value: 0.9, until: 100 },
          ];
          const p = addTestPlane(s, key, { condition: 45 });
          const r = addTestRoute(s, a, b, p.id, { freq: 1, price: fairPrice(0) + 333, service: 2, ai: 1.4 });
          const mine = simRoute(s, r);
          const theirs = proto.simRoute(JSON.parse(JSON.stringify(s)), toProtoRoute(r));
          for (const k of [
            'pax',
            'paxJ',
            'rev',
            'fuel',
            'crew',
            'fees',
            'svc',
            'share',
            'lf',
            'hours',
          ] as const) {
            expect(mine[k]).toBeCloseTo(theirs[k], 6);
          }
        }
      }
    }
  });

  it('narrowbody com cabine mista vende executiva com licença 2', () => {
    const s = makeGame('GRU');
    s.license = 2;
    const p = addTestPlane(s, 'A20N', { cabin: 1 });
    const r = addTestRoute(s, 'GRU', 'EZE', p.id, { freq: 1 });
    const x = simRoute(s, r);
    expect(x.paxJ).toBeGreaterThan(0);
    expect(x.paxJ).toBeLessThanOrEqual(12 * 2);
    expect(x.pax).toBeLessThanOrEqual(138 * 2);
  });

  describe('várias aeronaves', () => {
    it('soma capacidade, frequência e horas de cada avião', () => {
      const s = makeGame('GRU');
      const a = addTestPlane(s, 'AT7');
      const b = addTestPlane(s, 'AT7');
      const r = addTestRoute(s, 'GRU', 'GIG', a.id, { freq: 1, price: 100 });
      r.planes.push({ id: b.id, freq: 2 });
      const x = simRoute(s, r);
      expect(x.freq).toBe(3);
      expect(x.pax).toBe(70 * 3 * 2);
      const bh = blockHours(MODELS.AT7, r.dist);
      expect(x.planeHours[a.id]).toBeCloseTo(2 * bh);
      expect(x.planeHours[b.id]).toBeCloseTo(4 * bh);
      expect(x.hours).toBeCloseTo(6 * bh);
    });

    it('avião em manutenção não conta; a rota segue com os outros', () => {
      const s = makeGame('GRU');
      const a = addTestPlane(s, 'AT7', { maint: 2 });
      const b = addTestPlane(s, 'AT7');
      const r = addTestRoute(s, 'GRU', 'GIG', a.id, { freq: 2, price: 100 });
      r.planes.push({ id: b.id, freq: 1 });
      const x = simRoute(s, r);
      expect(x.flying).toBe(true);
      expect(x.freq).toBe(1);
      expect(x.planeHours[a.id]).toBeUndefined();
    });

    it('mais frequência aumenta o share, com ganho menor depois de 6 voos', () => {
      expect(freqFactor(6) - freqFactor(5)).toBeCloseTo(0.1);
      expect(freqFactor(7) - freqFactor(6)).toBeCloseTo(0.05);
      expect(freqFactor(14)).toBeCloseTo(freqFactor(10));
    });

    it('penalidade de condição proporcional à capacidade desgastada', () => {
      const s = makeGame();
      const a = addTestPlane(s, 'AT7');
      const b = addTestPlane(s, 'AT7', { condition: 30 });
      const r = addTestRoute(s, 'BSB', 'CNF', a.id, { freq: 1 });
      r.planes.push({ id: b.id, freq: 1 });
      const mixed = simRoute(s, r).share;
      b.condition = 100;
      const fresh = simRoute(s, r).share;
      a.condition = 30;
      b.condition = 30;
      const worn = simRoute(s, r).share;
      expect(worn).toBeLessThan(mixed);
      expect(mixed).toBeLessThan(fresh);
    });

    it('resultado da rota desconta o leasing de todos os arrendados', () => {
      const s = makeGame();
      const a = addTestPlane(s, 'AT7');
      const b = addTestPlane(s, 'AT7', { owned: true });
      const c = addTestPlane(s, 'AT7');
      const r = addTestRoute(s, 'BSB', 'CNF', a.id, { freq: 1 });
      r.planes.push({ id: b.id, freq: 1 }, { id: c.id, freq: 1 });
      const x = simRoute(s, r);
      expect(routeProfit(s, r, x)).toBeCloseTo(
        x.rev - x.fuel - x.crew - x.fees - x.svc - 2 * MODELS.AT7.lease,
      );
    });
  });
});
