import { describe, expect, it } from 'vitest';
import * as actions from '../../src/engine/actions';
import { slotCost, slotFee } from '../../src/engine/formulas';
import { hubDailyCost, hubSetupCost } from '../../src/engine/hubs';
import {
  CODESHARE_AI_CUT,
  CODESHARE_COST,
  CODESHARE_DAILY,
  codeshareAiFactor,
  FOREIGN_HUB_FEE_FACTOR,
  FX_MAX,
  FX_MIN,
} from '../../src/engine/international';
import { slotCostFor, slotFeeFor } from '../../src/engine/rules';
import { simRoute } from '../../src/engine/simRoute';
import { tick } from '../../src/engine/tick';
import { migrate } from '../../src/store/migrate';
import { addTestPlane, addTestRoute, makeGame } from './helpers';

function intlGame() {
  const s = makeGame('GRU');
  s.license = 2;
  s.cash = 500e6;
  return s;
}

describe('base internacional', () => {
  it('divisão exige licença Internacional e caixa', () => {
    const s = makeGame('GRU');
    s.cash = 500e6;
    expect(actions.buyDivision(s, 'internacional')).toMatch(/Internacional/);
    s.license = 2;
    expect(actions.buyDivision(s, 'internacional')).toBeNull();
    expect(s.divisions).toEqual(['internacional']);
    expect(s.cash).toBe(440e6);
    expect(actions.buyDivision(s, 'internacional')).toMatch(/já está aberta/);
  });

  it('cargas ainda não está disponível', () => {
    const s = intlGame();
    expect(actions.buyDivision(s, 'cargas')).toMatch(/não disponível/);
  });

  it('hub no exterior só com a divisão', () => {
    const s = intlGame();
    actions.buySlot(s, 'MIA');
    expect(actions.openHub(s, 'MIA')).toMatch(/Base internacional/);
    actions.buyDivision(s, 'internacional');
    expect(actions.openHub(s, 'MIA')).toBeNull();
    expect(s.hubs).toContain('MIA');
  });

  it('hub no exterior paga metade da taxa de slot', () => {
    const s = intlGame();
    s.slots.push('MIA');
    expect(slotFeeFor(s, 'MIA')).toBe(slotFee('MIA'));
    s.hubs.push('MIA');
    expect(slotFeeFor(s, 'MIA')).toBe(Math.round(slotFee('MIA') * FOREIGN_HUB_FEE_FACTOR));
  });

  it('custos no exterior acompanham o câmbio; no Brasil, não', () => {
    const s = intlGame();
    s.fxIdx = 1.2;
    expect(slotCostFor(s, 'MIA')).toBe(Math.round(slotCost('MIA') * 1.2));
    expect(slotFeeFor(s, 'MIA')).toBe(Math.round(slotFee('MIA') * 1.2));
    expect(slotCostFor(s, 'GIG')).toBe(slotCost('GIG'));
    expect(hubSetupCost('MIA', 1.2)).toBeCloseTo(hubSetupCost('MIA') * 1.2);
    expect(hubSetupCost('GIG', 1.2)).toBe(hubSetupCost('GIG'));
    const base = hubDailyCost(s, 'MIA') / 1.2;
    s.fxIdx = 1;
    expect(hubDailyCost(s, 'MIA')).toBeCloseTo(base);
  });

  it('câmbio só anda com a licença Internacional e fica na faixa', () => {
    const a = makeGame('GRU');
    for (let i = 0; i < 50; i++) tick(a, { noEvents: true });
    expect(a.fxIdx).toBe(1);
    const b = intlGame();
    for (let i = 0; i < 2000; i++) {
      tick(b, { noEvents: true });
      expect(b.fxIdx).toBeGreaterThanOrEqual(FX_MIN);
      expect(b.fxIdx).toBeLessThanOrEqual(FX_MAX);
    }
    expect(b.fxIdx).not.toBe(1);
  });

  it('rota internacional: receita sobe metade do câmbio e taxas sobem inteiras', () => {
    const s = intlGame();
    const p = addTestPlane(s, 'A339');
    const r = addTestRoute(s, 'GRU', 'MIA', p.id, { freq: 1 });
    const x1 = simRoute(s, r);
    s.fxIdx = 1.2;
    const x2 = simRoute(s, r);
    expect(x2.pax).toBe(x1.pax);
    expect(x2.rev / x1.rev).toBeCloseTo(1.1);
    expect(x2.fees / x1.fees).toBeCloseTo(1.2);
  });

  it('rota doméstica ignora o câmbio', () => {
    const s = intlGame();
    const p = addTestPlane(s, 'A20N');
    const r = addTestRoute(s, 'GRU', 'SSA', p.id);
    const x1 = simRoute(s, r);
    s.fxIdx = 1.4;
    expect(simRoute(s, r)).toEqual(x1);
  });

  it('codeshare: exige a divisão, reduz a concorrência da parceira e cobra por dia', () => {
    const s = intlGame();
    expect(actions.signCodeshare(s)).toMatch(/Base internacional/);
    actions.buyDivision(s, 'internacional');
    const p = addTestPlane(s, 'A339');
    const r = addTestRoute(s, 'GRU', 'MIA', p.id, { freq: 1 });
    const dom = addTestRoute(s, 'GRU', 'SSA', null);
    const before = simRoute(s, r).share;
    const cash = s.cash;
    expect(actions.signCodeshare(s)).toBeNull();
    expect(s.cash).toBe(cash - CODESHARE_COST);
    const w = r.rivals.find((x) => x.id === 'atlantica')!.w;
    expect(codeshareAiFactor(s, r)).toBeCloseTo(1 - CODESHARE_AI_CUT * w);
    expect(codeshareAiFactor(s, dom)).toBe(1);
    expect(simRoute(s, r).share).toBeGreaterThan(before);
    tick(s, { noEvents: true });
    const withCs = s.lastDay!.overhead;
    actions.cancelCodeshare(s);
    tick(s, { noEvents: true });
    expect(withCs - s.lastDay!.overhead).toBeCloseTo(CODESHARE_DAILY * s.fxIdx, -3);
  });

  it('save v8 ganha câmbio neutro e sem codeshare', () => {
    const raw = JSON.parse(JSON.stringify({ ...makeGame(), v: 8 }));
    delete raw.fxIdx;
    delete raw.codeshare;
    const g = migrate(raw)!;
    expect(g.fxIdx).toBe(1);
    expect(g.codeshare).toBe(false);
  });
});
