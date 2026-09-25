import { describe, expect, it } from 'vitest';
import * as actions from '../../src/engine/actions';
import { maintCost, maintDays } from '../../src/engine/formulas';
import {
  connectionFactor,
  crewFactor,
  extraHubsDailyCost,
  hubSetupCost,
  maintCostFor,
  maintDaysFor,
} from '../../src/engine/hubs';
import { newGame } from '../../src/engine/newGame';
import { simRoute } from '../../src/engine/simRoute';
import { tick } from '../../src/engine/tick';
import { addTestPlane, addTestRoute, makeGame } from './helpers';

describe('hubs', () => {
  it('jogo novo começa com o hub da fundação', () => {
    expect(newGame('x', 'REC', 1).hubs).toEqual(['REC']);
  });

  it('conexões: +1% por outra rota no hub, até +10%', () => {
    const s = makeGame('BSB');
    const dests = [
      'CNF',
      'GRU',
      'GIG',
      'SSA',
      'REC',
      'FOR',
      'POA',
      'CWB',
      'VCP',
      'FLN',
      'GYN',
      'CGB',
      'THE',
      'BEL',
      'MAO',
      'NAT',
      'SLZ',
      'VIX',
    ] as const;
    const routes = dests.map((d) => addTestRoute(s, 'BSB', d, addTestPlane(s, 'AT7').id));
    expect(connectionFactor(s, routes[0]!)).toBeCloseTo(1.1); // 17 outras rotas: 17%, limitado a 10%
    s.routes = routes.slice(0, 4);
    expect(connectionFactor(s, routes[0]!)).toBeCloseTo(1.03);
  });

  it('rota que não toca hub: sem conexão e com pernoite (Low-cost isenta)', () => {
    const s = makeGame('BSB');
    const r = addTestRoute(s, 'CNF', 'SSA', addTestPlane(s, 'AT7').id);
    addTestRoute(s, 'BSB', 'GRU', addTestPlane(s, 'AT7').id);
    expect(connectionFactor(s, r)).toBe(1);
    expect(crewFactor(s, r)).toBe(1.2);
    const lc = newGame('x', 'BSB', 1, 0, 'lowcost');
    const r2 = addTestRoute(lc, 'CNF', 'SSA', addTestPlane(lc, 'AT7').id);
    expect(crewFactor(lc, r2)).toBe(1);
  });

  it('pernoite encarece a tripulação na simulação', () => {
    const s = makeGame('BSB');
    const r = addTestRoute(s, 'CNF', 'SSA', addTestPlane(s, 'AT7').id);
    const before = simRoute(s, r).crew;
    s.hubs.push('CNF');
    expect(simRoute(s, r).crew).toBeCloseTo(before / 1.2);
  });

  it('manutenção mais barata e rápida na base', () => {
    const s = makeGame('BSB');
    const atHub = addTestPlane(s, 'AT7', { condition: 50 });
    addTestRoute(s, 'BSB', 'CNF', atHub.id);
    const away = addTestPlane(s, 'AT7', { condition: 50 });
    addTestRoute(s, 'CNF', 'SSA', away.id);
    expect(maintCostFor(s, atHub)).toBe(Math.round((maintCost(atHub) * 0.8) / 1000) * 1000);
    expect(maintDaysFor(s, atHub)).toBe(maintDays(atHub) - 1);
    expect(maintCostFor(s, away)).toBe(maintCost(away));
    expect(maintDaysFor(s, away)).toBe(maintDays(away));
  });

  it('abrir hub exige slot, doméstico e caixa; cobra implantação e estrutura diária', () => {
    const s = makeGame('BSB');
    s.cash = 100e6;
    s.nextEvent = 1e9;
    expect(actions.openHub(s, 'CNF')).toBe('Compre slots em Belo Horizonte antes de abrir um hub.');
    s.slots.push('CNF', 'EZE');
    expect(actions.openHub(s, 'EZE')).toBe('Hubs no exterior chegam com a divisão Base internacional.');
    expect(actions.openHub(s, 'BSB')).toBe('Brasília já é hub.');
    const cash = s.cash;
    expect(actions.openHub(s, 'CNF')).toBeNull();
    expect(s.cash).toBe(cash - hubSetupCost('CNF'));
    expect(hubSetupCost('CNF')).toBe(49 * 400_000);
    expect(s.hubs).toEqual(['BSB', 'CNF']);
    expect(extraHubsDailyCost(s)).toBe(7 * 1500);
    tick(s);
    expect(s.lastDay!.overhead).toBe(8000 + 7 * 1500);
  });
});

describe('save v7', () => {
  it('saves antigos ganham a lista de hubs', async () => {
    const { migrate } = await import('../../src/store/migrate');
    const { hubs: _h, ...old } = makeGame('REC');
    const g = migrate(JSON.parse(JSON.stringify({ ...old, v: 6 })))!;
    expect(g.hubs).toEqual(['REC']);
  });
});
