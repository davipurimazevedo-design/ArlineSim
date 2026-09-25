import { useGame } from '../../store/gameStore';
import { applyUpdate } from '../../store/pwa';
import { Btn } from '../components/Btn';

/** Aviso discreto de versão nova (PWA). O jogador escolhe quando atualizar. */
export function UpdateBanner() {
  const ready = useGame((s) => s.updateReady);
  if (!ready) return null;
  return (
    <div className="update-banner" role="status">
      <span>Nova versão do jogo disponível.</span>
      <Btn small kind="primary" onClick={applyUpdate}>
        Atualizar
      </Btn>
      <Btn small kind="ghost" onClick={() => useGame.setState({ updateReady: false })}>
        Depois
      </Btn>
    </div>
  );
}
