import { describe, expect, it } from 'vitest';
import { rand, randInt, toSeed, uid } from '../../src/engine/rng';

describe('rng', () => {
  it('é reproduzível e mantém a semente como uint32', () => {
    const a = { seed: 123 };
    const b = { seed: 123 };
    for (let i = 0; i < 100; i++) {
      expect(rand(a)).toBe(rand(b));
      expect(Number.isInteger(a.seed) && a.seed >= 0 && a.seed < 2 ** 32).toBe(true);
    }
  });

  it('gera valores em [0, 1) com média perto de 0,5', () => {
    const s = { seed: 7 };
    let sum = 0;
    for (let i = 0; i < 20000; i++) {
      const x = rand(s);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      sum += x;
    }
    expect(sum / 20000).toBeCloseTo(0.5, 1);
  });

  it('randInt cobre todo o intervalo', () => {
    const s = { seed: 9 };
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(randInt(s, 6));
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('toSeed e uid', () => {
    expect(toSeed(-5.7)).toBe(5);
    expect(toSeed(2 ** 32 + 3)).toBe(3);
    expect(uid({ seed: 1 })).toMatch(/^[0-9a-z]{7}$/);
  });
});
