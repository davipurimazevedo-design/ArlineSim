import { describe, expect, it } from 'vitest';
import { EVENTS_BY_ID } from '../../src/engine/data/events';
import { eligibleEvents, pickEvent, resolveEvent } from '../../src/engine/events';
import { modVal } from '../../src/engine/formulas';
import { chainReady, dayOfYear } from '../../src/engine/helpers';
import { rand } from '../../src/engine/rng';
import { tick } from '../../src/engine/tick';
import type { GameState, Side } from '../../src/engine/types';
import { addTestPlane, addTestRoute, makeGame } from './helpers';

const ids = (s: GameState) => eligibleEvents(s).map((e) => e.id);

function seedWhere(pred: (x: number) => boolean): number {
  for (let seed = 1; seed < 10000; seed++) if (pred(rand({ seed }))) return seed;
  throw new Error('sem semente');
}

/** Jogo com 4 aviões (escala 4), 3 rotas, dia 200 e o evento pendente. */
function setup(id: string | null, seed = 1): GameState {
  const s = makeGame('BSB', seed);
  s.day = 200;
  const planes = [0, 1, 2, 3].map(() => addTestPlane(s, 'AT7', { condition: 80 }));
  addTestRoute(s, 'BSB', 'CNF', planes[0]!.id);
  addTestRoute(s, 'BSB', 'GRU', planes[1]!.id);
  addTestRoute(s, 'BSB', 'SSA', planes[2]!.id);
  s.pendingEvent = id;
  return s;
}

function run(id: string, side: Side, seed = 1) {
  const s = setup(id, seed);
  const before = structuredClone(s);
  const out = resolveEvent(s, side)!;
  expect(out).toBeTypeOf('string');
  expect(s.pendingEvent).toBeNull();
  return { s, before, out };
}

const NEW = [
  'carnaval',
  'ferias',
  'fimdeano',
  'sindicato',
  'clubefinal',
  'clubeescandalo',
  'hedge',
  'anacvolta',
  'procon',
  'turbulencia',
  'app',
  'obras',
  'aeroportuarios',
  'recall',
  'talento',
  'dolar',
  'aerovia',
  'enchente',
];

describe('eventos da Fase 2', () => {
  it('os 18 existem e resolvem os dois lados', () => {
    for (const id of NEW) {
      expect(EVENTS_BY_ID[id], id).toBeDefined();
      for (const side of ['L', 'R'] as const) {
        const { s, out } = run(id, side);
        expect(s.log[0]!.text).toBe(`${EVENTS_BY_ID[id]!.title}: ${out}`);
      }
    }
  });

  it('custos escalam com a frota', () => {
    const { s, before } = run('turbulencia', 'L');
    expect(s.cash).toBe(before.cash - 70000 * 4);
    expect(s.reputation).toBe(52);
  });

  it('desfechos com sorteio', () => {
    const bad = run(
      'fimdeano',
      'R',
      seedWhere((x) => x < 0.4),
    );
    expect(bad.out).toContain('Malas extraviadas');
    expect(bad.s.reputation).toBe(44);
    const ok = run(
      'fimdeano',
      'R',
      seedWhere((x) => x >= 0.4),
    );
    expect(ok.out).toContain('segurou o tranco');
    const lost = run(
      'procon',
      'R',
      seedWhere((x) => x < 0.5),
    );
    expect(lost.s.cash).toBe(lost.before.cash - 500000 * 4);
  });

  it('usam os modificadores wear e share', () => {
    expect(modVal(run('recall', 'R').s, 'wear')).toBeCloseTo(1.3);
    expect(modVal(run('aerovia', 'R').s, 'share')).toBeCloseTo(0.85);
  });

  it('alguns dependem do tamanho da companhia', () => {
    const s = makeGame();
    s.day = 200;
    expect(ids(s)).not.toContain('app');
    expect(ids(s)).not.toContain('talento');
    expect(ids(s)).not.toContain('recall');
    const big = setup(null);
    expect(ids(big)).toContain('app');
    expect(ids(big)).toContain('talento');
    expect(ids(big)).toContain('aerovia');
    expect(ids(big)).not.toContain('recall'); // só ATR
    addTestPlane(big, 'E295');
    expect(ids(big)).toContain('recall');
  });
});

describe('sazonais', () => {
  it('dayOfYear dá a volta no ano', () => {
    expect(dayOfYear(1)).toBe(1);
    expect(dayOfYear(365)).toBe(365);
    expect(dayOfYear(366)).toBe(1);
  });

  it('só são elegíveis dentro da janela', () => {
    const s = setup(null);
    s.day = 34;
    expect(ids(s)).not.toContain('carnaval');
    s.day = 35;
    expect(ids(s)).toContain('carnaval');
    s.day = 48 + 365; // fevereiro do ano seguinte
    expect(ids(s)).toContain('carnaval');
    s.day = 49;
    expect(ids(s)).not.toContain('carnaval');
  });

  it('saem no máximo uma vez por ano', () => {
    const s = setup(null);
    s.day = 40;
    s.usedEvents.carnaval = 36;
    expect(ids(s)).not.toContain('carnaval');
    s.day = 40 + 365;
    expect(ids(s)).toContain('carnaval');
  });

  it('têm prioridade de 60% dentro da janela, não 100%', () => {
    let hits = 0;
    const N = 400;
    for (let seed = 1; seed <= N; seed++) {
      const s = setup(null, seed);
      s.day = 40;
      if (pickEvent(s)!.id === 'carnaval') hits++;
    }
    expect(hits / N).toBeGreaterThan(0.55);
    expect(hits / N).toBeLessThan(0.75);
  });
});

describe('cadeias', () => {
  it('"Endurecer" na greve libera o sindicato 60 dias depois, uma vez', () => {
    const s = setup('greve');
    expect(ids(s)).not.toContain('sindicato');
    resolveEvent(s, 'R');
    expect(s.flags.greve_dura).toBe(200);
    s.day = 259;
    expect(ids(s)).not.toContain('sindicato');
    s.day = 260;
    expect(ids(s)).toContain('sindicato');
    s.usedEvents.sindicato = 260;
    expect(chainReady(s, 'greve_dura', 60, 'sindicato')).toBe(false);
  });

  it('o acordo do sindicato bloqueia a greve por um ano', () => {
    const s = setup('sindicato');
    resolveEvent(s, 'L');
    expect(ids(s)).not.toContain('greve');
    s.day = 200 + 364;
    expect(ids(s)).not.toContain('greve');
    s.day = 200 + 365;
    expect(ids(s)).toContain('greve');
  });

  it('cada origem marca a própria cadeia', () => {
    const cases: [string, Side, string, string, number][] = [
      ['patrocinio', 'R', 'patrocinio', 'clubefinal', 30],
      ['patrocinio', 'R', 'patrocinio', 'clubeescandalo', 45],
      ['querosene', 'L', 'hedge', 'hedge', 40],
      ['anac', 'R', 'anac_prazo', 'anacvolta', 30],
      ['influencer', 'R', 'video_ignorado', 'procon', 40],
    ];
    for (const [origin, side, flag, next, after] of cases) {
      const s = setup(origin);
      resolveEvent(s, side);
      expect(s.flags[flag], origin).toBe(200);
      s.day = 200 + after - 1;
      expect(ids(s), next).not.toContain(next);
      s.day = 200 + after;
      expect(ids(s), next).toContain(next);
    }
  });

  it('a outra escolha não abre a cadeia', () => {
    const s = setup('greve');
    resolveEvent(s, 'L');
    expect(s.flags.greve_dura).toBeUndefined();
  });
});

describe('frequência das cartas', () => {
  it('em 3 anos saem de 18 a 37 cartas, sem repetir um avulso em menos de 180 dias', () => {
    const s = setup(null, 11);
    s.day = 1;
    s.nextEvent = 25;
    const seen: Record<string, number> = {};
    let cards = 0;
    for (let i = 0; i < 365 * 3; i++) {
      tick(s);
      s.cash = 50e6; // evita falência durante o teste
      if (!s.pendingEvent) continue;
      const id = s.pendingEvent;
      const last = seen[id];
      if (last !== undefined) expect(s.day - last, id).toBeGreaterThan(180);
      seen[id] = s.day;
      cards++;
      resolveEvent(s, 'L');
    }
    expect(cards).toBeGreaterThanOrEqual(18);
    expect(cards).toBeLessThanOrEqual(37);
  });
});
