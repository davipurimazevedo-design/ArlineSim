import { useState } from 'react';
import { fmtInt, fmtMoney, GOALS, pendingGoals, type Progress } from '../../engine';
import { useGameState } from '../../store/gameStore';
import { Bar } from '../components/Bar';
import { Empty } from '../components/Empty';
import { Pill } from '../components/Pill';

const NEXT = 3;

function progressText(p: Progress): string {
  if (p.kind === 'money') return `${fmtMoney(p.cur)} de ${fmtMoney(p.target)}`;
  if (p.kind === 'count') return `${fmtInt(p.cur)} de ${fmtInt(p.target)}`;
  return p.cur >= p.target ? 'feito' : 'pendente';
}

/** Próximos objetivos com progresso e, alternando, a lista de conquistas. */
export function GoalsPanel() {
  const g = useGameState();
  const [showDone, setShowDone] = useState(false);
  const next = pendingGoals(g).slice(0, NEXT);
  const done = GOALS.filter((x) => g.achievements[x.id] !== undefined).sort(
    (a, b) => g.achievements[b.id]! - g.achievements[a.id]!,
  );

  return (
    <div className="panel span2">
      <div className="goals-head">
        <h2>Objetivos</h2>
        <small>
          {done.length} de {GOALS.length} conquistas
        </small>
        {done.length > 0 && (
          <button
            type="button"
            className="link"
            onClick={() => setShowDone(!showDone)}
            aria-expanded={showDone}
          >
            {showDone ? 'Ver próximos objetivos' : 'Ver conquistas'}
          </button>
        )}
      </div>
      {showDone ? (
        <ul className="goal-list done">
          {done.map((x) => (
            <li key={x.id}>
              <div>
                <b>{x.title}</b>
                <small>{x.desc}</small>
              </div>
              <small className="num">dia {g.achievements[x.id]}</small>
              <Pill tone="ok">+{x.rep} reputação</Pill>
            </li>
          ))}
        </ul>
      ) : next.length ? (
        <ul className="goal-list">
          {next.map((x) => {
            const p = x.progress(g);
            return (
              <li key={x.id}>
                <div>
                  <b>{x.title}</b>
                  <small>{x.desc}</small>
                </div>
                <div className="goal-bar">
                  <Bar v={(p.cur / p.target) * 100} tone="teal" label={`Progresso de ${x.title}`} />
                  <small className="num">{progressText(p)}</small>
                </div>
                <Pill tone="ok">+{x.rep} reputação</Pill>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>Todas as conquistas obtidas. Parabéns, comandante.</Empty>
      )}
    </div>
  );
}
