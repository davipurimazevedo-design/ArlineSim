// Onboarding (Fase 4): roteiro de primeiros passos que se marca sozinho e dicas de primeira vez.
// Tudo derivado do estado e de marcas em `flags` (sem campo novo no save).
import { setFlag } from './helpers';
import type { GameState } from './types';

/** Partes da interface que podem ser destacadas (atributo data-tut-target). */
export type TutTarget = 'nova-rota' | 'rotas' | 'velocidade' | 'frota' | null;

/** Alvos refinados pela interface conforme o que está aberto (ver ui/screens/Onboarding.tsx). */
export type TutUiTarget = Exclude<TutTarget, null> | 'criar-rota' | 'rota-linha' | 'tarifa' | 'auto-manut';

export interface TutStep {
  id: string;
  title: string;
  /** frase curta de como fazer */
  hint: (s: GameState) => string;
  done: (s: GameState) => boolean;
  /** onde fica o destaque enquanto este é o passo atual */
  target: TutTarget;
}

const flying = (s: GameState) => s.routes.filter((r) => r.planes.length > 0);

export const TUT_STEPS: TutStep[] = [
  {
    id: 'rota',
    title: 'Criar a primeira rota',
    hint: (s) =>
      s.businessModel === 'pequeno'
        ? 'Em Rotas, toque em Nova rota. Cidades pequenas e remotas pagam mais: o Caravan pousa em pista curta e de terra.'
        : s.businessModel === 'lowcost'
          ? 'Em Rotas, toque em Nova rota e escolha um destino movimentado: a Low-cost vive de avião cheio.'
          : 'Em Rotas, toque em Nova rota e escolha um destino até 1.500 km do hub. Os slots que faltam vêm junto.',
    done: (s) => flying(s).length > 0,
    target: 'nova-rota',
  },
  {
    id: 'ajuste',
    title: 'Ajustar tarifa ou frequência',
    hint: (s) =>
      s.businessModel === 'lowcost'
        ? 'Abra a rota na lista. Tarifa abaixo da referência enche o avião: a demanda da Low-cost responde mais a preço.'
        : 'Abra a rota na lista e mexa na tarifa ou na frequência. A previsão mostra o efeito na hora.',
    done: (s) => s.flags.tut_ajuste !== undefined,
    target: 'rotas',
  },
  {
    id: 'dias',
    title: 'Deixar o tempo correr',
    hint: () => 'Use 1×, 2× ou 4× no topo e acompanhe o resultado do dia no Painel por uma semana.',
    done: (s) => flying(s).some((r) => s.day - r.opened >= 7),
    target: 'velocidade',
  },
  {
    id: 'manutencao',
    title: 'Cuidar da manutenção',
    hint: () =>
      'Em Frota, escolha o limite da manutenção automática (ou faça uma manutenção à mão). Avião gasto quebra e fica dias no chão.',
    done: (s) => s.flags.tut_manut !== undefined,
    target: 'frota',
  },
  {
    id: 'segunda',
    title: 'Abrir a segunda rota',
    hint: () =>
      'Com o caixa crescendo, abra outra rota. Rotas que saem do hub ganham passageiros de conexão.',
    done: (s) => flying(s).length >= 2,
    target: 'nova-rota',
  },
  {
    id: 'evento',
    title: 'Responder uma carta de evento',
    hint: () =>
      'Cartas de evento chegam de tempos em tempos (a primeira, por volta do dia 40). Arraste para um lado ou use os botões.',
    done: (s) => Object.keys(s.usedEvents).length > 0 && !s.pendingEvent,
    target: null,
  },
];

/** jogos que passaram deste dia sem o tutorial não o veem mais (saves de antes da Fase 4) */
export const TUT_MAX_DAY = 90;

/** O roteiro aparece? Some se foi pulado, se terminou ou em jogos antigos. */
export function tutorialVisible(s: GameState): boolean {
  if (s.flags.tut_skip !== undefined) return false;
  if (s.flags.tut_fim !== undefined) return false;
  return s.day <= TUT_MAX_DAY || s.flags.tut_ativo !== undefined;
}

export function tutorialProgress(s: GameState): { done: number; total: number; current: TutStep | null } {
  const done = TUT_STEPS.filter((x) => x.done(s)).length;
  return { done, total: TUT_STEPS.length, current: TUT_STEPS.find((x) => !x.done(s)) ?? null };
}

/** Destaque atual (null se o roteiro não aparece). */
export function tutorialTarget(s: GameState): TutTarget {
  return tutorialVisible(s) ? (tutorialProgress(s).current?.target ?? null) : null;
}

export function skipTutorial(s: GameState): null {
  setFlag(s, 'tut_skip');
  return null;
}

/** Encerra o roteiro concluído (o jogador fecha a mensagem de parabéns). */
export function finishTutorial(s: GameState): null {
  setFlag(s, 'tut_fim');
  return null;
}

/** Refazer: volta a mostrar o roteiro; os passos já feitos continuam marcados. */
export function restartTutorial(s: GameState): null {
  delete s.flags.tut_skip;
  delete s.flags.tut_fim;
  delete s.flags.tut_ajuste;
  delete s.flags.tut_manut;
  setFlag(s, 'tut_ativo');
  return null;
}

// ---------------------------------------------------------------- dicas de primeira vez

export interface Tip {
  id: string;
  text: string;
  when: (s: GameState) => boolean;
}

export const TIPS: Tip[] = [
  {
    id: 'dica_evento',
    text: 'Carta de evento: arraste para a esquerda ou a direita, ou use os botões e as setas do teclado. O jogo espera sua decisão.',
    when: (s) => !!s.pendingEvent,
  },
  {
    id: 'dica_condicao',
    text: 'Um avião está gasto. Abaixo de 40% de condição ele pode quebrar e ficar dias no chão. Em Frota, faça a manutenção ou ajuste a manutenção automática.',
    when: (s) => s.fleet.some((p) => p.condition < 45 && !p.maint),
  },
  {
    id: 'dica_caixa',
    text: 'Caixa negativo. Tome crédito em Finanças; abaixo de −R$ 15 mi os credores assumem a companhia.',
    when: (s) => s.cash < 0,
  },
  {
    id: 'dica_prejuizo',
    text: 'Uma rota está no prejuízo. No editor da rota, teste outra tarifa, menos frequência ou outro avião.',
    // depois de 10 dias, para não disparar no primeiro dia de uma rota que ainda vai encher
    when: (s) => s.routes.some((r) => r.last?.flying && r.last.profit < 0 && s.day - r.opened >= 10),
  },
];

/** Próxima dica ainda não vista cuja condição vale agora; já a marca como vista. */
export function takeTip(s: GameState): Tip | null {
  const t = TIPS.find((x) => s.flags[x.id] === undefined && x.when(s));
  if (t) setFlag(s, t.id);
  return t ?? null;
}
