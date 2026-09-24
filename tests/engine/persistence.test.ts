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

  it('rejeita lixo e versões futuras', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate('x')).toBeNull();
    expect(migrate({ v: SAVE_VERSION })).toBeNull();
    expect(migrate({ ...makeGame(), v: SAVE_VERSION + 1 })).toBeNull();
    expect(migrate({ ...makeGame(), v: 0 })).toBeNull();
  });
});
