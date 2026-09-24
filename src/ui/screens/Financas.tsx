import { actions, creditLimit, dailyInterest, fmtMoney, LOAN_STEP } from '../../engine';
import { useGame } from '../../store/gameStore';
import { Bar } from '../components/Bar';
import { Btn } from '../components/Btn';
import { DayBars } from '../components/DayBars';
import { Empty } from '../components/Empty';
import { Money } from '../components/Money';

export function Financas() {
  const g = useGame((s) => s.game!);
  const act = useGame((s) => s.act);
  const d = g.lastDay;
  const lim = creditLimit(g);

  const items: [string, number][] = d
    ? (
        [
          ['Combustível', d.fuel],
          ['Tripulação', d.crew],
          ['Leasing', d.lease],
          ['Taxas aeroportuárias', d.fees],
          ['Serviço de bordo', d.svc],
          ['Slots', d.slots],
          ['Estrutura', d.overhead],
          ['Juros', d.interest],
          ['Manutenção corretiva', d.maint],
        ] as [string, number][]
      ).filter((x) => x[1] > 0)
    : [];
  const maxV = Math.max(d ? d.rev : 1, ...items.map((x) => x[1]), 1);

  return (
    <section className="grid-dash">
      <div className="panel">
        <h2>Ontem</h2>
        {d ? (
          <ul className="breakdown">
            <li>
              <span>Receita de passagens</span>
              <Bar v={(d.rev / maxV) * 100} tone="teal" label="Receita" />
              <b className="num">{fmtMoney(d.rev)}</b>
            </li>
            {items.map(([l, v]) => (
              <li key={l}>
                <span>{l}</span>
                <Bar v={(v / maxV) * 100} tone="bad" label={l} />
                <b className="num">{fmtMoney(v)}</b>
              </li>
            ))}
            <li className="total">
              <span>Resultado</span>
              <i />
              <Money v={d.profit} signed />
            </li>
          </ul>
        ) : (
          <Empty>Nada a mostrar antes do primeiro dia.</Empty>
        )}
      </div>
      <div className="panel">
        <h2>Resultado diário · 60 dias</h2>
        <DayBars data={g.history.slice(-60)} />
      </div>
      <div className="panel span2">
        <h2>Crédito</h2>
        <div className="credit">
          <div>
            <small>Dívida</small>
            <b className="num">{fmtMoney(g.debt)}</b>
          </div>
          <div>
            <small>Limite</small>
            <b className="num">{fmtMoney(lim)}</b>
          </div>
          <div>
            <small>Juros/dia</small>
            <b className="num">{fmtMoney(dailyInterest(g.debt))}</b>
          </div>
          <div className="credit-actions">
            <Btn disabled={g.debt + LOAN_STEP > lim} onClick={() => act((s) => actions.borrow(s, LOAN_STEP))}>
              Tomar R$ 5 mi
            </Btn>
            <Btn
              disabled={g.debt <= 0 || g.cash < Math.min(LOAN_STEP, g.debt)}
              onClick={() => act((s) => actions.repay(s, LOAN_STEP))}
            >
              Quitar R$ 5 mi
            </Btn>
          </div>
        </div>
        <p className="note">
          O limite cresce com o valor da frota própria. Com o caixa abaixo de −R$ 15 mi, os credores assumem a
          companhia.
        </p>
      </div>
    </section>
  );
}
