import { fmtMoney, type HistoryEntry } from '../../engine';
import { Empty } from './Empty';

/** Resultado diário: positivos acima da linha, negativos abaixo. */
export function DayBars({ data }: { data: HistoryEntry[] }) {
  if (data.length < 2) return <Empty>Aguardando dados.</Empty>;
  const hm = Math.max(1, ...data.map((h) => Math.abs(h.profit)));
  return (
    <div className="bars" role="img" aria-label={`Resultado diário dos últimos ${data.length} dias`}>
      {data.map((h) => (
        <span key={h.day} className="col" title={`Dia ${h.day}: ${fmtMoney(h.profit)}`}>
          <i className={h.profit >= 0 ? 'up' : 'down'} style={{ height: Math.max(1, (Math.abs(h.profit) / hm) * 50) + '%' }} />
        </span>
      ))}
    </div>
  );
}
