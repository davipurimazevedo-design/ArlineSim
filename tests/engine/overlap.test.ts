import { describe, expect, it } from 'vitest';
import { dist } from '../../src/engine/formulas';
import { OVERLAP_RADIUS_KM, overlapFactor, overlapsOf } from '../../src/engine/overlap';
import { simRoute } from '../../src/engine/simRoute';
import { addTestPlane, addTestRoute, makeGame } from './helpers';

describe('demanda compartilhada', () => {
  it('rotas do mesmo aeroporto para destinos próximos se sobrepõem', () => {
    const s = makeGame();
    const a = addTestPlane(s, 'AT7');
    const b = addTestPlane(s, 'AT7');
    const gru = addTestRoute(s, 'BSB', 'GRU', a.id);
    const vcp = addTestRoute(s, 'VCP', 'BSB', b.id); // sentido invertido também conta
    const w = 1 - dist('GRU', 'VCP') / OVERLAP_RADIUS_KM;
    expect(overlapsOf(s, gru)).toEqual([{ route: vcp, w }]);
    expect(overlapFactor(s, gru)).toBeCloseTo(1 / (1 + 0.5 * w));
    expect(overlapFactor(s, vcp)).toBeCloseTo(overlapFactor(s, gru));
  });

  it('destinos distantes ou sem aeroporto em comum não se sobrepõem', () => {
    const s = makeGame();
    const a = addTestPlane(s, 'AT7');
    const b = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'GRU', a.id);
    addTestRoute(s, 'BSB', 'SSA', b.id); // longe de GRU
    addTestRoute(s, 'CNF', 'VCP', null); // sem ponta em comum
    expect(overlapsOf(s, r)).toEqual([]);
    expect(overlapFactor(s, r)).toBe(1);
  });

  it('rota sem aeronave não tira demanda de ninguém', () => {
    const s = makeGame();
    const a = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'GRU', a.id);
    addTestRoute(s, 'BSB', 'VCP', null);
    expect(overlapFactor(s, r)).toBe(1);
  });

  it('reduz os passageiros na simulação', () => {
    const s = makeGame();
    const a = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'GRU', a.id, { freq: 1 });
    const alone = simRoute(s, r);
    const b = addTestPlane(s, 'AT7');
    addTestRoute(s, 'BSB', 'VCP', b.id);
    const shared = simRoute(s, r);
    expect(shared.overlap).toBeLessThan(1);
    expect(alone.overlap).toBe(1);
    // demanda cheia lota o ATR; com disputa a demanda cai, mas o teto ainda pode segurar
    expect(shared.pax).toBeLessThanOrEqual(alone.pax);
  });
});
