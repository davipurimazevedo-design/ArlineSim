import { useGame, type Tab } from '../../store/gameStore';
import { Icon, type IconName } from '../components/Icon';

const TABS: readonly (readonly [Tab, string, IconName])[] = [
  ['painel', 'Painel', 'grid'],
  ['rotas', 'Rotas', 'route'],
  ['frota', 'Frota', 'plane'],
  ['mercado', 'Mercado', 'store'],
  ['financas', 'Finanças', 'chart'],
];

export function Tabs() {
  const tab = useGame((s) => s.tab);
  const setTab = useGame((s) => s.setTab);
  // aviões com condição < 40 fora de manutenção
  const alerts = useGame((s) => s.game?.fleet.filter((p) => p.condition < 40 && !p.maint).length ?? 0);
  return (
    <nav className="tabs" aria-label="Seções">
      {TABS.map(([k, label, icon]) => (
        <button key={k} type="button" aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}>
          <Icon n={icon} size={18} />
          <span>{label}</span>
          {k === 'frota' && alerts > 0 && <em aria-label={`${alerts} com condição baixa`}>{alerts}</em>}
        </button>
      ))}
    </nav>
  );
}
