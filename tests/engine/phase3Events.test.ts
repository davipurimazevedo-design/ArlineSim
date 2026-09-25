import { describe, expect, it } from 'vitest';
import * as actions from '../../src/engine/actions';
import { EVENTS_BY_ID } from '../../src/engine/data/events';
import { MODEL_EVENTS } from '../../src/engine/data/modelEvents';
import { eligibleEvents, resolveEvent } from '../../src/engine/events';
import { checkGoals, visibleGoals } from '../../src/engine/goals';
import { modVal } from '../../src/engine/formulas';
import { newGame } from '../../src/engine/newGame';
import type { BusinessModelId, GameState } from '../../src/engine/types';
import { addTestPlane, addTestRoute, makeGame } from './helpers';

function game(model: BusinessModelId, hub: Parameters<typeof makeGame>[0] = 'GRU'): GameState {
  const s = newGame('x', hub, 1, 0, model);
  s.cash = 500e6;
  const p = addTestPlane(s, model === 'pequeno' ? 'C208' : 'AT7');
  addTestRoute(s, hub, 'GIG', p.id, { freq: 1 });
  return s;
}
const ids = (s: GameState) => new Set(eligibleEvents(s).map((e) => e.id));
const run = (s: GameState, id: string, side: 'L' | 'R') => {
  s.pendingEvent = id;
  return resolveEvent(s, side)!;
};

describe('eventos por modelo e divisão', () => {
  it('20 eventos novos, cada um restrito a um modelo ou divisão', () => {
    expect(MODEL_EVENTS).toHaveLength(20);
    // o Tradicional, sem divisões, não vê nenhum
    const s = game('tradicional');
    for (const e of MODEL_EVENTS) expect(e.need?.(s) ?? false, e.id).toBe(false);
  });

  it('cada modelo só vê os eventos dele', () => {
    const low = ids(game('lowcost'));
    expect(low.has('bagagem')).toBe(true);
    expect(low.has('prefeitura')).toBe(false);
    const reg = ids(game('regional'));
    expect(reg.has('prefeitura')).toBe(true);
    expect(reg.has('bagagem')).toBe(false);
    const peq = ids(game('pequeno', 'CGH'));
    expect(peq.has('uti')).toBe(true);
    expect(peq.has('guerratarifa')).toBe(false);
  });

  it('aeroporto secundário: o texto e o slot apontam a mesma cidade', () => {
    const s = game('lowcost');
    const e = EVENTS_BY_ID.secundario!;
    const text = e.textFor!(s);
    const before = s.slots.length;
    const out = run(s, 'secundario', 'L');
    const city = out.match(/Slots em (.+) garantidos/)![1]!;
    expect(text).toContain(city);
    expect(s.slots).toHaveLength(before + 1);
  });

  it('pista alagada só com rota em pista de terra', () => {
    const s = game('pequeno', 'CGH');
    expect(ids(s).has('pistaalagada')).toBe(false);
  });

  it('eventos de carga exigem a divisão e uma rota de carga voando; Black Friday mexe só na carga', () => {
    const s = game('tradicional');
    actions.buyDivision(s, 'cargas');
    expect(ids(s).has('safra')).toBe(false);
    const f = addTestPlane(s, 'AT7F');
    addTestRoute(s, 'GRU', 'CNF', f.id, { freq: 1, kind: 'cargo' });
    expect(ids(s).has('safra')).toBe(true);
    run(s, 'blackfriday', 'L');
    expect(modVal(s, 'cargo')).toBeCloseTo(1.5);
    expect(modVal(s, 'demand')).toBe(1);
  });

  it('câmbio: hedge limita a alta; sem hedge sobe 12%', () => {
    const s = game('tradicional');
    s.license = 2;
    actions.buyDivision(s, 'internacional');
    const p = addTestPlane(s, 'A339');
    addTestRoute(s, 'GRU', 'MIA', p.id, { freq: 1 });
    expect(ids(s).has('cambio')).toBe(true);
    expect(ids(s).has('codeshare')).toBe(false); // sem acordo ativo
    run(s, 'cambio', 'L');
    expect(s.fxIdx).toBeCloseTo(1.03);
    run(s, 'cambio', 'R');
    expect(s.fxIdx).toBeCloseTo(1.03 * 1.12);
    s.codeshare = true;
    run(s, 'codeshare', 'R');
    expect(s.codeshare).toBe(false);
  });
});

describe('objetivos por modelo e divisão', () => {
  it('cada companhia vê os gerais e os do seu modelo', () => {
    const vis = (s: GameState) => new Set(visibleGoals(s).map((g) => g.id));
    const trad = vis(game('tradicional'));
    expect(trad.size).toBe(18);
    const low = vis(game('lowcost'));
    expect(low.has('lc_multidao')).toBe(true);
    expect(low.has('rg_interior')).toBe(false);
    const s = game('regional');
    actions.buyDivision(s, 'cargas');
    expect(vis(s).has('cg_primeira')).toBe(true);
  });

  it('Gente grande: a certificação do Pequeno porte vira conquista', () => {
    const s = game('pequeno', 'CGH');
    s.cash = 20e6;
    expect(actions.buyRegionalCert(s)).toBeNull();
    const won = checkGoals(s);
    expect(won).toContain('pp_certificacao');
  });

  it('Três continentes conta América do Sul, do Norte e Europa', () => {
    const s = game('tradicional');
    s.license = 2;
    actions.buyDivision(s, 'internacional');
    for (const to of ['EZE', 'MIA', 'LIS'] as const) {
      const p = addTestPlane(s, 'A339');
      addTestRoute(s, 'GRU', to, p.id, { freq: 1 });
    }
    expect(checkGoals(s)).toContain('in_continentes');
  });
});

describe('escala do custo dos eventos', () => {
  it('avião pequeno conta pela capacidade; ATR 72 e maiores contam 1', async () => {
    const { scaleCost } = await import('../../src/engine/helpers');
    const s = makeGame();
    expect(scaleCost(s)).toBe(1); // mínimo 1
    for (let i = 0; i < 12; i++) addTestPlane(s, 'C208');
    expect(scaleCost(s)).toBeCloseTo((12 * 12) / 70);
    const t = makeGame();
    for (const m of ['AT7', 'A20N', 'A339', 'B73F'] as const) addTestPlane(t, m);
    expect(scaleCost(t)).toBe(4); // frota do protótipo: igual à contagem de aviões
  });
});
