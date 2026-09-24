import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from '../../src/engine/newGame';
import { tick } from '../../src/engine/tick';
import { migrate } from '../../src/store/migrate';
import { addTestPlane, addTestRoute, makeGame } from './helpers';

describe('save', () => {
  it('o GameState sobrevive a um ciclo JSON sem perdas', () => {
    const s = makeGame('GRU', 5);
    const p = addTestPlane(s, 'AT7');
    addTestRoute(s, 'GRU', 'CWB', p.id);
    for (let i = 0; i < 40; i++) tick(s);
    const back = migrate(JSON.parse(JSON.stringify(s)));
    expect(back).toEqual(s);
  });

  it('continua idêntico depois de recarregado (RNG incluído)', () => {
    const a = makeGame('GRU', 5);
    for (let i = 0; i < 10; i++) tick(a);
    const b = migrate(JSON.parse(JSON.stringify(a)))!;
    for (let i = 0; i < 30; i++) {
      tick(a);
      tick(b);
    }
    expect(b).toEqual(a);
  });

  it('migra um save da Fase 1 (v1) até a versão atual', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'CNF', p.id, { freq: 3 });
    const empty = addTestRoute(s, 'BSB', 'GYN', null);
    const { planes: _a, rivals: _ra, ...r1 } = r;
    const { planes: _b, rivals: _rb, ...e1 } = empty;
    const v1 = {
      ...s,
      v: 1,
      routes: [
        { ...r1, planeId: p.id, freq: 3 },
        { ...e1, planeId: null, freq: 1 },
      ],
    };
    const g = migrate(JSON.parse(JSON.stringify(v1)))!;
    expect(g.v).toBe(SAVE_VERSION);
    expect(g.routes[0]!.planes).toEqual([{ id: p.id, freq: 3 }]);
    expect(g.routes[1]!.planes).toEqual([]);
    expect(g.fleet[0]!.cabin).toBe(0);
    expect(g.routes[0]!.rivals.map((x) => x.id)).toEqual(['horizonte', 'aerovia', 'ipe']);
    expect(g.routes[0]).not.toHaveProperty('planeId');
    expect(g.routes[0]).not.toHaveProperty('freq');
  });

  it('rejeita lixo e versões futuras', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate('x')).toBeNull();
    expect(migrate({ v: SAVE_VERSION })).toBeNull();
    expect(migrate({ ...makeGame(), v: SAVE_VERSION + 1 })).toBeNull();
    expect(migrate({ ...makeGame(), v: 0 })).toBeNull();
  });
});

describe('migração v3 → v4', () => {
  it('acrescenta as marcas das cadeias de eventos', () => {
    const { flags: _f, ...s } = makeGame();
    const g = migrate(JSON.parse(JSON.stringify({ ...s, v: 3 })))!;
    expect(g.v).toBe(SAVE_VERSION);
    expect(g.flags).toEqual({});
  });
});

describe('migração v2 → v3', () => {
  it('acrescenta cabine e concorrentes a um save da etapa 1 da Fase 2', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7');
    const r = addTestRoute(s, 'BSB', 'CNF', p.id);
    const { cabin: _c, ...p2 } = p;
    const { rivals: _r, ...r2 } = r;
    const g = migrate(JSON.parse(JSON.stringify({ ...s, v: 2, fleet: [p2], routes: [r2] })))!;
    expect(g.v).toBe(SAVE_VERSION);
    expect(g.fleet[0]!.cabin).toBe(0);
    expect(g.routes[0]!.planes).toEqual(r.planes);
    expect(g.routes[0]!.rivals.length).toBeGreaterThan(0);
  });
});
