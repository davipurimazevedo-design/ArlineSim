import { useGame } from '../../store/gameStore';

export function Footer() {
  const ask = useGame((s) => s.ask);
  const reset = useGame((s) => s.reset);
  return (
    <footer className="foot">
      <button
        type="button"
        className="linkish"
        onClick={() => ask({ text: 'Apagar o save e começar do zero?', okLabel: 'Apagar e recomeçar', danger: true, onOk: reset })}
      >
        Recomeçar
      </button>
    </footer>
  );
}
