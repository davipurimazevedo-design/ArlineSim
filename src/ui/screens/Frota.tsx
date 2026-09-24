import {
  actions,
  buyoutCost,
  routeOfPlane,
  fmtMoney,
  maintCost,
  maintDays,
  MODELS,
  planeValue,
} from '../../engine';
import { useGame } from '../../store/gameStore';
import { CellBar } from '../components/Bar';
import { Btn } from '../components/Btn';
import { Empty } from '../components/Empty';
import { Icon } from '../components/Icon';
import { Pill } from '../components/Pill';

export function Frota() {
  const g = useGame((s) => s.game!);
  const act = useGame((s) => s.act);
  const ask = useGame((s) => s.ask);
  const setTab = useGame((s) => s.setTab);

  if (!g.fleet.length)
    return (
      <section>
        <div className="section-head">
          <h1>Frota</h1>
        </div>
        <Empty>
          Hangar vazio.{' '}
          <button type="button" className="link" onClick={() => setTab('mercado')}>
            Arrende sua primeira aeronave
          </button>
          .
        </Empty>
      </section>
    );

  const owned = g.fleet.filter((p) => p.owned).length;
  return (
    <section>
      <div className="section-head">
        <h1>Frota</h1>
        <small>
          {g.fleet.length} aeronave{g.fleet.length > 1 ? 's' : ''} · {owned} própria{owned === 1 ? '' : 's'}
        </small>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Matrícula</th>
              <th>Status</th>
              <th>Condição</th>
              <th className="r">Contrato</th>
              <th className="r">Ações</th>
            </tr>
          </thead>
          <tbody>
            {g.fleet.map((p, i) => {
              const m = MODELS[p.model];
              const r = routeOfPlane(g, p.id);
              const st = p.maint > 0 ? 'mid' : p.condition < 40 ? 'bad' : !r ? 'bad' : 'good';
              const buyout = buyoutCost(p);
              const value = planeValue(p);
              return (
                <tr key={p.id} className={`row s-${st}${i % 2 ? ' zebra' : ''}`}>
                  <td>
                    <b>{p.reg}</b>
                    <small>
                      {m.name} · {m.y + m.j} assentos
                    </small>
                  </td>
                  <td>
                    {p.maint > 0 ? (
                      <Pill tone="warn">
                        <Icon n="wrench" size={13} /> {p.maint} dias
                      </Pill>
                    ) : r ? (
                      <Pill tone="ok">
                        {r.from}–{r.to}
                      </Pill>
                    ) : (
                      <Pill tone="bad">Parado</Pill>
                    )}
                  </td>
                  <td>
                    <CellBar v={p.condition} label="Condição" />
                  </td>
                  <td className="r">
                    {p.owned ? (
                      <>
                        <b>Própria</b>
                        <small>vale {fmtMoney(value)}</small>
                      </>
                    ) : (
                      <>
                        <b className="num">{fmtMoney(m.lease)}/dia</b>
                        <small>leasing</small>
                      </>
                    )}
                  </td>
                  <td className="r actions">
                    <Btn
                      small
                      kind={p.condition < 40 ? 'warn' : ''}
                      disabled={p.maint > 0 || p.condition > 97}
                      onClick={() => act((s) => actions.maintain(s, p.id))}
                      title={`${maintDays(p)} dias fora de operação`}
                    >
                      Manutenção {fmtMoney(maintCost(p))}
                    </Btn>
                    {!p.owned && (
                      <Btn
                        small
                        disabled={g.cash < buyout}
                        onClick={() => act((s) => actions.buyOut(s, p.id))}
                      >
                        Comprar {fmtMoney(buyout)}
                      </Btn>
                    )}
                    <Btn
                      small
                      kind="ghost danger"
                      onClick={() =>
                        ask({
                          text: p.owned
                            ? `Vender ${p.reg} por ${fmtMoney(value)}?`
                            : `Devolver ${p.reg} ao arrendador? O depósito não é reembolsado.`,
                          okLabel: p.owned ? 'Vender' : 'Devolver',
                          danger: true,
                          onOk: () => act((s) => actions.release(s, p.id)),
                        })
                      }
                    >
                      {p.owned ? 'Vender' : 'Devolver'}
                    </Btn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
