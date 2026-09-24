import { describe, expect, it } from 'vitest';
import * as actions from '../../src/engine/actions';
import { MODELS } from '../../src/engine/data/aircraft';
import {
  creditLimit,
  dist,
  fairPrice,
  maintCost,
  maintDays,
  maxFreq,
  planeValue,
  slotCost,
} from '../../src/engine/formulas';
import { addTestPlane, addTestRoute, makeGame } from './helpers';

describe('frota', () => {
  it('arrendar cobra 10 diárias de depósito e exige licença', () => {
    const s = makeGame();
    expect(actions.lease(s, 'AT7')).toBeNull();
    expect(s.cash).toBe(12e6 - 280000);
    expect(s.fleet[0]).toMatchObject({ model: 'AT7', owned: false, condition: 100 });
    expect(s.fleet[0]!.reg).toMatch(/^PR-[A-HJ-NP-Z]{3}$/);
    expect(actions.lease(s, 'E295')).toBe('Licença insuficiente.');
    s.cash = 1000;
    expect(actions.lease(s, 'AT7')).toBe('Caixa insuficiente para o depósito.');
  });

  it('matrículas são únicas', () => {
    const s = makeGame();
    s.cash = 1e12;
    for (let i = 0; i < 200; i++) actions.lease(s, 'AT7');
    expect(new Set(s.fleet.map((p) => p.reg)).size).toBe(200);
  });

  it('comprar exige preço cheio; buyout custa 90%', () => {
    const s = makeGame();
    expect(actions.buy(s, 'AT7')).toBe('Caixa insuficiente.');
    s.cash = 200e6;
    expect(actions.buy(s, 'AT7')).toBeNull();
    expect(s.cash).toBe(145e6);
    const p = addTestPlane(s, 'AT7');
    expect(actions.buyOut(s, p.id)).toBeNull();
    expect(s.cash).toBe(145e6 - 55e6 * 0.9);
    expect(p.owned).toBe(true);
    expect(actions.buyOut(s, p.id)).toBe('Inválido.');
  });

  it('vender credita revenda; devolver não; ambos desescalam', () => {
    const s = makeGame();
    const own = addTestPlane(s, 'AT7', { owned: true, condition: 80 });
    const leased = addTestPlane(s, 'AT7');
    const r1 = addTestRoute(s, 'BSB', 'CNF', own.id);
    const r2 = addTestRoute(s, 'BSB', 'GYN', leased.id);
    const value = planeValue(own);
    const cash = s.cash;
    expect(actions.release(s, own.id)).toBeNull();
    expect(s.cash).toBeCloseTo(cash + value);
    expect(actions.release(s, leased.id)).toBeNull();
    expect(s.cash).toBeCloseTo(cash + value);
    expect(r1.planes).toEqual([]);
    expect(r2.planes).toEqual([]);
    expect(s.fleet).toHaveLength(0);
  });

  it('manutenção cobra e tira de operação', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7', { condition: 50 });
    const cost = maintCost(p);
    const days = maintDays(p);
    expect(actions.maintain(s, p.id)).toBeNull();
    expect(s.cash).toBe(12e6 - cost);
    expect(p.maint).toBe(days);
    expect(actions.maintain(s, p.id)).toBe('Inválido.');
  });
});

describe('slots, licenças e crédito', () => {
  it('slot: custo, duplicado e internacional', () => {
    const s = makeGame();
    expect(actions.buySlot(s, 'CNF')).toBeNull();
    expect(s.cash).toBe(12e6 - slotCost('CNF'));
    expect(actions.buySlot(s, 'CNF')).toBe('Já possui.');
    expect(actions.buySlot(s, 'EZE')).toBe('Requer licença internacional.');
  });

  it('licença só o próximo nível', () => {
    const s = makeGame();
    s.cash = 500e6;
    expect(actions.buyLicense(s, 2)).toBe('Inválido.');
    expect(actions.buyLicense(s, 1)).toBeNull();
    expect(s.cash).toBe(475e6);
    expect(actions.buyLicense(s, 2)).toBeNull();
    expect(s.license).toBe(2);
  });

  it('empréstimo respeita o limite; quitação limitada ao caixa e à dívida', () => {
    const s = makeGame();
    expect(actions.borrow(s, 5e6)).toBeNull();
    expect(actions.borrow(s, 5e6)).toBeNull();
    expect(s.debt).toBe(10e6);
    expect(actions.borrow(s, 5e6)).toBe('Limite de crédito atingido.');
    expect(creditLimit(s)).toBe(10e6);
    expect(actions.repay(s, 5e6)).toBeNull();
    expect(s.debt).toBe(5e6);
    s.cash = 1e6;
    expect(actions.repay(s, 5e6)).toBe('Caixa insuficiente.');
    s.cash = 50e6;
    s.debt = 2e6;
    expect(actions.repay(s, 5e6)).toBeNull();
    expect(s.debt).toBe(0);
    expect(actions.repay(s, 5e6)).toBe('Nenhuma dívida a quitar.');
  });
});

describe('openRoute', () => {
  const setup = () => {
    const s = makeGame('BSB');
    s.slots.push('CNF', 'GRU', 'MAO', 'GYN');
    const atr = addTestPlane(s, 'AT7');
    return { s, atr };
  };

  it('abre com os padrões', () => {
    const { s, atr } = setup();
    expect(actions.openRoute(s, { from: 'BSB', to: 'CNF', planeId: atr.id })).toBeNull();
    const r = s.routes[0]!;
    const d = dist('BSB', 'CNF');
    expect(r).toMatchObject({
      from: 'BSB',
      to: 'CNF',
      dist: d,
      planes: [{ id: atr.id, freq: Math.min(2, maxFreq(MODELS.AT7, d)) }],
      service: 1,
      ai: 1.2,
      opened: s.day,
      price: fairPrice(d),
      priceJ: Math.round((fairPrice(d) * 3.5) / 10) * 10,
    });
    expect(s.log[0]?.text).toBe(`Nova rota BSB–CNF (${d.toLocaleString('pt-BR')} km).`);
  });

  it('origem = destino', () => {
    const { s, atr } = setup();
    expect(actions.openRoute(s, { from: 'BSB', to: 'BSB', planeId: atr.id })).toBe(
      'Escolha dois aeroportos diferentes.',
    );
  });

  it('exige slots nos dois aeroportos', () => {
    const { s, atr } = setup();
    expect(actions.openRoute(s, { from: 'BSB', to: 'REC', planeId: atr.id })).toBe(
      'Você precisa de slots nos dois aeroportos.',
    );
  });

  it('par já existente em qualquer sentido', () => {
    const { s, atr } = setup();
    actions.openRoute(s, { from: 'BSB', to: 'CNF', planeId: atr.id });
    expect(actions.openRoute(s, { from: 'CNF', to: 'BSB', planeId: null })).toBe('Rota já existe.');
  });

  it('fora do alcance', () => {
    const { s, atr } = setup();
    expect(actions.openRoute(s, { from: 'BSB', to: 'MAO', planeId: atr.id })).toBe(
      'Fora do alcance do ATR 72-600.',
    );
  });

  it('licença regional limita a 1.500 km', () => {
    const { s } = setup();
    const jet = addTestPlane(s, 'E295');
    expect(actions.openRoute(s, { from: 'BSB', to: 'MAO', planeId: jet.id })).toBe(
      'Licença regional limita rotas a 1.500 km.',
    );
    s.license = 1;
    expect(actions.openRoute(s, { from: 'BSB', to: 'MAO', planeId: jet.id })).toBeNull();
  });

  it('frequência máxima ≥ 1', () => {
    const s = makeGame('GRU');
    s.license = 2;
    s.slots.push('CDG');
    const wide = addTestPlane(s, 'A339');
    expect(actions.openRoute(s, { from: 'GRU', to: 'CDG', planeId: wide.id })).toBe(
      'Rota longa demais para a utilização diária da aeronave.',
    );
  });

  it('escalar um avião de outra rota o remove de lá', () => {
    const { s, atr } = setup();
    actions.openRoute(s, { from: 'BSB', to: 'CNF', planeId: atr.id });
    actions.openRoute(s, { from: 'BSB', to: 'GYN', planeId: atr.id });
    expect(s.routes[0]!.planes).toEqual([]);
    expect(s.routes[1]!.planes.map((x) => x.id)).toEqual([atr.id]);
  });

  it('sem aeronave abre vazia (sem checar alcance, como no protótipo)', () => {
    const { s } = setup();
    expect(actions.openRoute(s, { from: 'BSB', to: 'MAO', planeId: null })).toBeNull();
    expect(s.routes[0]!.planes).toEqual([]);
  });
});

describe('updateRoute e closeRoute', () => {
  it('limita frequência, tarifas e serviço', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'CNF', p.id);
    const mf = maxFreq(MODELS.AT7, r.dist);
    actions.setPlaneFreq(s, r.id, p.id, 99);
    expect(r.planes[0]!.freq).toBe(mf);
    actions.setPlaneFreq(s, r.id, p.id, 0);
    expect(r.planes[0]!.freq).toBe(1);
    expect(actions.setPlaneFreq(s, r.id, 'nada', 2)).toBe('Inválido.');
    actions.updateRoute(s, r.id, { price: 10 });
    expect(r.price).toBe(50);
    actions.updateRoute(s, r.id, { price: 1e9 });
    expect(r.price).toBe(50000);
    actions.updateRoute(s, r.id, { priceJ: 1 });
    expect(r.priceJ).toBe(100);
    actions.updateRoute(s, r.id, { priceJ: 1e9 });
    expect(r.priceJ).toBe(150000);
    actions.updateRoute(s, r.id, { service: 2 });
    expect(r.service).toBe(2);
  });

  it('escalar aeronave valida alcance e tira de outra rota', () => {
    const s = makeGame();
    s.license = 1;
    const jet = addTestPlane(s, 'E295');
    const atr = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'MAO', jet.id, { freq: 1 });
    expect(actions.assignPlane(s, r.id, atr.id)).toBe('Fora do alcance do ATR 72-600.');
    expect(actions.assignPlane(s, r.id, jet.id)).toBe('Aeronave já escalada nesta rota.');
    const r2 = addTestRoute(s, 'BSB', 'GYN', null);
    expect(actions.assignPlane(s, r2.id, jet.id)).toBeNull();
    expect(r2.planes).toEqual([{ id: jet.id, freq: 2 }]);
    expect(r.planes).toEqual([]);
    expect(actions.unassignFromRoute(s, r2.id, jet.id)).toBeNull();
    expect(r2.planes).toEqual([]);
  });

  it('várias aeronaves na mesma rota', () => {
    const s = makeGame();
    const a = addTestPlane(s, 'AT7');
    const b = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'CNF', a.id);
    expect(actions.assignPlane(s, r.id, b.id)).toBeNull();
    expect(r.planes.map((x) => x.id)).toEqual([a.id, b.id]);
    actions.setPlaneFreq(s, r.id, b.id, 3);
    expect(r.planes[1]!.freq).toBe(3);
    actions.release(s, a.id);
    expect(r.planes.map((x) => x.id)).toEqual([b.id]);
  });

  it('encerrar custa 1 de reputação', () => {
    const s = makeGame();
    const r = addTestRoute(s, 'BSB', 'CNF', null);
    expect(actions.closeRoute(s, r.id)).toBeNull();
    expect(s.routes).toHaveLength(0);
    expect(s.reputation).toBe(49);
    expect(actions.closeRoute(s, r.id)).toBe('Inválido.');
  });
});
