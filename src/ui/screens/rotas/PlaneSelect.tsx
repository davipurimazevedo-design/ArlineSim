import { maxFreqFor, MODELS, routeOfPlane } from '../../../engine';
import { useGameState } from '../../../store/gameStore';

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
  /** distância da rota; aeronaves sem alcance ficam desabilitadas */
  dist: number;
  /** aeronaves que não aparecem na lista (já escaladas nesta rota) */
  exclude?: string[];
  /** texto da opção vazia */
  emptyLabel?: string;
  id?: string;
}

export function PlaneSelect({ value, onChange, dist, exclude = [], emptyLabel = 'Sem aeronave', id }: Props) {
  const g = useGameState();
  return (
    <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{emptyLabel}</option>
      {g.fleet
        .filter((p) => !exclude.includes(p.id))
        .map((p) => {
          const m = MODELS[p.model];
          const used = routeOfPlane(g, p.id);
          const ok = !dist || (dist <= m.range && maxFreqFor(g, p.model, dist) > 0);
          return (
            <option key={p.id} value={p.id} disabled={!ok}>
              {p.reg} · {m.name}
              {used ? ` (em ${used.from}–${used.to})` : ''}
              {ok ? '' : ' — sem alcance'}
            </option>
          );
        })}
    </select>
  );
}
