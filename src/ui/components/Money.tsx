import { fmtMoney } from '../../engine';

interface Props {
  v: number;
  /** colore e mostra "+" nos positivos */
  signed?: boolean;
}

export function Money({ v, signed }: Props) {
  const cls = signed ? (v >= 0 ? ' pos' : ' neg') : '';
  return (
    <span className={'num' + cls}>
      {signed && v > 0 ? '+' : ''}
      {fmtMoney(v)}
    </span>
  );
}
