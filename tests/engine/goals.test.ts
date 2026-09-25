import { describe, expect, it } from 'vitest';
import { GOALS, GOALS_BY_ID } from '../../src/engine/data/goals';
import { checkGoals, isDone, pendingGoals } from '../../src/engine/goals';
import { catchUp } from '../../src/engine/offline';
import { tick } from '../../src/engine/tick';
import { addTestPlane, addTestRoute, makeGame } from './helpers';

const prog = (id: string, s: Parameters<(typeof GOALS)[number]['progress']>[0]) =>
  GOALS_BY_ID[id]!.progress(s);

describe('objetivos', () => {
  it('34 objetivos (18 gerais e 16 por modelo ou divisão) com ids únicos e prêmio só em reputação (1 a 4)', () => {
    expect(GOALS).toHaveLength(34);
    expect(GOALS.filter((g) => !g.show)).toHaveLength(18);
    expect(new Set(GOALS.map((g) => g.id)).size).toBe(34);
    for (const g of GOALS) {
      expect(g.rep).toBeGreaterThanOrEqual(1);
      expect(g.rep).toBeLessThanOrEqual(4);
    }
  });

  it('jogo novo não cumpre nenhum', () => {
    const s = makeGame();
    expect(checkGoals(s)).toEqual([]);
    expect(pendingGoals(s)).toHaveLength(18);
  });

  it('progresso parcial e limitado ao alvo', () => {
    const s = makeGame();
    addTestPlane(s, 'AT7');
    addTestPlane(s, 'AT7');
    expect(prog('frota_3', s)).toEqual({ cur: 2, target: 3, kind: 'count' });
    s.cash = 40e6;
    expect(prog('caixa_25', s)).toEqual({ cur: 25e6, target: 25e6, kind: 'money' });
    expect(isDone(prog('caixa_25', s))).toBe(true);
    s.cash = -5e6;
    expect(prog('caixa_25', s).cur).toBe(0);
  });

  it('rota sem aeronave não conta', () => {
    const s = makeGame();
    addTestRoute(s, 'BSB', 'CNF', null);
    expect(isDone(prog('primeiro_voo', s))).toBe(false);
    const p = addTestPlane(s, 'AT7');
    s.routes[0]!.planes = [{ id: p.id, freq: 1 }];
    expect(isDone(prog('primeiro_voo', s))).toBe(true);
  });

  it('mês no azul exige 30 dias de histórico com soma positiva', () => {
    const s = makeGame();
    s.history = Array.from({ length: 29 }, (_, i) => ({ day: i + 2, cash: 0, profit: 1000, rep: 50 }));
    expect(isDone(prog('mes_azul', s))).toBe(false);
    s.history.push({ day: 31, cash: 0, profit: -20000, rep: 50 });
    expect(isDone(prog('mes_azul', s))).toBe(true);
    s.history.push({ day: 32, cash: 0, profit: -20000, rep: 50 });
    expect(isDone(prog('mes_azul', s))).toBe(false);
  });

  it('conquista dá reputação, entra no diário e não se repete', () => {
    const s = makeGame();
    s.day = 10;
    s.cash = 30e6;
    const rep = s.reputation;
    expect(checkGoals(s)).toEqual(['caixa_25']);
    expect(s.achievements.caixa_25).toBe(10);
    expect(s.reputation).toBe(rep + 1);
    expect(s.log[0]).toMatchObject({ text: 'Conquista: Caixa forte. Reputação +1.', tone: 'good' });
    expect(checkGoals(s)).toEqual([]);
    expect(s.reputation).toBe(rep + 1);
  });

  it('prêmio nunca mexe no caixa', () => {
    const s = makeGame();
    s.license = 2;
    s.cash = 600e6;
    const cash = s.cash;
    const won = checkGoals(s);
    expect(won).toEqual(expect.arrayContaining(['licenca_nacional', 'licenca_intl', 'caixa_500']));
    expect(s.cash).toBe(cash);
  });

  it('o tick confere os objetivos, inclusive no tempo offline', () => {
    const s = makeGame();
    const p = addTestPlane(s, 'AT7');
    addTestRoute(s, 'BSB', 'CNF', p.id);
    tick(s);
    expect(s.achievements.primeiro_voo).toBe(2);
    s.day = 360;
    s.savedAt = 1;
    catchUp(s, 10 * 60_000);
    expect(s.achievements.um_ano).toBe(366);
  });
});
