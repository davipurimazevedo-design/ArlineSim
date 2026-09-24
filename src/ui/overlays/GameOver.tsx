import { useGame } from '../../store/gameStore';
import { Btn } from '../components/Btn';
import { useDialog } from '../components/useDialog';

export function GameOver() {
  const over = useGame((s) => !!s.game?.gameOver);
  if (!over) return null;
  return <Card />;
}

function Card() {
  const name = useGame((s) => s.game?.name ?? '');
  const day = useGame((s) => s.game?.day ?? 0);
  const reset = useGame((s) => s.reset);
  const ref = useDialog<HTMLDivElement>();
  return (
    <div className="overlay">
      <div
        ref={ref}
        className="ticket result"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="go-title"
      >
        <h3 id="go-title">Falência</h3>
        <p>
          {name} operou por {day} dias antes de os credores assumirem.
        </p>
        <Btn kind="primary" onClick={reset}>
          Fundar outra companhia
        </Btn>
      </div>
    </div>
  );
}
