import { useGame } from '../../store/gameStore';

export function Toast() {
  const t = useGame((s) => s.toast);
  if (!t) return null;
  return (
    <div key={t.id} className={'toast t-' + t.tone} role="status">
      {t.text}
    </div>
  );
}
