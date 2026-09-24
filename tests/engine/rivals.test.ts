import { describe, expect, it } from 'vitest';
import { fairPrice } from '../../src/engine/formulas';
import { driftRivals, rivalsFor, rivalShares } from '../../src/engine/rivals';
import { addTestPlane, addTestRoute, makeGame } from './helpers';

const sum = (xs: { w: number }[]) => xs.reduce((a, x) => a + x.w, 0);

describe('concorrentes com nome', () => {
  it('escolhe até 3 concorrentes que operam o par, com pesos que somam 1', () => {
    const dom = rivalsFor('BSB', 'GYN');
    expect(dom.map((r) => r.id)).toEqual(['horizonte', 'aerovia', 'sabia']);
    expect(sum(dom)).toBeCloseTo(1);
    const intl = rivalsFor('GRU', 'LIS');
    expect(intl.map((r) => r.id)).toEqual(['atlantica', 'ipe']);
    expect(sum(intl)).toBeCloseTo(1);
    // aeroportos pequenos: sem low-cost
    expect(rivalsFor('SLZ', 'THE').map((r) => r.id)).not.toContain('aerovia');
  });

  it('a low-cost ganha espaço quando a tarifa do jogador sobe', () => {
    const s = makeGame();
    const r = addTestRoute(s, 'BSB', 'CNF', null);
    const before = r.rivals.find((x) => x.id === 'aerovia')!.w;
    r.price = fairPrice(r.dist) * 1.5;
    driftRivals(r);
    expect(r.rivals.find((x) => x.id === 'aerovia')!.w).toBeGreaterThan(before);
    expect(sum(r.rivals)).toBeCloseTo(1);
  });

  it('a premium ganha espaço com serviço básico e perde com premium', () => {
    const s = makeGame('GRU');
    const r = addTestRoute(s, 'GRU', 'GIG', null);
    const w0 = r.rivals.find((x) => x.id === 'ipe')!.w;
    r.service = 0;
    driftRivals(r);
    const w1 = r.rivals.find((x) => x.id === 'ipe')!.w;
    expect(w1).toBeGreaterThan(w0);
    r.service = 2;
    driftRivals(r);
    expect(r.rivals.find((x) => x.id === 'ipe')!.w).toBeLessThan(w1);
  });

  it('as fatias dos concorrentes completam o mercado do jogador', () => {
    const s = makeGame();
    const r = addTestRoute(s, 'BSB', 'CNF', null);
    const shares = rivalShares(r, 0.4);
    expect(shares.reduce((a, x) => a + x.share, 0)).toBeCloseTo(0.6);
    expect(shares[0]!.name).toBe('Horizonte');
  });

  it('não mexem na força total da concorrência', async () => {
    const { tick } = await import('../../src/engine/tick');
    const s = makeGame();
    const p = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'CNF', p.id, { price: 200 });
    s.day = 30; // rota aberta no dia 1: reage no dia 31 (30 dias de vida)
    s.nextEvent = 9999;
    tick(s);
    expect(r.ai).toBeCloseTo(1.26);
    expect(sum(r.rivals)).toBeCloseTo(1);
  });
});
