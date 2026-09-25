import {
  isFreighter,
  maxFreqFor,
  MODELS,
  routeOfPlane,
  runwayIssue,
  type AirportCode,
  type RouteKind,
} from '../../../engine';
import { useGameState } from '../../../store/gameStore';

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
  /** distância da rota; aeronaves sem alcance ficam desabilitadas */
  dist: number;
  /** aeroportos da rota, para checar a pista */
  airports?: AirportCode[];
  /** aeronaves que não aparecem na lista (já escaladas nesta rota) */
  exclude?: string[];
  /** texto da opção vazia */
  emptyLabel?: string;
  id?: string;
  /** tipo de rota: só aparecem cargueiros na carga e aviões de passageiros na de passageiros */
  kind?: RouteKind;
}

export function PlaneSelect({
  airports = [],
  value,
  onChange,
  dist,
  exclude = [],
  emptyLabel = 'Sem aeronave',
  id,
  kind = 'pax',
}: Props) {
  const g = useGameState();
  return (
    <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{emptyLabel}</option>
      {g.fleet
        .filter((p) => !exclude.includes(p.id) && isFreighter(p.model) === (kind === 'cargo'))
        .map((p) => {
          const m = MODELS[p.model];
          const used = routeOfPlane(g, p.id);
          const ok =
            (!dist || (dist <= m.range && maxFreqFor(g, p.model, dist) > 0)) &&
            !runwayIssue(p.model, airports);
          return (
            <option key={p.id} value={p.id} disabled={!ok}>
              {p.reg} · {m.name}
              {used ? ` (em ${used.from}–${used.to})` : ''}
              {ok ? '' : ' — sem alcance ou pista'}
            </option>
          );
        })}
    </select>
  );
}
