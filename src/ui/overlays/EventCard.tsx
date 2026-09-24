import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { currentEvent, fmtDate, type GameEvent, type Side } from '../../engine';
import { useGame } from '../../store/gameStore';
import { Btn } from '../components/Btn';
import { Icon } from '../components/Icon';
import { useDialog } from '../components/useDialog';
import { Fx } from './Fx';

/** distância de arraste que escolhe a opção */
const THRESHOLD = 110;

export function EventCard() {
  const e = useGame((s) => (s.game ? currentEvent(s.game) : null));
  const blocked = useGame((s) => !!s.result || !!s.game?.gameOver);
  if (!e || blocked) return null;
  return <Card key={e.id} e={e} />;
}

function Card({ e }: { e: GameEvent }) {
  const decide = useGame((s) => s.decide);
  const day = useGame((s) => s.game?.day ?? 1);
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const start = useRef(0);
  const ref = useDialog<HTMLDivElement>();

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowLeft') decide('L');
      else if (ev.key === 'ArrowRight') decide('R');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [decide]);

  const side: Side | null = dx < -30 ? 'L' : dx > 30 ? 'R' : null;
  const pow = Math.min(1, Math.abs(dx) / THRESHOLD);

  const down = (ev: PointerEvent<HTMLDivElement>) => {
    start.current = ev.clientX;
    setDrag(true);
    ev.currentTarget.setPointerCapture(ev.pointerId);
  };
  const move = (ev: PointerEvent<HTMLDivElement>) => {
    if (drag) setDx(ev.clientX - start.current);
  };
  const up = () => {
    if (!drag) return;
    setDrag(false);
    if (dx < -THRESHOLD) decide('L');
    else if (dx > THRESHOLD) decide('R');
    else setDx(0);
  };

  return (
    <div className="overlay" ref={ref} role="dialog" aria-modal="true" aria-labelledby="ev-title" aria-describedby="ev-text">
      <div className="swipe-hint l" style={{ opacity: side === 'L' ? pow : 0.25 }} aria-hidden="true">
        {e.L.label}
      </div>
      <div className="swipe-hint r" style={{ opacity: side === 'R' ? pow : 0.25 }} aria-hidden="true">
        {e.R.label}
      </div>
      <div
        className={'ticket' + (drag ? ' dragging' : '')}
        style={{ transform: `translateX(${dx}px) rotate(${dx / 18}deg)` }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <div className="ticket-top">
          <span className="ev-icon">
            <Icon n={e.icon} size={34} />
          </span>
          <div>
            <small>{fmtDate(day)}</small>
            <h3 id="ev-title">{e.title}</h3>
          </div>
        </div>
        <p id="ev-text">{e.text}</p>
        <div className="perf" />
        <div className="ticket-stub">
          <div className={side === 'L' ? 'hot' : ''}>
            <small>← Deslize</small>
            <b>{e.L.label}</b>
            <Fx fx={e.L.fx} />
          </div>
          <div className={side === 'R' ? 'hot' : ''}>
            <small>Deslize →</small>
            <b>{e.R.label}</b>
            <Fx fx={e.R.fx} />
          </div>
        </div>
      </div>
      <div className="ev-buttons">
        <Btn onClick={() => decide('L')} data-autofocus>
          ← {e.L.label}
        </Btn>
        <Btn onClick={() => decide('R')}>{e.R.label} →</Btn>
      </div>
    </div>
  );
}
