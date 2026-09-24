import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  catchUp,
  GOALS,
  newGame,
  resolveEvent,
  tick,
  type ActionResult,
  type AirportCode,
  type GameState,
  type OfflineSummary,
  type Side,
  type Speed,
} from '../engine';
import { clearSave, loadGame, loadTheme, saveGame, saveTheme, type Theme } from './persistence';

export type Tab = 'painel' | 'rotas' | 'frota' | 'mercado' | 'financas';
export type ToastTone = 'info' | 'bad';

export interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
}

export interface ConfirmRequest {
  text: string;
  okLabel: string;
  danger?: boolean;
  onOk: () => void;
}

interface Store {
  loaded: boolean;
  game: GameState | null;
  tab: Tab;
  toast: Toast | null;
  offline: OfflineSummary | null;
  /** texto do desfecho do último evento (carta de resultado aberta) */
  result: string | null;
  confirm: ConfirmRequest | null;
  theme: Theme | null;

  boot: () => Promise<void>;
  start: (name: string, hub: AirportCode) => void;
  /** Executa uma ação do motor sobre o jogo. Erros viram toast. Salva em seguida. */
  act: (fn: (g: GameState) => ActionResult) => ActionResult;
  /** Processa n dias (loop). */
  advance: (n: number) => void;
  /** Aplica o tempo passado fora; abre o resumo se passou ao menos 1 dia. */
  catchUpNow: () => void;
  save: () => void;
  setTab: (t: Tab) => void;
  setSpeed: (v: Speed) => void;
  decide: (side: Side) => void;
  closeResult: () => void;
  closeOffline: () => void;
  notify: (text: string, tone?: ToastTone) => void;
  ask: (req: ConfirmRequest) => void;
  closeConfirm: () => void;
  reset: () => void;
  setTheme: (t: Theme) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 2 ** 32)) >>> 0;
}

export const useGame = create<Store>()(
  immer((set, get) => ({
    loaded: false,
    game: null,
    tab: 'painel',
    toast: null,
    offline: null,
    result: null,
    confirm: null,
    theme: loadTheme(),

    boot: async () => {
      const g = await loadGame();
      set({ game: g, loaded: true });
      if (g) {
        get().catchUpNow();
        get().save();
      }
    },

    start: (name, hub) => {
      set({ game: newGame(name, hub, newSeed(), Date.now()), tab: 'painel', offline: null, result: null });
      get().save();
    },

    act: (fn) => {
      let err: ActionResult = 'Nenhum jogo em andamento.';
      set((st) => {
        if (st.game) err = fn(st.game);
      });
      if (err) get().notify(err, 'bad');
      // debounce: sliders de tarifa disparam muitas ações seguidas
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => get().save(), 300);
      return err;
    },

    advance: (n) => {
      const before = get().game?.day ?? 0;
      const had = new Set(Object.keys(get().game?.achievements ?? {}));
      set((st) => {
        const g = st.game;
        if (!g) return;
        for (let i = 0; i < n && !g.gameOver && !g.pendingEvent; i++) tick(g);
      });
      const g = get().game;
      if (!g) return;
      const won = GOALS.filter((x) => g.achievements[x.id] !== undefined && !had.has(x.id));
      const last = won[won.length - 1];
      if (last) get().notify(`Conquista: ${last.title}. Reputação +${last.rep}.`);
      // autosave a cada 5 dias, ao surgir evento e na falência
      const crossed5 = Math.floor(g.day / 5) > Math.floor(before / 5);
      if (crossed5 || g.pendingEvent || g.gameOver) get().save();
    },

    catchUpNow: () => {
      const st = get();
      if (!st.game || st.result || st.offline) return;
      let summary: OfflineSummary | null = null;
      set((s) => {
        if (s.game) summary = catchUp(s.game, Date.now());
      });
      if (summary) {
        set({ offline: summary });
        get().save();
      }
    },

    save: () => {
      clearTimeout(saveTimer);
      if (!get().game) return;
      set((st) => {
        if (st.game) st.game.savedAt = Date.now();
      });
      saveGame(get().game!);
    },

    setTab: (t) => set({ tab: t }),

    setSpeed: (v) => {
      set((st) => {
        if (st.game) st.game.speed = v;
      });
      get().save();
    },

    decide: (side) => {
      let out: string | null = null;
      set((st) => {
        if (st.game) out = resolveEvent(st.game, side);
      });
      if (out !== null) set({ result: out });
      get().save();
    },

    closeResult: () => set({ result: null }),
    closeOffline: () => set({ offline: null }),

    notify: (text, tone = 'info') => {
      clearTimeout(toastTimer);
      set({ toast: { id: Date.now(), text, tone } });
      toastTimer = setTimeout(() => set({ toast: null }), 2600);
    },

    ask: (req) => set({ confirm: req }),
    closeConfirm: () => set({ confirm: null }),

    reset: () => {
      clearSave();
      set({ game: null, offline: null, result: null, confirm: null, tab: 'painel' });
    },

    setTheme: (t) => {
      saveTheme(t);
      document.documentElement.dataset.theme = t;
      set({ theme: t });
    },
  })),
);

/** Atalho para as ações do motor que recebem o jogo como primeiro argumento. */
export function useAct() {
  return useGame((s) => s.act);
}
