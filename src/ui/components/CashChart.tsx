import { fmtMoney, type HistoryEntry } from '../../engine';
import { Empty } from './Empty';

export function CashChart({ data }: { data: HistoryEntry[] }) {
  if (data.length < 2) return <Empty>O gráfico aparece depois do primeiro dia de operação.</Empty>;
  const W = 600;
  const H = 140;
  const vals = data.map((h) => h.cash);
  const mn = Math.min(0, ...vals);
  const mx = Math.max(...vals, 1);
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => H - ((v - mn) / (mx - mn || 1)) * (H - 10) - 5;
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const first = vals[0]!;
  const lastV = vals[vals.length - 1]!;
  const dir = lastV >= first ? 'up' : 'down';
  return (
    <>
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Evolução do caixa: de ${fmtMoney(first)} para ${fmtMoney(lastV)}`}
      >
        {mn < 0 && <line x1="0" x2={W} y1={y(0)} y2={y(0)} className="zero" />}
        <polyline points={`0,${H} ${pts} ${W},${H}`} className={'area ' + dir} />
        <polyline points={pts} className={'line ' + dir} />
      </svg>
      <div className="chart-legend">
        <span>{fmtMoney(first)}</span>
        <span>{fmtMoney(lastV)}</span>
      </div>
    </>
  );
}
