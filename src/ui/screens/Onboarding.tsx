import { useEffect, useState } from 'react';
import {
  finishTutorial,
  skipTutorial,
  TUT_STEPS,
  tutorialProgress,
  tutorialVisible,
  type TutStep,
  type TutUiTarget,
} from '../../engine';
import { useGame, useGameState, type Tab } from '../../store/gameStore';
import { Btn } from '../components/Btn';

interface View {
  tab: Tab;
  routeForm: boolean;
  routeOpen: string | null;
}

/**
 * Onde está o próximo clique do passo atual, dado o que está aberto na tela.
 * Assim o destaque acompanha o jogador: aba certa → botão → formulário → campo.
 */
function uiTarget(step: TutStep, v: View): TutUiTarget | null {
  switch (step.id) {
    case 'rota':
    case 'segunda':
      if (v.tab !== 'rotas') return 'rotas';
      return v.routeForm ? 'criar-rota' : 'nova-rota';
    case 'ajuste':
      if (v.tab !== 'rotas') return 'rotas';
      return v.routeOpen ? 'tarifa' : 'rota-linha';
    case 'dias':
      return 'velocidade';
    case 'manutencao':
      return v.tab !== 'frota' ? 'frota' : 'auto-manut';
    default:
      return null;
  }
}

/** Frase curta do próximo clique. */
const ACTION: Record<TutUiTarget, string> = {
  rotas: 'Abra a aba Rotas.',
  'nova-rota': 'Toque em Nova rota.',
  'criar-rota': 'Escolha o destino e a aeronave e toque em Criar rota.',
  'rota-linha': 'Toque na rota da lista para abrir o editor.',
  tarifa: 'Mova a tarifa (ou a frequência de um avião) e veja a previsão mudar.',
  velocidade: 'Escolha 1×, 2× ou 4× no topo e acompanhe o resultado do dia.',
  frota: 'Abra a aba Frota.',
  'auto-manut': 'Escolha o limite da manutenção automática.',
};

/**
 * Primeiros passos: cartão flutuante em todas as telas, com o passo atual e o próximo clique.
 * Marca o elemento a destacar em <body data-tut>.
 */
export function Onboarding() {
  const g = useGameState();
  const act = useGame((s) => s.act);
  const tab = useGame((s) => s.tab);
  const routeForm = useGame((s) => s.routeForm);
  const routeOpen = useGame((s) => s.routeOpen);
  const [expanded, setExpanded] = useState(false);
  const [min, setMin] = useState(false);

  const visible = tutorialVisible(g);
  const { done, total, current } = tutorialProgress(g);
  const target = visible && current ? uiTarget(current, { tab, routeForm, routeOpen }) : null;

  useEffect(() => {
    if (target && !min) document.body.dataset.tut = target;
    else delete document.body.dataset.tut;
    return () => {
      delete document.body.dataset.tut;
    };
  }, [target, min]);

  if (!visible) return null;

  if (!current)
    return (
      <aside className="coach done" aria-label="Primeiros passos">
        <b>Primeiros passos concluídos</b>
        <p>
          Você já sabe o essencial. Os objetivos no Painel dão a direção daqui para frente; o menu Jogo refaz
          este roteiro.
        </p>
        <Btn small kind="primary" onClick={() => act((s) => finishTutorial(s))}>
          Fechar
        </Btn>
      </aside>
    );

  if (min)
    return (
      <button type="button" className="coach-pill" onClick={() => setMin(false)}>
        Primeiros passos · {done} de {total}
      </button>
    );

  return (
    <aside className="coach" aria-label="Primeiros passos" aria-live="polite">
      <div className="coach-head">
        <small>
          Primeiros passos · {done + 1} de {total}
        </small>
        <button
          type="button"
          className="link"
          onClick={() => setMin(true)}
          aria-label="Minimizar primeiros passos"
        >
          Minimizar
        </button>
      </div>
      <b>{current.title}</b>
      <p className="coach-action">{target ? ACTION[target] : current.hint(g)}</p>
      {target && <p className="coach-hint">{current.hint(g)}</p>}
      {expanded && (
        <ol className="coach-steps">
          {TUT_STEPS.map((x) => (
            <li key={x.id} className={x.done(g) ? 'done' : x.id === current.id ? 'now' : ''}>
              {x.title}
            </li>
          ))}
        </ol>
      )}
      <div className="coach-foot">
        <button
          type="button"
          className="link"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? 'Esconder os passos' : 'Ver todos os passos'}
        </button>
        <button type="button" className="link" onClick={() => act((s) => skipTutorial(s))}>
          Pular tutorial
        </button>
      </div>
    </aside>
  );
}
