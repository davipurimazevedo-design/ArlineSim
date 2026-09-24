import { describe, expect, it } from 'vitest';
import { EVENTS, EVENTS_BY_ID } from '../../src/engine/data/events';
import { maintCost, modVal, slotCost } from '../../src/engine/formulas';
import { eligibleEvents, pickEvent, resolveEvent } from '../../src/engine/events';
import { rand } from '../../src/engine/rng';
import type { GameState, Side } from '../../src/engine/types';
import { addTestPlane, addTestRoute, makeGame } from './helpers';

/** Próximo número do RNG sem avançar o estado. */
const peek = (s: GameState) => rand({ seed: s.seed });

/** Encontra uma semente cujo próximo sorteio satisfaz a condição. */
function seedWhere(pred: (x: number) => boolean): number {
  for (let seed = 1; seed < 10000; seed++) if (pred(rand({ seed }))) return seed;
  throw new Error('sem semente');
}

/** Jogo com 2 aviões (escala = 2), uma rota, dia 50 e evento pendente. */
function setup(id: string, seed = 1): GameState {
  const s = makeGame('BSB', seed);
  s.day = 50;
  const a = addTestPlane(s, 'AT7', { condition: 80 });
  addTestPlane(s, 'AT7', { condition: 60 });
  addTestRoute(s, 'BSB', 'CNF', a.id);
  s.pendingEvent = id;
  return s;
}

function run(id: string, side: Side, seed = 1) {
  const s = setup(id, seed);
  const before = structuredClone(s);
  const out = resolveEvent(s, side);
  expect(out).toBeTypeOf('string');
  expect(s.pendingEvent).toBeNull();
  expect(s.log[0]).toMatchObject({ tone: 'event', text: `${EVENTS_BY_ID[id]!.title}: ${out}` });
  return { s, before, out: out! };
}

const mod = (s: GameState, type: string) => s.mods.find((m) => m.type === type);

describe('catálogo', () => {
  it('tem 30 eventos com ids únicos, começando pelos 12 do protótipo', () => {
    expect(EVENTS).toHaveLength(30);
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(30);
    expect(EVENTS.slice(0, 12).map((e) => e.id)).toEqual([
      'greve',
      'querosene',
      'cinzas',
      'influencer',
      'feriado',
      'anac',
      'guerra',
      'passaro',
      'patrocinio',
      'sistema',
      'copa',
      'slotbarato',
    ]);
  });

  it('resolveEvent sem evento pendente devolve null', () => {
    expect(resolveEvent(makeGame(), 'L')).toBeNull();
  });
});

describe('pickEvent', () => {
  it('não repete antes de 180 dias e respeita pré-requisitos', () => {
    const s = makeGame();
    s.day = 200;
    expect(eligibleEvents(s).map((e) => e.id)).not.toContain('passaro'); // sem frota
    addTestPlane(s, 'AT7');
    expect(eligibleEvents(s).map((e) => e.id)).toContain('passaro');
    const e = pickEvent(s)!;
    expect(s.usedEvents[e.id]).toBe(200);
    s.day = 380;
    expect(eligibleEvents(s).map((x) => x.id)).not.toContain(e.id);
    s.day = 381;
    expect(eligibleEvents(s).map((x) => x.id)).toContain(e.id);
  });

  it('devolve null se nenhum for elegível', () => {
    const s = makeGame();
    s.day = 10;
    for (const e of EVENTS) s.usedEvents[e.id] = 5;
    expect(pickEvent(s)).toBeNull();
  });
});

describe('resolveEvent', () => {
  it('greve', () => {
    let { s } = run('greve', 'L');
    expect(mod(s, 'salary')).toMatchObject({ value: 1.15, until: 170 });
    ({ s } = run('greve', 'R'));
    expect(mod(s, 'halt')).toMatchObject({ until: 53 });
    expect(s.reputation).toBe(44);
  });

  it('querosene', () => {
    let { s, before } = run('querosene', 'L');
    expect(s.cash).toBe(before.cash - 500000);
    expect(mod(s, 'fuel')).toMatchObject({ value: 0.9, until: 95 });
    ({ s } = run('querosene', 'R'));
    expect(mod(s, 'fuel')).toMatchObject({ value: 1.25, until: 90 });
  });

  it('cinzas', () => {
    let { s } = run('cinzas', 'L');
    expect(mod(s, 'halt')).toMatchObject({ until: 54 });
    expect(s.reputation).toBe(52);
    const hit = run(
      'cinzas',
      'R',
      seedWhere((x) => x < 0.35),
    );
    expect(hit.s.fleet.map((p) => p.condition)).toEqual([55, 35]);
    expect(hit.s.reputation).toBe(38);
    const miss = run(
      'cinzas',
      'R',
      seedWhere((x) => x >= 0.35),
    );
    expect(miss.s.fleet.map((p) => p.condition)).toEqual([80, 60]);
    expect(miss.out).toBe('Os voos passaram ao largo da nuvem. Nada aconteceu.');
    ({ s } = miss);
    expect(s.reputation).toBe(50);
  });

  it('influencer', () => {
    let { s, before } = run('influencer', 'L');
    expect(s.cash).toBe(before.cash - 160000);
    expect(s.reputation).toBe(53);
    ({ s } = run('influencer', 'R'));
    expect(s.reputation).toBe(43);
  });

  it('feriado', () => {
    let { s, before } = run('feriado', 'L');
    expect(s.cash).toBe(before.cash + 300000);
    expect(s.reputation).toBe(48);
    ({ s } = run('feriado', 'R'));
    expect(mod(s, 'demand')).toMatchObject({ value: 1.35, until: 60 });
    expect(s.fleet.map((p) => p.condition)).toEqual([75, 55]);
  });

  it('frota ± ignora aviões em manutenção e respeita 0–100', () => {
    const s = setup('anac');
    s.fleet[0]!.condition = 95;
    s.fleet[1]!.maint = 2;
    resolveEvent(s, 'L');
    expect(s.fleet.map((p) => p.condition)).toEqual([100, 60]);
  });

  it('anac', () => {
    let { s, before } = run('anac', 'L');
    expect(s.cash).toBe(before.cash - 240000);
    expect(s.fleet.map((p) => p.condition)).toEqual([90, 70]);
    const fined = run(
      'anac',
      'R',
      seedWhere((x) => x < 0.45),
    );
    expect(fined.s.cash).toBe(fined.before.cash - 800000);
    expect(fined.s.reputation).toBe(45);
    const ok = run(
      'anac',
      'R',
      seedWhere((x) => x >= 0.45),
    );
    expect(ok.s.cash).toBe(ok.before.cash);
    ({ s } = ok);
    expect(s.reputation).toBe(50);
  });

  it('guerra', () => {
    let { s, before } = run('guerra', 'L');
    expect(s.routes[0]!.price).toBe(Math.round(before.routes[0]!.price * 0.85));
    ({ s } = run('guerra', 'R'));
    expect(mod(s, 'share')).toMatchObject({ value: 0.8, until: 80 });
    expect(s.reputation).toBe(52);
  });

  it('passaro: inspeção completa é paga e não restaura a condição', () => {
    const { s, before } = run('passaro', 'L');
    const p = s.fleet[0]!;
    expect(p.maint).toBe(4);
    expect(p.restore).toBe(false);
    expect(s.cash).toBe(before.cash - maintCost(before.fleet[0]!));
  });

  it('passaro: inspeção visual', () => {
    const hit = run(
      'passaro',
      'R',
      seedWhere((x) => x < 0.4),
    );
    expect(hit.s.fleet[0]!.condition).toBe(45);
    expect(hit.s.reputation).toBe(46);
    const ok = run(
      'passaro',
      'R',
      seedWhere((x) => x >= 0.4),
    );
    expect(ok.s.fleet[0]!.condition).toBe(80);
  });

  it('passaro escolhe o primeiro avião disponível', () => {
    const s = setup('passaro');
    s.fleet[0]!.maint = 3;
    resolveEvent(s, 'L');
    expect(s.fleet[1]!.maint).toBe(4);
  });

  it('patrocinio', () => {
    let { s, before } = run('patrocinio', 'L');
    expect(s.cash).toBe(before.cash);
    ({ s, before } = run('patrocinio', 'R'));
    expect(s.cash).toBe(before.cash - 600000);
    expect(s.reputation).toBe(56);
    expect(mod(s, 'demand')).toMatchObject({ value: 1.08, until: 140 });
  });

  it('sistema', () => {
    let { s, before } = run('sistema', 'L');
    expect(s.cash).toBe(before.cash - 180000);
    ({ s } = run('sistema', 'R'));
    expect(mod(s, 'demand')).toMatchObject({ value: 0.7, until: 53 });
    expect(s.reputation).toBe(47);
  });

  it('copa', () => {
    const l = run('copa', 'L');
    expect(mod(l.s, 'demand')).toMatchObject({ value: 1.2, until: 57 });
    expect(l.s.reputation).toBe(53);
    const r = run('copa', 'R');
    expect(r.s.cash).toBe(r.before.cash + 400000);
    expect(r.s.reputation).toBe(48);
  });

  it('slotbarato compra o maior aeroporto elegível pela metade', () => {
    let { s, before } = run('slotbarato', 'L');
    expect(s.slots).toEqual(before.slots);
    ({ s, before } = run('slotbarato', 'R'));
    // BSB já é hub; CNF já tem slot pela rota; o maior doméstico livre é GRU
    expect(s.slots.at(-1)).toBe('GRU');
    expect(s.cash).toBe(before.cash - slotCost('GRU') / 2);
  });

  it('slotbarato sem caixa', () => {
    const s = setup('slotbarato');
    s.cash = 0;
    expect(resolveEvent(s, 'R')).toBe('Caixa insuficiente. A oferta foi para um concorrente.');
  });

  it('é determinístico: mesma semente, mesmo desfecho', () => {
    for (const e of EVENTS) {
      for (const side of ['L', 'R'] as const) {
        const a = setup(e.id, 99);
        const b = setup(e.id, 99);
        expect(peek(a)).toBe(peek(b));
        resolveEvent(a, side);
        resolveEvent(b, side);
        expect(a.cash).toBe(b.cash);
        expect(a.reputation).toBe(b.reputation);
        expect(a.fleet.map((p) => [p.condition, p.maint])).toEqual(
          b.fleet.map((p) => [p.condition, p.maint]),
        );
        expect(modVal(a, 'demand')).toBe(modVal(b, 'demand'));
      }
    }
  });
});
