import { describe, expect, it } from 'vitest';
import { catchUp } from '../../src/engine/offline';
import { addTestPlane, addTestRoute, makeGame } from './helpers';

const MIN = 60_000;

describe('catchUp', () => {
  it('menos de um minuto: nada acontece', () => {
    const s = makeGame();
    s.savedAt = 1_000_000;
    expect(catchUp(s, 1_000_000 + 59_000)).toBeNull();
    expect(s.day).toBe(1);
  });

  it('um dia por minuto real', () => {
    const s = makeGame();
    s.savedAt = 1;
    const r = catchUp(s, 7 * MIN + 30_000)!;
    expect(r.days).toBe(7);
    expect(s.day).toBe(8);
    expect(r.away).toBeCloseTo(450, 2);
  });

  it('limita a 60 dias', () => {
    const s = makeGame();
    s.savedAt = 1;
    const r = catchUp(s, 24 * 60 * MIN)!;
    expect(r.days).toBe(60);
    expect(s.day).toBe(61);
  });

  it('não sorteia eventos, mesmo passando do dia do próximo evento', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7');
    addTestRoute(s, 'BSB', 'CNF', p.id);
    s.savedAt = 1;
    catchUp(s, 60 * MIN);
    expect(s.day).toBeGreaterThan(s.nextEvent);
    expect(s.pendingEvent).toBeNull();
    expect(s.usedEvents).toEqual({});
  });

  it('informa resultado e variação de reputação', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7');
    addTestRoute(s, 'BSB', 'CNF', p.id);
    s.savedAt = 1;
    const cash0 = s.cash;
    const rep0 = s.reputation;
    const r = catchUp(s, 10 * MIN)!;
    expect(r.profit).toBeCloseTo(s.cash - cash0);
    expect(r.rep).toBeCloseTo(s.reputation - rep0);
  });

  it('não roda com carta de evento pendente', () => {
    const s = makeGame();
    s.pendingEvent = 'greve';
    s.savedAt = 1;
    expect(catchUp(s, 30 * MIN)).toBeNull();
    expect(s.day).toBe(1);
  });

  it('para na falência', () => {
    const s = makeGame();
    s.cash = -14.9e6;
    addTestPlane(s, 'A339');
    s.savedAt = 1;
    const r = catchUp(s, 30 * MIN)!;
    expect(s.gameOver).toBe(true);
    expect(r.days).toBe(1);
  });
});
