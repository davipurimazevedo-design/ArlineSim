import type { ReactNode } from 'react';
import {
  actions,
  routeOfPlane,
  fmtInt,
  fmtMoney,
  maintCost,
  MODELS,
  type ModType,
  type Tone,
} from '../../engine';
import { useGame } from '../../store/gameStore';
import { Btn } from '../components/Btn';
import { CashChart } from '../components/CashChart';
import { Empty } from '../components/Empty';
import { Money } from '../components/Money';

const MOD_LABEL: Record<ModType, string> = {
  fuel: 'Combustível',
  demand: 'Demanda',
  salary: 'Salários',
  share: 'Atratividade',
  halt: 'Operações suspensas',
  wear: 'Desgaste',
};

const TONE_DOT: Record<Tone, string> = {
  good: 'teal',
  bad: 'alert',
  warn: 'alert',
  info: 'muted',
  event: 'blue',
};

interface Alert {
  k: string;
  tone: 'good' | 'bad' | 'info';
  text: string;
  sub: string;
  btn?: ReactNode;
}

const MAX_ALERTS = 8;

export function Painel() {
  const g = useGame((s) => s.game!);
  const act = useGame((s) => s.act);
  const setTab = useGame((s) => s.setTab);
  const d = g.lastDay;

  const alerts: Alert[] = [];
  g.mods.forEach((m, i) => {
    // custo (combustível, salários) acima de 1 é ruim; demais, abaixo de 1 é ruim
    const costly = m.type === 'fuel' || m.type === 'salary' || m.type === 'wear';
    const bad = m.type === 'halt' || (costly ? m.value > 1 : m.value < 1);
    alerts.push({
      k: 'm' + i,
      tone: bad ? 'bad' : 'good',
      text:
        m.type === 'halt'
          ? 'Operações suspensas'
          : `${MOD_LABEL[m.type]} ${m.value > 1 ? '+' : ''}${Math.round((m.value - 1) * 100)}%`,
      sub: `${m.until - g.day} dias`,
    });
  });
  for (const p of g.fleet) {
    if (p.maint > 0)
      alerts.push({ k: 'mt' + p.id, tone: 'info', text: `${p.reg} em manutenção`, sub: `${p.maint} dias` });
    else if (p.condition < 40)
      alerts.push({
        k: 'c' + p.id,
        tone: 'bad',
        text: `${p.reg} com ${Math.round(p.condition)}% de condição`,
        sub: 'risco de pane',
        btn: (
          <Btn small kind="warn" onClick={() => act((s) => actions.maintain(s, p.id))}>
            Manutenção {fmtMoney(maintCost(p))}
          </Btn>
        ),
      });
    else if (!routeOfPlane(g, p.id))
      alerts.push({
        k: 'i' + p.id,
        tone: 'bad',
        text: `${p.reg} parado sem rota`,
        sub: p.owned ? 'avião ocioso' : `leasing de ${fmtMoney(MODELS[p.model].lease)}/dia sem voar`,
        btn: (
          <Btn small onClick={() => setTab('rotas')}>
            Escalar
          </Btn>
        ),
      });
  }
  for (const r of g.routes) {
    if (!r.planes.length)
      alerts.push({
        k: 'r' + r.id,
        tone: 'bad',
        text: `${r.from}–${r.to} sem aeronave`,
        sub: 'rota não opera',
      });
    else if (r.last?.flying && r.last.profit < 0)
      alerts.push({
        k: 'l' + r.id,
        tone: 'bad',
        text: `${r.from}–${r.to} no prejuízo`,
        sub: fmtMoney(r.last.profit) + '/dia',
      });
  }

  return (
    <section className="grid-dash">
      <div className="panel kpis">
        <div>
          <small>Resultado do dia</small>
          <b>{d ? <Money v={d.profit} signed /> : '—'}</b>
        </div>
        <div>
          <small>Passageiros/dia</small>
          <b className="num">{d ? fmtInt(d.pax) : 0}</b>
        </div>
        <div>
          <small>Frota</small>
          <b className="num">{g.fleet.length}</b>
        </div>
        <div>
          <small>Rotas</small>
          <b className="num">{g.routes.length}</b>
        </div>
      </div>

      {g.routes.length === 0 && (
        <div className="panel start">
          <h2>Primeiro voo</h2>
          <ol>
            <li className={g.fleet.length ? 'done' : ''}>
              Arrende um ATR 72 no{' '}
              <button type="button" className="link" onClick={() => setTab('mercado')}>
                Mercado
              </button>
            </li>
            <li className={g.slots.length > 1 ? 'done' : ''}>
              Compre slots em outra cidade até 1.500 km do hub
            </li>
            <li>
              Abra a rota em{' '}
              <button type="button" className="link" onClick={() => setTab('rotas')}>
                Rotas
              </button>{' '}
              e ajuste tarifa e frequência
            </li>
          </ol>
        </div>
      )}

      <div className="panel">
        <h2>Caixa · últimos {g.history.length} dias</h2>
        <CashChart data={g.history} />
      </div>

      <div className="panel">
        <h2>Atenção</h2>
        {alerts.length ? (
          <ul className="alerts">
            {alerts.slice(0, MAX_ALERTS).map((a) => (
              <li key={a.k} className={'t-' + a.tone}>
                <i />
                <div>
                  <b>{a.text}</b>
                  <small>{a.sub}</small>
                </div>
                {a.btn}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Tudo em ordem. Nenhum avião parado, nenhuma rota no vermelho.</Empty>
        )}
      </div>

      <div className="panel span2">
        <h2>Diário de bordo</h2>
        <ul className="log">
          {g.log.slice(0, 10).map((l, i) => (
            <li key={i}>
              <span className={'dot ' + TONE_DOT[l.tone]} />
              <time>{l.day}</time>
              <span>{l.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
