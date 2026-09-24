import { useGame } from '../../store/gameStore';
import { Btn } from '../components/Btn';
import { useDialog } from '../components/useDialog';

export function ResultCard() {
  const result = useGame((s) => s.result);
  if (result === null) return null;
  return <Card text={result} />;
}

function Card({ text }: { text: string }) {
  const close = useGame((s) => s.closeResult);
  const ref = useDialog<HTMLDivElement>(close);
  return (
    <div className="overlay">
      <div ref={ref} className="ticket result" role="dialog" aria-modal="true" aria-label="Desfecho do evento">
        <p>{text}</p>
        <Btn kind="primary" onClick={close}>
          Continuar
        </Btn>
      </div>
    </div>
  );
}
