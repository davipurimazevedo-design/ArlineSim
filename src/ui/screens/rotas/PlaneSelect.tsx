import { maxFreq, MODELS } from '../../../engine';
import { useGame } from '../../../store/gameStore';

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
  /** distância da rota; aeronaves sem alcance ficam desabilitadas */
  dist: number;
  id?: string;
}

export function PlaneSelect({ value, onChange, dist, id }: Props) {
  const fleet = useGame((s) => s.game!.fleet);
  const routes = useGame((s) => s.game!.routes);
  return (
    <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">Sem aeronave</option>
      {fleet.map((p) => {
        const m = MODELS[p.model];
        const used = routes.find((r) => r.planeId === p.id);
        const ok = !dist || (dist <= m.range && maxFreq(m, dist) > 0);
        return (
          <option key={p.id} value={p.id} disabled={!ok}>
            {p.reg} · {m.name}
            {used && p.id !== value ? ` (em ${used.from}–${used.to})` : ''}
            {ok ? '' : ' — sem alcance'}
          </option>
        );
      })}
    </select>
  );
}
