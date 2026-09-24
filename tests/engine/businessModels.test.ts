import { describe, expect, it } from 'vitest';
import * as actions from '../../src/engine/actions';
import { MODELS } from '../../src/engine/data/aircraft';
import { seatsOf, slotCost, slotFee } from '../../src/engine/formulas';
import { resolveEvent } from '../../src/engine/events';
import { newGame } from '../../src/engine/newGame';
import { createRoute, planRoute } from '../../src/engine/routePlanner';
import { maxFreqFor, slotCostFor, slotFeeFor } from '../../src/engine/rules';
import { simRoute } from '../../src/engine/simRoute';
import { tick } from '../../src/engine/tick';
import type { BusinessModelId } from '../../src/engine/types';
import { addTestPlane, addTestRoute } from './helpers';

function game(model: BusinessModelId, hub: 'BSB' | 'GRU' = 'BSB') {
  const s = newGame('Teste', hub, 1, 0, model);
  s.cash = 50e6;
  s.nextEvent = 1e9;
  return s;
}

describe('modelos de negócio', () => {
  it('Tradicional é o jogo de antes (regras neutras)', () => {
    const s = game('tradicional');
    const p = addTestPlane(s, 'AT7');
    expect(seatsOf(p)).toEqual({ y: 70, j: 0 });
    expect(maxFreqFor(s, 'AT7', 1000)).toBe(3);
    expect(slotCostFor(s, 'CNF')).toBe(slotCost('CNF'));
  });

  describe('Low-cost', () => {
    it('cabine densa, giro rápido e estrutura mais barata', () => {
      const s = game('lowcost');
      const p = addTestPlane(s, 'A20N');
      const r = addTestRoute(s, 'BSB', 'GRU', p.id, { freq: 1, price: 100 });
      expect(simRoute(s, r).pax).toBe(Math.round(174 * 1.1) * 2); // teto de capacidade com +10%
      expect(maxFreqFor(s, 'AT7', 1000)).toBe(Math.floor(16 / 5)); // 15 h + 1 h
      tick(s);
      expect(s.lastDay!.overhead).toBeCloseTo((8000 + 2500) * 0.7);
    });

    it('só serviço Básico, sem executiva e sem widebody', () => {
      const s = game('lowcost');
      s.license = 2;
      expect(actions.lease(s, 'A339')).toBe('O modelo Low-cost não opera o Airbus A330-900.');
      const p = addTestPlane(s, 'A20N');
      expect(actions.setCabin(s, p.id, 1)).toBe('O modelo Low-cost não opera classe executiva.');
      s.slots.push('CNF');
      actions.openRoute(s, { from: 'BSB', to: 'CNF', planeId: p.id });
      const r = s.routes[0]!;
      expect(r.service).toBe(0);
      expect(actions.updateRoute(s, r.id, { service: 2 })).toBe(
        'O modelo Low-cost não oferece esse serviço de bordo.',
      );
    });

    it('reputação com teto de 70', () => {
      const s = game('lowcost');
      s.pendingEvent = 'influencer';
      s.reputation = 69; // +3 do evento, travado no teto
      resolveEvent(s, 'L');
      expect(s.reputation).toBe(70);
    });
  });

  describe('Regional', () => {
    it('slots e taxas pela metade em aeroportos pequenos e mais caros nos grandes', () => {
      const s = game('regional');
      expect(slotCostFor(s, 'GYN')).toBe(slotCost('GYN') * 0.5);
      expect(slotFeeFor(s, 'GYN')).toBe(slotFee('GYN') * 0.5);
      expect(slotCostFor(s, 'GRU')).toBe(slotCost('GRU') * 1.25);
      expect(slotCostFor(s, 'CNF')).toBe(slotCost('CNF'));
    });

    it('+15% de demanda em rotas que tocam aeroportos pequenos', () => {
      const trad = game('tradicional');
      const reg = game('regional');
      for (const s of [trad, reg]) {
        const p = addTestPlane(s, 'E295');
        addTestRoute(s, 'BSB', 'GYN', p.id, { freq: 4 }); // capacidade sobra: sem teto
      }
      const a = simRoute(trad, trad.routes[0]!).pax;
      const b = simRoute(reg, reg.routes[0]!).pax;
      expect(b / a).toBeCloseTo(1.15, 1);
    });

    it('só ATR e E-Jets, sem licença Internacional', () => {
      const s = game('regional');
      s.license = 1;
      expect(actions.lease(s, 'E295')).toBeNull();
      expect(actions.lease(s, 'A20N')).toBe('O modelo Regional não opera o Airbus A320neo.');
      s.cash = 1e9;
      expect(actions.buyLicense(s, 2)).toBe('O modelo Regional não opera com a licença Internacional.');
    });
  });
});

describe('criador de rotas', () => {
  it('mostra slots que faltam, depósito, total e previsão', () => {
    const s = game('tradicional');
    const plan = planRoute(s, { from: 'BSB', to: 'CNF', planeId: null, leaseModel: 'AT7' });
    expect(plan.error).toBeNull();
    expect(plan.slots).toEqual([{ code: 'CNF', cost: slotCost('CNF') }]);
    expect(plan.deposit).toBe(MODELS.AT7.lease * 10);
    expect(plan.total).toBe(slotCost('CNF') + MODELS.AT7.lease * 10);
    expect(plan.newSlotFees).toBe(slotFee('CNF'));
    expect(plan.preview!.pax).toBeGreaterThan(0);
    expect(plan.preview!.freq).toBe(2);
    // planejar não mexe no estado
    expect(s.routes).toHaveLength(0);
    expect(s.fleet).toHaveLength(0);
  });

  it('cria tudo de uma vez', () => {
    const s = game('tradicional');
    const cash = s.cash;
    expect(createRoute(s, { from: 'CNF', to: 'SSA', planeId: null, leaseModel: 'AT7' })).toBeNull();
    expect(s.slots).toEqual(expect.arrayContaining(['CNF', 'SSA']));
    expect(s.fleet).toHaveLength(1);
    expect(s.routes[0]!.planes[0]!.id).toBe(s.fleet[0]!.id);
    expect(s.cash).toBe(cash - slotCost('CNF') - slotCost('SSA') - MODELS.AT7.lease * 10);
  });

  it('não compra nada se faltar caixa ou a rota for inválida', () => {
    const s = game('tradicional');
    s.cash = 1e6;
    const before = JSON.stringify(s);
    expect(createRoute(s, { from: 'BSB', to: 'GRU', planeId: null, leaseModel: 'AT7' })).toMatch(
      /^Caixa insuficiente/,
    );
    expect(createRoute(s, { from: 'BSB', to: 'MAO', planeId: null, leaseModel: 'AT7' })).toBe(
      'A licença regional limita rotas a 1.500 km.',
    );
    expect(createRoute(s, { from: 'BSB', to: 'EZE', planeId: null })).toBe(
      'Destinos no exterior exigem a licença Internacional.',
    );
    expect(JSON.stringify(s)).toBe(before);
  });

  it('usa avião da frota e valida o alcance', () => {
    const s = game('tradicional');
    s.license = 1;
    const p = addTestPlane(s, 'AT7');
    expect(planRoute(s, { from: 'BSB', to: 'MAO', planeId: p.id }).error).toBe(
      'Fora do alcance do ATR 72-600 (1.500 km).',
    );
    expect(createRoute(s, { from: 'BSB', to: 'CNF', planeId: p.id })).toBeNull();
    expect(s.routes[0]!.planes[0]!.id).toBe(p.id);
  });
});

describe('save v6', () => {
  it('saves antigos viram Tradicional, sem divisões', async () => {
    const { migrate } = await import('../../src/store/migrate');
    const { businessModel: _b, divisions: _d, ...old } = game('lowcost');
    const g = migrate(JSON.parse(JSON.stringify({ ...old, v: 5 })))!;
    expect(g.businessModel).toBe('tradicional');
    expect(g.divisions).toEqual([]);
  });
});
