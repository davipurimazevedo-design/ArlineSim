import { fmtDec, type OfflineSummary as Summary } from '../../engine';
import { useGame } from '../../store/gameStore';
import { Btn } from '../components/Btn';
import { Money } from '../components/Money';
import { useDialog } from '../components/useDialog';

export function OfflineSummary() {
  const o = useGame((s) => s.offline);
  if (!o) return null;
  return <Card o={o} />;
}

function Card({ o }: { o: Summary }) {
  const close = useGame((s) => s.closeOffline);
  const ref = useDialog<HTMLDivElement>(close);
  const h = Math.floor(o.away / 3600);
  const mi = Math.floor((o.away % 3600) / 60);
  return (
    <div className="overlay">
      <div ref={ref} className="ticket result" role="dialog" aria-modal="true" aria-labelledby="off-title">
        <small>
          Enquanto você esteve fora ({h ? h + ' h ' : ''}
          {mi} min)
        </small>
        <h3 id="off-title">
          {o.days} dia{o.days > 1 ? 's' : ''} de operação
        </h3>
        <div className="facts">
          <div>
            <small>Resultado</small>
            <Money v={o.profit} signed />
          </div>
          <div>
            <small>Reputação</small>
            <b className={'num ' + (o.rep >= 0 ? 'pos' : 'neg')}>
              {o.rep >= 0 ? '+' : ''}
              {fmtDec(o.rep)}
            </b>
          </div>
        </div>
        <p className="note">
          Fora do jogo, cada minuto real vale um dia, até 60 dias. Eventos não acontecem nesse período.
        </p>
        <Btn kind="primary" onClick={close}>
          Voltar ao comando
        </Btn>
      </div>
    </div>
  );
}
