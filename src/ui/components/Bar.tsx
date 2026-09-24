export type BarTone = 'good' | 'mid' | 'bad' | 'teal' | 'blue';

interface Props {
  /** 0–100 */
  v: number;
  /** sem tom: condição (teal ≥ 60, cinza 40–59, laranja < 40) */
  tone?: BarTone;
  label: string;
}

export function Bar({ v, tone, label }: Props) {
  const t = tone ?? (v >= 60 ? 'good' : v >= 40 ? 'mid' : 'bad');
  const w = Math.max(0, Math.min(100, v));
  return (
    <div
      className="bar"
      role="meter"
      aria-valuenow={Math.round(w)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <i className={'bar-' + t} style={{ width: w + '%' }} />
    </div>
  );
}

/** Barra com o percentual ao lado, usada nas tabelas. */
export function CellBar({ v, tone, label, text }: Props & { text?: string }) {
  return (
    <div className="cell-bar">
      <Bar v={v} tone={tone} label={label} />
      <span className="num">{text ?? Math.round(v) + '%'}</span>
    </div>
  );
}
