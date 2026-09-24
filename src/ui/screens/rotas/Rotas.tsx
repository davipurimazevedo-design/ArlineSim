import { Fragment, useState } from 'react';
import { fmtInt, fmtMoney, MODELS } from '../../../engine';
import { useGame } from '../../../store/gameStore';
import { CellBar } from '../../components/Bar';
import { Btn } from '../../components/Btn';
import { Empty } from '../../components/Empty';
import { Money } from '../../components/Money';
import { NewRoute } from './NewRoute';
import { RouteEditor } from './RouteEditor';

export function Rotas() {
  const g = useGame((s) => s.game!);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const toggle = (id: string) => setOpen(open === id ? null : id);

  return (
    <section>
      <div className="section-head">
        <h1>Rotas</h1>
        <Btn kind="primary" onClick={() => setAdding(!adding)} aria-expanded={adding}>
          {adding ? 'Cancelar' : 'Nova rota'}
        </Btn>
      </div>
      {adding && <NewRoute onDone={() => setAdding(false)} />}
      {g.routes.length === 0 && !adding && (
        <Empty>Nenhuma rota. Você precisa de uma aeronave e de slots em dois aeroportos.</Empty>
      )}
      {g.routes.length > 0 && (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Rota</th>
                <th>Aeronave</th>
                <th className="c">Freq.</th>
                <th className="r">Tarifa</th>
                <th>Ocupação</th>
                <th>Market share</th>
                <th className="r">Resultado/dia</th>
              </tr>
            </thead>
            <tbody>
              {g.routes.map((r, i) => {
                const p = g.fleet.find((x) => x.id === r.planeId);
                const L = r.last;
                const st = !p ? 'bad' : L && !L.flying ? 'mid' : L && L.profit < 0 ? 'bad' : 'good';
                const isOpen = open === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr
                      className={`row s-${st}${i % 2 ? ' zebra' : ''}${isOpen ? ' open' : ''}`}
                      onClick={() => toggle(r.id)}
                      tabIndex={0}
                      aria-expanded={isOpen}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggle(r.id);
                        }
                      }}
                    >
                      <td>
                        <b className="route">
                          {r.from}
                          <span>→</span>
                          {r.to}
                        </b>
                        <small>{fmtInt(r.dist)} km</small>
                      </td>
                      <td>
                        {p ? (
                          <>
                            <b>{p.reg}</b>
                            <small>{MODELS[p.model].name}</small>
                          </>
                        ) : (
                          <small className="neg">sem aeronave</small>
                        )}
                      </td>
                      <td className="c num">{p ? r.freq + '×' : '—'}</td>
                      <td className="r num">{fmtMoney(r.price)}</td>
                      <td>
                        {L?.flying ? (
                          <CellBar v={L.lf * 100} tone="blue" label="Ocupação" />
                        ) : (
                          <small>{L ? L.reason : 'aguardando'}</small>
                        )}
                      </td>
                      <td>
                        {L?.flying ? <CellBar v={L.share * 100} tone="teal" label="Market share" /> : '—'}
                      </td>
                      <td className="r">{L ? <Money v={L.profit} signed /> : '—'}</td>
                    </tr>
                    {isOpen && (
                      <tr className="editor-row">
                        <td colSpan={7}>
                          <RouteEditor r={r} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
