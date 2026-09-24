import { useGame } from '../../store/gameStore';
import type { ConfirmRequest } from '../../store/gameStore';
import { Btn } from './Btn';
import { useDialog } from './useDialog';

export function ConfirmDialog() {
  const req = useGame((s) => s.confirm);
  if (!req) return null;
  return <ConfirmCard req={req} />;
}

function ConfirmCard({ req }: { req: ConfirmRequest }) {
  const close = useGame((s) => s.closeConfirm);
  const ref = useDialog<HTMLDivElement>(close);
  return (
    <div className="overlay top">
      <div
        ref={ref}
        className="ticket result"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-text"
      >
        <p id="confirm-text">{req.text}</p>
        <div className="row-btns">
          <Btn
            kind={req.danger ? 'warn' : 'primary'}
            onClick={() => {
              close();
              req.onOk();
            }}
          >
            {req.okLabel}
          </Btn>
          <Btn data-autofocus onClick={close}>
            Cancelar
          </Btn>
        </div>
      </div>
    </div>
  );
}
