import { describe, expect, it } from 'vitest';
import * as actions from '../../src/engine/actions';
import {
  restartTutorial,
  skipTutorial,
  takeTip,
  TUT_MAX_DAY,
  tutorialProgress,
  tutorialTarget,
  tutorialVisible,
} from '../../src/engine/onboarding';
import { newGame } from '../../src/engine/newGame';
import { tick } from '../../src/engine/tick';
import { createRoute } from '../../src/engine/routePlanner';
import { makeGame } from './helpers';

describe('primeiros passos', () => {
  it('começa no passo 1, com destaque no botão Nova rota', () => {
    const s = makeGame();
    expect(tutorialVisible(s)).toBe(true);
    const p = tutorialProgress(s);
    expect(p.done).toBe(0);
    expect(p.current?.id).toBe('rota');
    expect(tutorialTarget(s)).toBe('nova-rota');
  });

  it('marca os passos conforme o jogador joga', () => {
    const s = makeGame('BSB');
    expect(createRoute(s, { from: 'BSB', to: 'CNF', planeId: null, leaseModel: 'AT7' })).toBeNull();
    expect(tutorialProgress(s).current?.id).toBe('ajuste');
    const r = s.routes[0]!;
    actions.updateRoute(s, r.id, { price: r.price - 20 });
    expect(tutorialProgress(s).current?.id).toBe('dias');
    for (let i = 0; i < 8; i++) tick(s, { noEvents: true });
    expect(tutorialProgress(s).current?.id).toBe('evento');
    s.usedEvents.greve = s.day;
    expect(tutorialProgress(s).current?.id).toBe('manutencao');
    expect(actions.maintain(s, s.fleet[0]!.id)).toBeNull();
    expect(tutorialProgress(s).current?.id).toBe('segunda');
  });

  it('o texto do primeiro passo muda com o modelo de negócio', () => {
    const peq = newGame('x', 'CGH', 1, 0, 'pequeno');
    const trad = makeGame();
    const step = tutorialProgress(peq).current!;
    expect(step.hint(peq)).toMatch(/Caravan/);
    expect(step.hint(trad)).not.toMatch(/Caravan/);
  });

  it('pular esconde; refazer mostra de novo, mesmo em jogo avançado', () => {
    const s = makeGame();
    skipTutorial(s);
    expect(tutorialVisible(s)).toBe(false);
    expect(tutorialTarget(s)).toBeNull();
    s.day = TUT_MAX_DAY + 50;
    restartTutorial(s);
    expect(tutorialVisible(s)).toBe(true);
  });

  it('jogos antigos (depois do dia 90) não veem o roteiro sem pedir', () => {
    const s = makeGame();
    s.day = TUT_MAX_DAY + 1;
    expect(tutorialVisible(s)).toBe(false);
  });
});

describe('dicas de primeira vez', () => {
  it('cada dica aparece uma vez só', () => {
    const s = makeGame();
    expect(takeTip(s)).toBeNull();
    s.cash = -1;
    expect(takeTip(s)?.id).toBe('dica_caixa');
    expect(takeTip(s)).toBeNull();
  });

  it('carta de evento pendente explica o arrastar', () => {
    const s = makeGame();
    s.pendingEvent = 'greve';
    expect(takeTip(s)?.text).toMatch(/arraste/);
  });
});
