import type { Fx as FxMap, FxKey } from '../../engine';
import { Icon, type IconName } from '../components/Icon';

const FX_ICON: Record<FxKey, IconName> = { cash: 'cash', rep: 'rep', fleet: 'wrench', ops: 'ops' };
const FX_NAME: Record<FxKey, string> = { cash: 'Caixa', rep: 'Reputação', fleet: 'Frota', ops: 'Operação' };

/** Prévia de impacto de uma opção: ícone com ▲ teal ou ▼ laranja. */
export function Fx({ fx }: { fx: FxMap }) {
  const keys = Object.keys(fx) as FxKey[];
  if (!keys.length) return <small className="fx none">sem impacto</small>;
  return (
    <span className="fx">
      {keys.map((k) => {
        const up = fx[k]! > 0;
        return (
          <span key={k} className={up ? 'up' : 'down'} title={FX_NAME[k]}>
            <Icon n={FX_ICON[k]} size={14} />
            <span aria-hidden="true">{up ? '▲' : '▼'}</span>
            <span className="sr-only">
              {FX_NAME[k]} {up ? 'sobe' : 'cai'}
            </span>
          </span>
        );
      })}
    </span>
  );
}
