import type { ComponentType } from 'react';
import { useGame, type Tab } from './store/gameStore';
import { ConfirmDialog } from './ui/components/ConfirmDialog';
import { Toast } from './ui/components/Toast';
import { Footer } from './ui/layout/Footer';
import { Tabs } from './ui/layout/Tabs';
import { TopBar } from './ui/layout/TopBar';
import { EventCard } from './ui/overlays/EventCard';
import { GameMenu } from './ui/overlays/GameMenu';
import { GameOver } from './ui/overlays/GameOver';
import { OfflineSummary } from './ui/overlays/OfflineSummary';
import { ResultCard } from './ui/overlays/ResultCard';
import { Financas } from './ui/screens/Financas';
import { Frota } from './ui/screens/Frota';
import { Mercado } from './ui/screens/Mercado';
import { NewGame } from './ui/screens/NewGame';
import { Painel } from './ui/screens/Painel';
import { Rotas } from './ui/screens/rotas/Rotas';

const VIEWS: Record<Tab, ComponentType> = {
  painel: Painel,
  rotas: Rotas,
  frota: Frota,
  mercado: Mercado,
  financas: Financas,
};

export function App() {
  const loaded = useGame((s) => s.loaded);
  const hasGame = useGame((s) => !!s.game);
  const tab = useGame((s) => s.tab);

  if (!loaded) return <div className="loading">Carregando…</div>;
  if (!hasGame)
    return (
      <>
        <NewGame />
        <Toast />
      </>
    );

  const View = VIEWS[tab];
  return (
    <div className="app">
      <TopBar />
      <Tabs />
      <main className="content">
        <View />
      </main>
      <Footer />
      <EventCard />
      <ResultCard />
      <OfflineSummary />
      <GameOver />
      <GameMenu />
      <ConfirmDialog />
      <Toast />
    </div>
  );
}
