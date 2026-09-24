import {
  actions,
  buyoutCost,
  routeOfPlane,
  fmtDec,
  fmtMoney,
  maintCostFor,
  maintDaysFor,
  MODELS,
  planeValue,
  seatsOf,
  rules,
  CABINS,
  CABIN_CHANGE_COST,
  CABIN_CHANGE_DAYS,
  cabinLabel,
  type Plane,
} from '../../engine';
import { useGame, useGameState } from '../../store/gameStore';
import { CellBar } from '../components/Bar';
import { Btn } from '../components/Btn';
import { Empty } from '../components/Empty';
import { Icon } from '../components/Icon';
import { Pill } from '../components/Pill';

export function Frota() {
  const g = useGameState();
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
              <th>Cabine</th>
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
                      {m.name} · {seatsOf(p, rules(g).seatFactor).y + seatsOf(p).j} assentos
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
                  <td>
                    <CabinCell p={p} />
                  </td>
                  <td className="r">
                    {p.loan ? (
                      <>
                        <b className="num">{fmtMoney(p.loan.payment)}/dia</b>
                        <small>
                          financiada · saldo {fmtMoney(p.loan.balance)} · {fmtDec(p.loan.left / 365)} anos
                        </small>
                      </>
                    ) : p.owned ? (
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
                      title={`${maintDaysFor(g, p)} dias fora de operação`}
                    >
                      Manutenção {fmtMoney(maintCostFor(g, p))}
                    </Btn>
                    {p.loan && (
                      <Btn
                        small
                        disabled={g.cash < p.loan.balance}
                        onClick={() => act((s) => actions.payoffLoan(s, p.id))}
                      >
                        Quitar {fmtMoney(p.loan.balance)}
                      </Btn>
                    )}
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
                          text: p.loan
                            ? `Vender ${p.reg} por ${fmtMoney(value)}? O saldo de ${fmtMoney(p.loan.balance)} do financiamento é quitado com a venda (${value >= p.loan.balance ? `sobram ${fmtMoney(value - p.loan.balance)}` : `faltam ${fmtMoney(p.loan.balance - value)} do caixa`}).`
                            : p.owned
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

/** Layout da cabine; nos narrowbodies, com licença internacional, vira um seletor. */
function CabinCell({ p }: { p: Plane }) {
  const g = useGameState();
  const license = g.license;
  const act = useGame((s) => s.act);
  const ask = useGame((s) => s.ask);
  const layouts = CABINS[p.model];
  const label = cabinLabel(seatsOf(p));
  if (!layouts || license < 2) return <span className="num">{label}</span>;
  return (
    <select
      className="cabin-select"
      aria-label={`Cabine do ${p.reg}`}
      value={p.cabin}
      disabled={p.maint > 0}
      onChange={(e) => {
        const idx = +e.target.value;
        ask({
          text: `Reconfigurar ${p.reg} para ${cabinLabel(layouts[idx]!)}? Custa ${fmtMoney(CABIN_CHANGE_COST)} e deixa o avião ${CABIN_CHANGE_DAYS} dias parado.`,
          okLabel: 'Reconfigurar',
          onOk: () => act((s) => actions.setCabin(s, p.id, idx)),
        });
      }}
    >
      {layouts.map((c, i) => (
        <option key={i} value={i} disabled={c.j > 0 && !rules(g).allowJ}>
          {cabinLabel(c)}
        </option>
      ))}
    </select>
  );
}
