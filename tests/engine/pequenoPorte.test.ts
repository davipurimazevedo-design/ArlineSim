import { describe, expect, it } from 'vitest';
import * as actions from '../../src/engine/actions';
import { hubsFor } from '../../src/engine/data/airports';
import { MODEL_KEYS, MODELS, SMALL_MODELS } from '../../src/engine/data/aircraft';
import { fairPrice, remoteFareFactor, routeFair, runwayIssue } from '../../src/engine/formulas';
import { newGame } from '../../src/engine/newGame';
import { createRoute } from '../../src/engine/routePlanner';
import { hasRegionalCert, modelAllowed, rules } from '../../src/engine/rules';

describe('aeronaves novas', () => {
  it('17 modelos com dados completos (12 de passageiros e 5 cargueiros)', () => {
    expect(MODEL_KEYS).toHaveLength(17);
    for (const k of MODEL_KEYS) {
      const m = MODELS[k];
      expect(m.y + (m.cargo ?? 0), k).toBeGreaterThan(0);
      expect(m.range, k).toBeGreaterThan(1000);
      expect(m.minRunway, k).toBeGreaterThan(0);
      expect(m.lease, k).toBeLessThan(m.price / 100);
    }
  });

  it('valores convertidos dos dados reais (docs/fase3-aeronaves.md)', () => {
    expect(MODELS.C208).toMatchObject({ y: 12, speed: 343, range: 1689, price: 6.4e6, unpaved: true });
    expect(MODELS.AT4).toMatchObject({ y: 48, range: 1302, minRunway: 1000 });
    expect(MODELS.E175).toMatchObject({ y: 80, tier: 1 });
  });

  it('Caravan e L-410 pousam em pista de terra; ATR não', () => {
    expect(runwayIssue('C208', ['MAO', 'IRZ'])).toBeNull();
    expect(runwayIssue('L410', ['MAO', 'IRZ'])).toBeNull();
    expect(runwayIssue('AT4', ['MAO', 'IRZ'])).toMatch(/não é pavimentada/);
  });
});

describe('tarifa de destino remoto', () => {
  it('+50% no porte 2, +100% no porte 1, nada acima', () => {
    expect(remoteFareFactor('GRU', 'GIG')).toBe(1);
    expect(remoteFareFactor('REC', 'FEN')).toBeCloseTo(1.5);
    expect(remoteFareFactor('MAO', 'TFF')).toBeCloseTo(2);
    expect(routeFair('GRU', 'GIG')).toBe(fairPrice(336));
  });
});

describe('Pequeno porte', () => {
  const game = (hub: 'JJD' | 'BSB' = 'JJD') => newGame('Teste', hub, 1, 0, 'pequeno');

  it('R$ 5 mi e hub em qualquer cidade doméstica', () => {
    expect(game().cash).toBe(5e6);
    expect(hubsFor(1)).toContain('JJD');
    expect(hubsFor(1).length).toBeGreaterThan(hubsFor().length);
  });

  it('só aviões pequenos até a certificação regional', () => {
    const s = game();
    expect(modelAllowed(s, 'C208')).toBe(true);
    expect(actions.lease(s, 'AT7')).toBe('O modelo Pequeno porte não opera o ATR 72-600.');
    s.cash = 1e9;
    expect(actions.buyLicense(s, 1)).toBe('O modelo Pequeno porte não opera com a licença Nacional.');
  });

  it('a certificação regional libera o ATR e o caminho das licenças', () => {
    const s = game();
    s.cash = 100e6;
    expect(actions.buyRegionalCert(s)).toBeNull();
    expect(hasRegionalCert(s)).toBe(true);
    expect(s.cash).toBe(90e6);
    expect(actions.lease(s, 'AT7')).toBeNull();
    expect(actions.buyLicense(s, 1)).toBeNull();
    expect(actions.buyRegionalCert(s)).toBe('A companhia já tem a certificação regional.');
    expect(rules(s).models).toBeNull();
  });

  it('só o Pequeno porte compra a certificação', () => {
    const s = newGame('x', 'BSB', 1);
    expect(actions.buyRegionalCert(s)).toBe('Só o Pequeno porte precisa de certificação regional.');
  });

  it('um Caravan abre rota de Jericoacoara com o criador', () => {
    const s = game();
    expect(createRoute(s, { from: 'JJD', to: 'FOR', planeId: null, leaseModel: 'C208' })).toBeNull();
    expect(s.routes[0]!.price).toBe(routeFair('JJD', 'FOR'));
    expect(SMALL_MODELS).toContain(s.fleet[0]!.model);
  });
});
