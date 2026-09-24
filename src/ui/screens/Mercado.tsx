import { useState } from 'react';
import {
  actions,
  AIRPORT_CODES,
  AIRPORTS,
  dist,
  fmtInt,
  fmtMoney,
  leaseDeposit,
  LICENSES,
  MAX_RANGE,
  MODEL_KEYS,
  MODELS,
  slotCost,
  slotFee,
} from '../../engine';
import { useGame } from '../../store/gameStore';
import { Bar, CellBar } from '../components/Bar';
import { Btn } from '../components/Btn';
import { Pill } from '../components/Pill';
import { Segmented } from '../components/Segmented';

type Sub = 'avioes' | 'slots' | 'licencas';
const SUBS = [
  ['avioes', 'Aeronaves'],
  ['slots', 'Slots'],
  ['licencas', 'Licenças'],
] as const;

export function Mercado() {
  const [sub, setSub] = useState<Sub>('avioes');
  return (
    <section>
      <div className="section-head">
        <h1>Mercado</h1>
        <Segmented label="Categoria" value={sub} options={SUBS} onChange={setSub} />
      </div>
      {sub === 'avioes' ? <Aeronaves /> : sub === 'slots' ? <Slots /> : <Licencas />}
    </section>
  );
}

function Aeronaves() {
  const g = useGame((s) => s.game!);
  const act = useGame((s) => s.act);
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Modelo</th>
            <th className="c">Assentos</th>
            <th>Alcance</th>
            <th className="r">Leasing</th>
            <th className="r">Compra</th>
            <th className="r">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {MODEL_KEYS.map((k, i) => {
            const m = MODELS[k];
            const locked = m.tier > g.license;
            const dep = leaseDeposit(k);
            return (
              <tr key={k} className={`row ${locked ? 'locked' : 's-good'}${i % 2 ? ' zebra' : ''}`}>
                <td>
                  <b>{m.name}</b>
                  <small>
                    {m.kind}
                    {locked ? ` · requer licença ${LICENSES[m.tier].name}` : ''}
                  </small>
                </td>
                <td className="c num">{m.j ? `${m.j}J + ${m.y}Y` : m.y}</td>
                <td>
                  <CellBar
                    v={(m.range / MAX_RANGE) * 100}
                    tone="blue"
                    label="Alcance"
                    text={`${fmtInt(m.range)} km`}
                  />
                </td>
                <td className="r">
                  <b className="num">{fmtMoney(m.lease)}/dia</b>
                  <small>depósito {fmtMoney(dep)}</small>
                </td>
                <td className="r num">{fmtMoney(m.price)}</td>
                <td className="r actions">
                  <Btn
                    small
                    kind="primary"
                    disabled={locked || g.cash < dep}
                    onClick={() => act((s) => actions.lease(s, k))}
                  >
                    Arrendar
                  </Btn>
                  <Btn
                    small
                    disabled={locked || g.cash < m.price}
                    onClick={() => act((s) => actions.buy(s, k))}
                  >
                    Comprar
                  </Btn>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Slots() {
  const g = useGame((s) => s.game!);
  const act = useGame((s) => s.act);
  const own = (c: string) => g.slots.includes(c as never);
  // seus primeiro, domésticos antes, depois por distância do hub
  const list = [...AIRPORT_CODES].sort(
    (a, b) =>
      Number(own(b)) - Number(own(a)) ||
      Number(AIRPORTS[a].intl) - Number(AIRPORTS[b].intl) ||
      dist(g.hub, a) - dist(g.hub, b),
  );
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Aeroporto</th>
            <th>Porte</th>
            <th className="r">Do hub</th>
            <th className="r">Taxa/dia</th>
            <th className="r">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((c, i) => {
            const a = AIRPORTS[c];
            const mine = own(c);
            const locked = a.intl && g.license < 2;
            const cost = slotCost(c);
            return (
              <tr
                key={c}
                className={`row ${mine ? 's-good' : locked ? 'locked' : ''}${i % 2 ? ' zebra' : ''}`}
              >
                <td>
                  <b>{c}</b>
                  <small>
                    {a.city}
                    {a.intl ? ' · internacional' : ''}
                  </small>
                </td>
                <td>
                  <CellBar v={a.size * 10} tone="blue" label="Porte" text={String(a.size)} />
                </td>
                <td className="r num">{c === g.hub ? 'hub' : fmtInt(dist(g.hub, c)) + ' km'}</td>
                <td className="r num">{fmtMoney(slotFee(c))}</td>
                <td className="r">
                  {mine ? (
                    <Pill tone="ok">Seu</Pill>
                  ) : (
                    <Btn
                      small
                      kind="primary"
                      disabled={locked || g.cash < cost}
                      onClick={() => act((s) => actions.buySlot(s, c))}
                    >
                      {locked ? 'Licença int.' : 'Comprar ' + fmtMoney(cost)}
                    </Btn>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Licencas() {
  const g = useGame((s) => s.game!);
  const act = useGame((s) => s.act);
  return (
    <ol className="licenses">
      {LICENSES.map((L) => {
        const has = g.license >= L.tier;
        const next = L.tier === g.license + 1;
        return (
          <li key={L.tier} className={has ? 'has' : next ? 'next' : ''}>
            <div>
              <b>{L.name}</b>
              <small>{L.desc}</small>
            </div>
            {has ? (
              <Pill tone="ok">Ativa</Pill>
            ) : next ? (
              <div className="lic-buy">
                <Bar
                  v={(Math.max(0, g.cash) / L.cost) * 100}
                  tone="teal"
                  label={`Caixa até ${fmtMoney(L.cost)}`}
                />
                <Btn
                  kind="primary"
                  small
                  disabled={g.cash < L.cost}
                  onClick={() => act((s) => actions.buyLicense(s, L.tier))}
                >
                  Obter {fmtMoney(L.cost)}
                </Btn>
              </div>
            ) : (
              <small>{fmtMoney(L.cost)}</small>
            )}
          </li>
        );
      })}
    </ol>
  );
}
