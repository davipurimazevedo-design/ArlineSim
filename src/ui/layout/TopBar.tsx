import { useSyncExternalStore } from 'react';
import { BUSINESS_MODELS, fmtDate, fmtMoney, type Speed } from '../../engine';
import { useGame, useGameState } from '../../store/gameStore';
import { Bar } from '../components/Bar';
import { Icon } from '../components/Icon';
import { Money } from '../components/Money';

const SPEEDS: Speed[] = [0, 1, 2, 4];

function subscribeScheme(cb: () => void) {
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
const systemDark = () => matchMedia('(prefers-color-scheme: dark)').matches;

export function TopBar() {
  const g = useGameState();
  const setSpeed = useGame((s) => s.setSpeed);
  const theme = useGame((s) => s.theme);
  const setTheme = useGame((s) => s.setTheme);
  const setMenu = useGame((s) => s.setMenu);
  const sysDark = useSyncExternalStore(subscribeScheme, systemDark);
  const dark = (theme ?? (sysDark ? 'dark' : 'light')) === 'dark';
  const d = g.lastDay;

  return (
    <header className="top">
      <div className="brand">
        <span className="tail" aria-hidden="true">
          <Icon n="plane" size={20} />
        </span>
        <div>
          <strong>{g.name}</strong>
          <small>
            {fmtDate(g.day)} · dia {g.day}
            {g.businessModel !== 'tradicional' ? ` · ${BUSINESS_MODELS[g.businessModel].name}` : ''}
          </small>
        </div>
      </div>
      <div className="stats">
        <div className="stat">
          <small>Caixa</small>
          <b className={g.cash < 0 ? 'neg' : ''}>{fmtMoney(g.cash)}</b>
        </div>
        <div className="stat">
          <small>Hoje</small>
          <b>{d ? <Money v={d.profit} signed /> : '—'}</b>
        </div>
        <div className="stat rep">
          <small>Reputação {Math.round(g.reputation)}</small>
          <Bar v={g.reputation} tone={g.reputation < 35 ? 'bad' : 'teal'} label="Reputação" />
        </div>
        <div className="stat hide-s">
          <small>QAV</small>
          <b className={g.fuelIdx > 1.1 ? 'neg' : ''}>{(g.fuelIdx * 100).toFixed(0)}</b>
        </div>
        {g.license >= 2 && (
          <div className="stat hide-s" title="Câmbio do dólar (100 = normal)">
            <small>US$</small>
            <b className={g.fxIdx > 1.1 ? 'neg' : ''}>{(g.fxIdx * 100).toFixed(0)}</b>
          </div>
        )}
      </div>
      <div className="speed" role="group" aria-label="Velocidade" data-tut-target="velocidade">
        {SPEEDS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={g.speed === v}
            onClick={() => setSpeed(v)}
            aria-label={v ? `${v} ${v > 1 ? 'dias' : 'dia'} por segundo` : 'Pausar'}
          >
            {v === 0 ? '❚❚' : v + '×'}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTheme(dark ? 'light' : 'dark')}
          aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}
        >
          <Icon n={dark ? 'sun' : 'moon'} size={15} />
        </button>
        <button type="button" onClick={() => setMenu(true)} aria-label="Menu do jogo" title="Jogo">
          <Icon n="gear" size={15} />
        </button>
      </div>
    </header>
  );
}
