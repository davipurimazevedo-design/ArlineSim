import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './styles/tokens.css';
import './styles/base.css';
import './ui/components/components.css';
import './ui/layout/layout.css';
import './ui/screens/screens.css';
import './ui/overlays/overlays.css';
import { App } from './App';
import { useGame } from './store/gameStore';
import { startLoop } from './store/loop';
import { registerServiceWorker } from './store/pwa';

// depuração: acesso ao store pelo console apenas em desenvolvimento
if (import.meta.env.DEV) (window as unknown as { __store: typeof useGame }).__store = useGame;

const theme = useGame.getState().theme;
if (theme) document.documentElement.dataset.theme = theme;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void useGame.getState().boot();
startLoop();
// o service worker só existe no build; no `npm run dev` atrapalharia a recarga dos módulos
if (import.meta.env.PROD) registerServiceWorker();
