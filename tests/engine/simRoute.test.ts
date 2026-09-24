import { describe, expect, it } from 'vitest';
import { MODELS, MODEL_KEYS } from '../../src/engine/data/aircraft';
import { baseDemand, fairPrice, seasonality } from '../../src/engine/formulas';
import { routeProfit, simRoute } from '../../src/engine/simRoute';
import type { AirportCode } from '../../src/engine/types';
import { addTestPlane, addTestRoute, loadPrototypeEngine, makeGame } from './helpers';

const proto = loadPrototypeEngine();

describe('simRoute', () => {
  it('não voa sem aeronave, em manutenção ou com halt', () => {
    const s = makeGame();
    const r = addTestRoute(s, 'BSB', 'CNF', null);
    expect(simRoute(s, r)).toMatchObject({ flying: false, rev: 0, reason: 'Sem aeronave' });
    const p = addTestPlane(s, 'AT7', { maint: 3 });
    r.planeId = p.id;
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
    const pairs: [AirportCode, AirportCode][] = [['BSB', 'CNF'], ['GRU', 'GIG'], ['GRU', 'REC'], ['GRU', 'LIS'], ['BSB', 'GYN'], ['GIG', 'MIA']];
    for (const key of MODEL_KEYS) {
      for (const [a, b] of pairs) {
        for (const lic of [0, 1, 2] as const) {
          const s = makeGame();
          s.day = 77;
          s.reputation = 63;
          s.license = lic;
          s.fuelIdx = 1.13;
          s.mods = [{ type: 'demand', value: 1.2, until: 100 }, { type: 'fuel', value: 0.9, until: 100 }];
          const p = addTestPlane(s, key, { condition: 45 });
          const r = addTestRoute(s, a, b, p.id, { freq: 1, price: fairPrice(0) + 333, service: 2, ai: 1.4 });
          const mine = simRoute(s, r);
          const theirs = proto.simRoute(JSON.parse(JSON.stringify(s)), JSON.parse(JSON.stringify(r)));
          for (const k of ['pax', 'paxJ', 'rev', 'fuel', 'crew', 'fees', 'svc', 'share', 'lf', 'hours'] as const) {
            expect(mine[k]).toBeCloseTo(theirs[k], 6);
          }
        }
      }
    }
  });
});
