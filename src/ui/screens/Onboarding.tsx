import { finishTutorial, skipTutorial, TUT_STEPS, tutorialProgress, tutorialVisible } from '../../engine';
import { useGame, useGameState, type Tab } from '../../store/gameStore';
import { Btn } from '../components/Btn';

/** aba onde se faz cada passo (botão "Ir") */
const STEP_TAB: Record<string, Tab | undefined> = {
  rota: 'rotas',
  ajuste: 'rotas',
  manutencao: 'frota',
  segunda: 'rotas',
};

/** Roteiro de primeiros passos no Painel: marca-se sozinho conforme o jogador avança. */
export function Onboarding() {
  const g = useGameState();
  const act = useGame((s) => s.act);
  const setTab = useGame((s) => s.setTab);
  if (!tutorialVisible(g)) return null;
  const { done, total, current } = tutorialProgress(g);

  if (!current)
    return (
      <div className="panel start tut">
        <h2>Primeiros passos · concluídos</h2>
        <p className="note">
          Você já sabe o essencial. Os objetivos abaixo dão a direção daqui para frente, e o menu Jogo
          (engrenagem no topo) guarda o save em arquivo e refaz este roteiro.
        </p>
        <Btn kind="primary" onClick={() => act((s) => finishTutorial(s))}>
          Fechar
        </Btn>
      </div>
    );

  const tab = STEP_TAB[current.id];
  return (
    <div className="panel start tut">
      <div className="tut-head">
        <h2>
          Primeiros passos · {done} de {total}
        </h2>
        <button type="button" className="link" onClick={() => act((s) => skipTutorial(s))}>
          Pular tutorial
        </button>
      </div>
      <ol>
        {TUT_STEPS.map((x) => {
          const ok = x.done(g);
          const now = x.id === current.id;
          return (
            <li key={x.id} className={ok ? 'done' : now ? 'now' : ''} aria-current={now ? 'step' : undefined}>
              <b>{x.title}</b>
              {now && <small>{x.hint(g)}</small>}
            </li>
          );
        })}
      </ol>
      {tab && (
        <Btn small kind="primary" onClick={() => setTab(tab)}>
          Ir para {tab === 'rotas' ? 'Rotas' : 'Frota'}
        </Btn>
      )}
    </div>
  );
}
