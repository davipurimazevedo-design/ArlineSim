import type { ReactNode } from 'react';
import {
  actions,
  routeOfPlane,
  fmtInt,
  fmtDec,
  clientName,
  CONTRACT_GRACE,
  fmtMoney,
  maintCostFor,
  MODELS,
  type ModType,
  type Tone,
} from '../../engine';
import { useGame, useGameState } from '../../store/gameStore';
import { Btn } from '../components/Btn';
import { CashChart } from '../components/CashChart';
import { Empty } from '../components/Empty';
import { Money } from '../components/Money';
import { GoalsPanel } from './GoalsPanel';

const MOD_LABEL: Record<ModType, string> = {
  fuel: 'Combustível',
  demand: 'Demanda',
  salary: 'Salários',
  share: 'Atratividade',
  halt: 'Operações suspensas',
  wear: 'Desgaste',
  fare: 'Tarifas',
  cargo: 'Demanda de carga',
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
  const g = useGameState();
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
            Manutenção {fmtMoney(maintCostFor(g, p))}
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
  if (g.cargoOffer)
    alerts.push({
      k: 'offer',
      tone: 'info',
      text: `Proposta de contrato de carga: ${clientName(g.cargoOffer)}`,
      sub: `${fmtDec(g.cargoOffer.tons)} t/dia em ${g.cargoOffer.from}–${g.cargoOffer.to} · ${fmtMoney(g.cargoOffer.pay)}/dia`,
      btn: (
        <Btn small onClick={() => setTab('mercado')}>
          Ver
        </Btn>
      ),
    });
  for (const c of g.contracts)
    if (c.miss > 0)
      alerts.push({
        k: 'ct' + c.id,
        tone: 'bad',
        text: `Contrato com a ${clientName(c)} sem capacidade`,
        sub: `${c.miss} de ${CONTRACT_GRACE} dias · ${c.from}–${c.to}`,
      });
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
          {d && d.tons > 0 && <small>{fmtDec(d.tons)} t de carga</small>}
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
            <li className={g.routes.length ? 'done' : ''}>
              Em{' '}
              <button type="button" className="link" onClick={() => setTab('rotas')}>
                Rotas
              </button>
              , toque em Nova rota e escolha um destino até 1.500 km do hub
            </li>
            <li>
              Escolha a aeronave: da frota ou arrendada na hora. Os slots que faltam são comprados junto
            </li>
            <li>Ajuste tarifa, frequência e serviço de bordo no editor da rota</li>
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

      <GoalsPanel />

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
