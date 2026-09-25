import { useRef, useSyncExternalStore } from 'react';
import { useGame, useGameState } from '../../store/gameStore';
import { parseSaveFile, saveFileName, serializeSave } from '../../store/saveFile';
import { Btn } from '../components/Btn';
import { Icon } from '../components/Icon';
import { Segmented } from '../components/Segmented';
import { useDialog } from '../components/useDialog';

function subscribeScheme(cb: () => void) {
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
const systemDark = () => matchMedia('(prefers-color-scheme: dark)').matches;

/** Menu "Jogo": save em arquivo, tema e novo jogo. Pausa o jogo enquanto está aberto. */
export function GameMenu() {
  const open = useGame((s) => s.menu && !!s.game);
  if (!open) return null;
  return <Panel />;
}

function Panel() {
  const g = useGameState();
  const setMenu = useGame((s) => s.setMenu);
  const ask = useGame((s) => s.ask);
  const notify = useGame((s) => s.notify);
  const importGame = useGame((s) => s.importGame);
  const reset = useGame((s) => s.reset);
  const theme = useGame((s) => s.theme);
  const setTheme = useGame((s) => s.setTheme);
  const sysDark = useSyncExternalStore(subscribeScheme, systemDark);
  const current = theme ?? (sysDark ? 'dark' : 'light');
  const file = useRef<HTMLInputElement>(null);
  const close = () => setMenu(false);
  const ref = useDialog<HTMLDivElement>(close);

  const exportSave = () => {
    const blob = new Blob([serializeSave(g)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = saveFileName(g);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`Save exportado: ${a.download}`);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text().catch(() => '');
    const parsed = parseSaveFile(text);
    if (file.current) file.current.value = '';
    if (!parsed.game) {
      notify(parsed.error, 'bad');
      return;
    }
    const loaded = parsed.game;
    close();
    ask({
      text: `Carregar ${loaded.name} (dia ${loaded.day})? O jogo atual, ${g.name} no dia ${g.day}, será substituído. Exporte-o antes se quiser guardá-lo.`,
      okLabel: 'Carregar save',
      danger: true,
      onOk: () => importGame(loaded),
    });
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <div ref={ref} className="ticket menu" role="dialog" aria-modal="true" aria-labelledby="menu-title">
        <div className="menu-head">
          <h3 id="menu-title">Jogo</h3>
          <Btn small kind="ghost" onClick={close} aria-label="Fechar o menu" data-autofocus>
            Fechar
          </Btn>
        </div>

        <section>
          <h4>Save em arquivo</h4>
          <p className="note">
            Guarde uma cópia do jogo ou leve-o para outro aparelho. O jogo também salva sozinho neste
            navegador.
          </p>
          <div className="row-btns">
            <Btn onClick={exportSave}>
              <Icon n="download" size={15} /> Salvar em arquivo
            </Btn>
            <Btn onClick={() => file.current?.click()}>
              <Icon n="upload" size={15} /> Carregar de arquivo
            </Btn>
            <input
              ref={file}
              type="file"
              accept=".json,application/json"
              hidden
              aria-label="Arquivo de save"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </div>
        </section>

        <section>
          <h4>Tema</h4>
          <Segmented
            label="Tema"
            value={current}
            options={[
              ['light', 'Claro'],
              ['dark', 'Escuro'],
            ]}
            onChange={setTheme}
          />
        </section>

        <section>
          <h4>Novo jogo</h4>
          <p className="note">Funda outra companhia. O jogo atual é apagado deste navegador.</p>
          <Btn
            kind="ghost danger"
            onClick={() => {
              close();
              ask({
                text: `Apagar ${g.name} e fundar outra companhia? Exporte o save antes se quiser guardá-lo.`,
                okLabel: 'Apagar e recomeçar',
                danger: true,
                onOk: reset,
              });
            }}
          >
            Fundar outra companhia
          </Btn>
        </section>

        <p className="menu-version">Asa Norte · versão {__APP_VERSION__}</p>
      </div>
    </div>
  );
}
