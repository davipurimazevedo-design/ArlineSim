import { describe, expect, it } from 'vitest';
import * as actions from '../../src/engine/actions';
import {
  AGE_VALUE_FLOOR,
  ageMaintFactor,
  ageValueFactor,
  ageWearFactor,
  generateUsedMarket,
  USED_OFFERS,
  usedLease,
  usedPrice,
} from '../../src/engine/aging';
import { cargoDemand } from '../../src/engine/cargo';
import { MODELS } from '../../src/engine/data/aircraft';
import { planeValue } from '../../src/engine/formulas';
import { maintCost } from '../../src/engine/formulas';
import { maintCostFor } from '../../src/engine/hubs';
import { simRoute } from '../../src/engine/simRoute';
import { tick } from '../../src/engine/tick';
import type { GameState } from '../../src/engine/types';
import { migrate } from '../../src/store/migrate';
import { addTestPlane, addTestRoute, makeGame } from './helpers';

const YEAR = 365;

describe('idade dos aviões', () => {
  it('avião novo sai com idade 0 e fatores neutros', () => {
    const s = makeGame();
    s.cash = 100e6;
    actions.lease(s, 'AT7');
    const p = s.fleet[0]!;
    expect(p.built).toBe(s.day);
    expect(ageMaintFactor(p, s.day)).toBe(1);
    expect(ageWearFactor(p, s.day)).toBe(1);
  });

  it('10 anos: manutenção +40%, desgaste +20%, revenda a 60%', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7', { owned: true, condition: 60, built: s.day - 10 * YEAR });
    expect(ageMaintFactor(p, s.day)).toBeCloseTo(1.4);
    expect(ageWearFactor(p, s.day)).toBeCloseTo(1.2);
    expect(planeValue(p, s.day) / planeValue(p)).toBeCloseTo(0.95 ** 10);
    // a manutenção na base (hub) também encarece com a idade
    const young = addTestPlane(s, 'AT7', { owned: true, condition: 60 });
    expect(maintCostFor(s, p)).toBeGreaterThan(maintCostFor(s, young) * 1.3);
    expect(maintCost(p)).toBe(maintCost(young));
  });

  it('revenda tem piso de 25%', () => {
    expect(ageValueFactor(60)).toBe(AGE_VALUE_FLOOR);
  });

  it('avião velho desgasta mais rápido no tick', () => {
    const s = makeGame();
    const a = addTestPlane(s, 'AT7');
    const b = addTestPlane(s, 'AT7', { built: s.day - 15 * YEAR });
    addTestRoute(s, 'BSB', 'CNF', a.id, { freq: 2 });
    addTestRoute(s, 'BSB', 'GYN', b.id, { freq: 2, dist: 600 });
    s.routes[1]!.dist = s.routes[0]!.dist; // mesma distância: mesmas horas de voo
    tick(s, { noEvents: true });
    expect(100 - b.condition).toBeCloseTo((100 - a.condition) * 1.3, 1);
  });

  it('venda desconta a idade', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'A20N', { owned: true, built: s.day - 8 * YEAR });
    const cash = s.cash;
    actions.release(s, p.id);
    expect(s.cash - cash).toBeCloseTo(145e6 * 0.6 * 0.95 ** 8);
  });

  it('save v10 ganha a idade contada da entrada na frota', () => {
    const s = makeGame();
    addTestPlane(s, 'AT7');
    const raw = JSON.parse(JSON.stringify({ ...s, v: 10 }));
    delete raw.fleet[0].built;
    delete raw.usedMarket;
    raw.fleet[0].since = 40;
    const g = migrate(raw)!;
    expect(g.fleet[0]!.built).toBe(40);
    expect(g.usedMarket).toEqual([]);
  });
});

describe('mercado de usados', () => {
  function withMarket(): GameState {
    const s = makeGame();
    s.cash = 500e6;
    tick(s, { noEvents: true });
    return s;
  }

  it('o tick abre uma lista de 5 usados e renova a cada 30 dias', () => {
    const s = withMarket();
    expect(s.usedMarket).toHaveLength(USED_OFFERS);
    const first = s.usedMarket.map((o) => o.id);
    expect(s.nextUsedMarket).toBe(s.day + 30);
    for (let i = 0; i < 30; i++) tick(s, { noEvents: true });
    expect(s.usedMarket.map((o) => o.id)).not.toEqual(first);
  });

  it('a lista respeita o que a companhia pode operar e não mexe no sorteio do jogo', () => {
    const s = withMarket();
    for (const o of s.usedMarket) {
      expect(MODELS[o.model].tier).toBe(0); // licença Regional
      expect(MODELS[o.model].cargo).toBeUndefined(); // sem divisão Cargas
    }
    const a = makeGame();
    const b = makeGame();
    b.name = 'Outra';
    tick(a, { noEvents: true });
    tick(b, { noEvents: true });
    expect(a.seed).toBe(b.seed); // o RNG do jogo andou igual
  });

  it('preço e leasing caem com a idade', () => {
    expect(usedPrice('A20N', 10, 75) / MODELS.A20N.price).toBeCloseTo(0.51, 1);
    expect(usedLease('A20N', 10)).toBe(Math.round((88000 * 0.7) / 100) * 100);
    expect(usedLease('A20N', 30)).toBe(44000); // piso de 50%
  });

  it('comprar, arrendar e financiar usado; a oferta sai da lista', () => {
    const s = withMarket();
    const [a, b, c] = s.usedMarket;
    expect(actions.buyUsed(s, a!.id)).toBeNull();
    const pa = s.fleet.at(-1)!;
    expect(pa.owned).toBe(true);
    expect(pa.condition).toBe(a!.condition);
    expect(pa.built).toBe(a!.built);
    expect(actions.leaseUsed(s, b!.id)).toBeNull();
    const pb = s.fleet.at(-1)!;
    expect(pb.lease).toBe(b!.lease);
    expect(actions.financeUsed(s, c!.id, 2920)).toMatch(/3 ou 5 anos/);
    expect(actions.financeUsed(s, c!.id, 1825)).toBeNull();
    expect(s.fleet.at(-1)!.loan).toBeTruthy();
    expect(s.usedMarket).toHaveLength(USED_OFFERS - 3);
    expect(actions.buyUsed(s, a!.id)).toMatch(/não está mais/);
  });

  it('o tick cobra o leasing do usado, não o do novo', () => {
    const s = withMarket();
    const o = s.usedMarket[0]!;
    actions.leaseUsed(s, o.id);
    tick(s, { noEvents: true });
    expect(s.lastDay!.lease).toBe(o.lease);
  });

  it('a lista é reproduzível para o mesmo jogo', () => {
    const s = makeGame();
    expect(generateUsedMarket(s, ['AT7', 'AT4'])).toEqual(generateUsedMarket(s, ['AT7', 'AT4']));
  });
});

describe('carga no porão', () => {
  function paxRoute(division: boolean) {
    const s = makeGame('GRU');
    s.license = 1;
    s.cash = 100e6;
    if (division) actions.buyDivision(s, 'cargas');
    const p = addTestPlane(s, 'A20N');
    const r = addTestRoute(s, 'GRU', 'MAO', p.id, { freq: 1 });
    return { s, r };
  }

  it('sem a divisão, rota de passageiros não leva carga', () => {
    const { s, r } = paxRoute(false);
    const x = simRoute(s, r);
    expect(x.tons).toBe(0);
    expect(x.cargoRev).toBe(0);
  });

  it('com a divisão, leva até 1,5 t por voo e sentido no narrowbody', () => {
    const { s, r } = paxRoute(true);
    const x = simRoute(s, r);
    expect(x.tons).toBeGreaterThan(0);
    expect(x.tons).toBeLessThanOrEqual(3); // 1 voo, ida e volta
    expect(x.tons).toBeLessThanOrEqual(cargoDemand('GRU', 'MAO') * 0.5);
    expect(x.cargoRev).toBeGreaterThan(0);
    // o frete do porão vai para a linha de carga no relatório do dia
    tick(s, { noEvents: true });
    expect(s.lastDay!.cargo).toBeCloseTo(x.cargoRev, -2);
    expect(s.lastDay!.tons).toBeGreaterThan(0);
  });

  it('o porão não conta para a capacidade dos contratos', async () => {
    const { cargoCapacityOn } = await import('../../src/engine/cargo');
    const { s } = paxRoute(true);
    expect(cargoCapacityOn(s, 'GRU', 'MAO').tons).toBe(0);
  });
});
