import { describe, expect, it } from 'vitest';
import { AIRPORT_CODES, AIRPORTS, HUBS } from '../../src/engine/data/airports';
import { runwayIssue } from '../../src/engine/formulas';
import * as actions from '../../src/engine/actions';
import { addTestPlane, makeGame } from './helpers';

describe('aeroportos da Fase 3', () => {
  it('145 aeroportos com dados completos e códigos únicos', () => {
    expect(AIRPORT_CODES).toHaveLength(145);
    for (const c of AIRPORT_CODES) {
      const a = AIRPORTS[c];
      expect(a.city, c).toBeTruthy();
      expect(a.size, c).toBeGreaterThanOrEqual(1);
      expect(a.size, c).toBeLessThanOrEqual(10);
      expect(a.runway, c).toBeGreaterThan(800);
      expect(Math.abs(a.lat), c).toBeLessThan(90);
    }
  });

  it('os 26 do protótipo continuam com os mesmos dados', () => {
    expect(AIRPORTS.GRU).toMatchObject({
      city: 'São Paulo',
      lat: -23.43,
      lon: -46.47,
      size: 10,
      intl: false,
    });
    expect(AIRPORTS.THE).toMatchObject({ size: 3 });
    expect(AIRPORT_CODES.slice(0, 3)).toEqual(['GRU', 'GIG', 'BSB']);
  });

  it('hubs: domésticos de porte ≥ 3', () => {
    expect(HUBS.length).toBeGreaterThan(40);
    for (const c of HUBS) {
      expect(AIRPORTS[c].intl).toBe(false);
      expect(AIRPORTS[c].size).toBeGreaterThanOrEqual(3);
    }
    expect(HUBS).toContain('SLZ');
    expect(HUBS).not.toContain('FEN');
  });
});

describe('pista', () => {
  it('Santos Dumont (1.323 m) recebe A320 e 737 em etapa curta', () => {
    expect(AIRPORTS.SDU.runway).toBeGreaterThanOrEqual(1300);
    expect(runwayIssue('A20N', ['SDU', 'CGH'])).toBeNull();
  });

  it('pista curta bloqueia jatos mas não o ATR', () => {
    expect(AIRPORTS.UVI.runway).toBeLessThan(1300);
    expect(runwayIssue('E295', ['CWB', 'UVI'])).toMatch(/é curta para o Embraer E195-E2/);
    expect(runwayIssue('AT7', ['CWB', 'UVI'])).toBeNull();
  });

  it('pista não pavimentada só para quem opera nela', () => {
    expect(AIRPORTS.IRZ.paved).toBe(false);
    expect(runwayIssue('AT7', ['MAO', 'IRZ'])).toMatch(/não é pavimentada/);
  });

  it('abrir rota valida a pista', () => {
    const s = makeGame('GRU');
    s.license = 1;
    s.slots.push('UVI');
    const jet = addTestPlane(s, 'E295');
    expect(actions.openRoute(s, { from: 'GRU', to: 'UVI', planeId: jet.id })).toMatch(/é curta/);
  });
});

describe('busca', () => {
  it('ignora acentos e maiúsculas', async () => {
    const { searchKey } = await import('../../src/engine/format');
    expect(searchKey('São Luís')).toBe('sao luis');
    expect(searchKey('Florianópolis').includes(searchKey('florianop'))).toBe(true);
  });
});
