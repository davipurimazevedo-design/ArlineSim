import { Fragment, useState } from 'react';
import {
  fmtInt,
  fmtMoney,
  fmtReais,
  hasCargoDivision,
  MODELS,
  overlapsOf,
  rivalShares,
  routeFreq,
  type Route,
  type RouteKind,
} from '../../../engine';
import { useGameState } from '../../../store/gameStore';
import { CellBar } from '../../components/Bar';
import { Btn } from '../../components/Btn';
import { Empty } from '../../components/Empty';
import { Money } from '../../components/Money';
import { Segmented } from '../../components/Segmented';
import { NewRoute } from './NewRoute';
import { RouteEditor } from './RouteEditor';

export function Rotas() {
  const g = useGameState();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | RouteKind>('all');
  const toggle = (id: string) => setOpen(open === id ? null : id);
  const showFilter = hasCargoDivision(g) || g.routes.some((r) => r.kind === 'cargo');
  const routes = g.routes.filter((r) => !showFilter || filter === 'all' || r.kind === filter);

  return (
    <section>
      <div className="section-head">
        <h1>Rotas</h1>
        {showFilter && (
          <Segmented
            label="Tipo de rota"
            value={filter}
            options={[
              ['all', 'Todas'],
              ['pax', 'Passageiros'],
              ['cargo', 'Carga'],
            ]}
            onChange={setFilter}
          />
        )}
        <Btn kind="primary" onClick={() => setAdding(!adding)} aria-expanded={adding}>
          {adding ? 'Cancelar' : 'Nova rota'}
        </Btn>
      </div>
      {adding && <NewRoute onDone={() => setAdding(false)} />}
      {g.routes.length === 0 && !adding && (
        <Empty>Nenhuma rota. Você precisa de uma aeronave e de slots em dois aeroportos.</Empty>
      )}
      {g.routes.length > 0 && routes.length === 0 && <Empty>Nenhuma rota deste tipo.</Empty>}
      {routes.length > 0 && (
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
              {routes.map((r, i) => {
                const assigned = r.planes.map((x) => g.fleet.find((p) => p.id === x.id)).filter((p) => !!p);
                const p = assigned[0];
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
                        <small>
                          {fmtInt(r.dist)} km{r.kind === 'cargo' ? ' · carga' : ''}
                        </small>
                        {overlapsOf(g, r).length > 0 && r.planes.length > 0 && (
                          <small className="neg">divide demanda</small>
                        )}
                      </td>
                      <td>
                        {p ? (
                          <>
                            <b>
                              {p.reg}
                              {assigned.length > 1 ? ` +${assigned.length - 1}` : ''}
                            </b>
                            <small>
                              {assigned.length > 1 ? `${assigned.length} aeronaves` : MODELS[p.model].name}
                            </small>
                          </>
                        ) : (
                          <small className="neg">sem aeronave</small>
                        )}
                      </td>
                      <td className="c num">{p ? routeFreq(r) + '×' : '—'}</td>
                      <td className="r num">
                        {r.kind === 'cargo' ? `${fmtReais(r.price)}/t` : fmtMoney(r.price)}
                      </td>
                      <td>
                        {L?.flying ? (
                          <CellBar v={L.lf * 100} tone="blue" label="Ocupação" />
                        ) : (
                          <small>{L ? L.reason : 'aguardando'}</small>
                        )}
                      </td>
                      <td>
                        {L?.flying ? (
                          <>
                            <CellBar v={L.share * 100} tone="teal" label="Market share" />
                            <TopRival r={r} share={L.share} />
                          </>
                        ) : (
                          '—'
                        )}
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

/** Maior concorrente da rota, abaixo da barra de share. */
function TopRival({ r, share }: { r: Route; share: number }) {
  const top = rivalShares(r, share).sort((a, b) => b.share - a.share)[0];
  if (!top) return null;
  return (
    <small>
      maior rival: {top.name} {Math.round(top.share * 100)}%
    </small>
  );
}
