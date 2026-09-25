import { useRef, useSyncExternalStore } from 'react';
import { restartTutorial } from '../../engine';
import { useGame, useGameState } from '../../store/gameStore';
import { applyUpdate } from '../../store/pwa';
import { parseSaveFile, saveFileName, serializeSave } from '../../store/saveFile';
import { Btn } from '../components/Btn';
import { Icon } from '../components/Icon';
import { Segmented } from '../components/Segmented';
import { useDialog } from '../components/useDialog';
import { play, setSoundPrefs, unlockAudio, useSoundPrefs } from '../sound';

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
  const updateReady = useGame((s) => s.updateReady);
  const act = useGame((s) => s.act);
  const sound = useSoundPrefs();
  const setTab = useGame((s) => s.setTab);
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
          <h4>Sons</h4>
          <div className="sound-row">
            <span className="sound-label">Efeitos</span>
            <Segmented
              label="Efeitos sonoros"
              value={sound.on ? 'on' : 'off'}
              options={[
                ['on', 'Ligados'],
                ['off', 'Desligados'],
              ]}
              onChange={(v) => setSoundPrefs({ on: v === 'on' })}
            />
            <label className="volume">
              <span className="sr-only">Volume dos efeitos</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                aria-label="Volume dos efeitos"
                value={sound.volume}
                disabled={!sound.on}
                onChange={(e) => setSoundPrefs({ volume: +e.target.value })}
                onPointerUp={() => {
                  unlockAudio();
                  play('cash');
                }}
                onKeyUp={() => {
                  unlockAudio();
                  play('cash');
                }}
              />
            </label>
          </div>
          <div className="sound-row">
            <span className="sound-label">Música</span>
            <Segmented
              label="Música de fundo"
              value={sound.music ? 'on' : 'off'}
              options={[
                ['on', 'Ligada'],
                ['off', 'Desligada'],
              ]}
              onChange={(v) => {
                unlockAudio();
                setSoundPrefs({ music: v === 'on' });
              }}
            />
            <label className="volume">
              <span className="sr-only">Volume da música</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                aria-label="Volume da música"
                value={sound.musicVolume}
                disabled={!sound.music}
                onChange={(e) => setSoundPrefs({ musicVolume: +e.target.value })}
              />
            </label>
          </div>
          <p className="note">A música é gerada no próprio jogo e toca depois do primeiro toque ou clique.</p>
        </section>

        <section>
          <h4>Tutorial</h4>
          <p className="note">Mostra de novo o roteiro de primeiros passos no Painel.</p>
          <Btn
            onClick={() => {
              act((s) => restartTutorial(s));
              setTab('painel');
              close();
            }}
          >
            Refazer o tutorial
          </Btn>
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

        <section>
          <h4>Instalar e jogar offline</h4>
          <p className="note">
            No celular, use "Adicionar à tela inicial" no menu do navegador; no computador, o ícone de
            instalar na barra de endereço. Depois da primeira visita, o jogo abre sem internet.
          </p>
          {updateReady && (
            <Btn kind="primary" onClick={applyUpdate}>
              Atualizar para a versão nova
            </Btn>
          )}
        </section>

        <p className="menu-version">Asa Norte · versão {__APP_VERSION__}</p>
      </div>
    </div>
  );
}
