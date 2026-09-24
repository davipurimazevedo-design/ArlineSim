import { describe, expect, it } from 'vitest';
import { AIRPORT_CODES } from '../../src/engine/data/airports';
import { MODELS, MODEL_KEYS } from '../../src/engine/data/aircraft';
import {
  baseDemand,
  creditLimit,
  dist,
  fairPrice,
  maintCost,
  maintDays,
  maxFreq,
  modVal,
  opsHalted,
  planeValue,
  slotCost,
  slotFee,
} from '../../src/engine/formulas';
import { fmtDate, fmtInt, fmtMoney } from '../../src/engine/format';
import { addTestPlane, loadPrototypeEngine, makeGame } from './helpers';

const proto = loadPrototypeEngine();

describe('dist', () => {
  it('é zero para o mesmo aeroporto e simétrica', () => {
    expect(dist('GRU', 'GRU')).toBe(0);
    expect(dist('GRU', 'GIG')).toBe(dist('GIG', 'GRU'));
  });
  it('bate com valores conhecidos (haversine, R = 6371)', () => {
    expect(dist('GRU', 'GIG')).toBeGreaterThan(330);
    expect(dist('GRU', 'GIG')).toBeLessThan(345);
    expect(dist('GRU', 'CDG')).toBeGreaterThan(9300);
    expect(dist('GRU', 'CDG')).toBeLessThan(9500);
  });
  it('é idêntica ao protótipo para todos os pares', () => {
    for (const a of AIRPORT_CODES) for (const b of AIRPORT_CODES) expect(dist(a, b)).toBe(proto.dist(a, b));
  });
});

describe('fairPrice', () => {
  it('segue as duas faixas e arredonda para múltiplo de 5', () => {
    expect(fairPrice(0)).toBe(150);
    expect(fairPrice(1000)).toBe(600);
    expect(fairPrice(3500)).toBe(1725);
    expect(fairPrice(5500)).toBe(2225);
    expect(fairPrice(333) % 5).toBe(0);
  });
  it('é idêntica ao protótipo', () => {
    for (let d = 0; d < 14000; d += 37) expect(fairPrice(d)).toBe(proto.fairPrice(d));
  });
});

describe('baseDemand', () => {
  it('aplica os fatores de distância e internacional', () => {
    // BSB–GYN: < 300 km → 0,6
    expect(dist('BSB', 'GYN')).toBeLessThan(300);
    expect(baseDemand('BSB', 'GYN')).toBeCloseTo(14 * 8 * 5 * 0.6);
    // GRU–GIG: 300–2500 → 1
    expect(baseDemand('GRU', 'GIG')).toBeCloseTo(14 * 10 * 9);
    // GRU–MAO: > 2500 → 0,85
    expect(dist('GRU', 'MAO')).toBeGreaterThan(2500);
    expect(baseDemand('GRU', 'MAO')).toBeCloseTo(14 * 10 * 6 * 0.85);
    // GRU–EZE: internacional, < 2500 → 0,7
    expect(baseDemand('GRU', 'EZE')).toBeCloseTo(14 * 10 * 8 * 0.7);
  });
  it('é idêntica ao protótipo', () => {
    for (const a of AIRPORT_CODES)
      for (const b of AIRPORT_CODES) expect(baseDemand(a, b)).toBe(proto.baseDemand(a, b));
  });
});

describe('maxFreq', () => {
  it('floor(util / (2 · bloco))', () => {
    // ATR, 1000 km: bloco 2,5 h → 15 / 5 = 3
    expect(maxFreq(MODELS.AT7, 1000)).toBe(3);
    // ATR, 1500 km: bloco 3,5 h → floor(15 / 7) = 2
    expect(maxFreq(MODELS.AT7, 1500)).toBe(2);
    // A330, 9400 km: bloco ≈ 11,3 h → 0
    expect(maxFreq(MODELS.A339, 9400)).toBe(0);
  });
  it('é idêntica ao protótipo', () => {
    for (const k of MODEL_KEYS)
      for (let d = 100; d < 14000; d += 113)
        expect(maxFreq(MODELS[k], d)).toBe(proto.maxFreq(proto.MODELS[k], d));
  });
});

describe('manutenção, revenda e crédito', () => {
  it('maintCost arredonda para R$ 1.000', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7', { condition: 60 });
    expect(maintCost(p)).toBe(Math.round((55e6 * 0.00015 * 40) / 1000) * 1000);
    expect(maintCost(p) % 1000).toBe(0);
    expect(maintCost({ ...p, condition: 100 })).toBe(0);
  });
  it('maintDays = 2 + ceil((100 − condição) / 20)', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7', { condition: 60 });
    expect(maintDays(p)).toBe(4);
    expect(maintDays({ ...p, condition: 100 })).toBe(2);
    expect(maintDays({ ...p, condition: 59 })).toBe(5);
  });
  it('planeValue e creditLimit', () => {
    const s = makeGame();
    expect(creditLimit(s)).toBe(10e6);
    const p = addTestPlane(s, 'AT7', { owned: true, condition: 100 });
    expect(planeValue(p)).toBeCloseTo(55e6 * 0.6);
    expect(creditLimit(s)).toBe(Math.round((10e6 + 55e6 * 0.6 * 0.5) / 1e6) * 1e6);
    addTestPlane(s, 'AT7', { owned: false });
    expect(creditLimit(s)).toBe(27e6);
  });
  it('slots custam em dobro no exterior', () => {
    expect(slotCost('GRU')).toBe(100 * 60000);
    expect(slotFee('GRU')).toBe(8000);
    expect(slotCost('JFK')).toBe(100 * 60000 * 2);
    expect(slotFee('JFK')).toBe(16000);
  });
});

describe('modificadores', () => {
  it('multiplica os ativos do mesmo tipo e ignora vencidos', () => {
    const s = makeGame();
    s.day = 10;
    s.mods = [
      { type: 'fuel', value: 1.25, until: 20 },
      { type: 'fuel', value: 0.9, until: 11 },
      { type: 'fuel', value: 2, until: 10 },
      { type: 'demand', value: 1.5, until: 30 },
    ];
    expect(modVal(s, 'fuel')).toBeCloseTo(1.125);
    expect(modVal(s, 'salary')).toBe(1);
    expect(opsHalted(s)).toBe(false);
    s.mods.push({ type: 'halt', value: 1, until: 11 });
    expect(opsHalted(s)).toBe(true);
  });
});

describe('formatação', () => {
  it('fmtMoney igual ao protótipo', () => {
    for (const v of [0, 999, 1000, 1499, 25_000, 1e6, 12e6, -3.25e6, 1.234e9, -500])
      expect(fmtMoney(v)).toBe(proto.fmtMoney(v));
  });
  it('fmtDate começa em 1º de janeiro de 2026', () => {
    expect(fmtDate(1)).toBe('01 de jan de 2026');
    expect(fmtDate(32)).toBe('01 de fev de 2026');
    expect(fmtDate(366)).toBe('01 de jan de 2027');
  });
  it('fmtInt', () => {
    expect(fmtInt(1500)).toBe('1.500');
    expect(fmtInt(1234567)).toBe('1.234.567');
    expect(fmtInt(12)).toBe('12');
  });
});
