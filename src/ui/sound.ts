// Sons sintetizados com Web Audio: nada para baixar. Ligados por padrão em volume baixo;
// a preferência fica no aparelho (localStorage), fora do save.
import { useSyncExternalStore } from 'react';

export type SoundName = 'event' | 'choose' | 'achievement' | 'route' | 'pane' | 'cash' | 'bankrupt';

export interface SoundPrefs {
  on: boolean;
  /** 0–1 */
  volume: number;
}

const PREFS_KEY = 'asanorte-sound';
const DEFAULT_PREFS: SoundPrefs = { on: true, volume: 0.35 };
/** intervalo mínimo entre dois sons iguais, e entre quaisquer dois sons */
const SAME_GAP_MS = 1500;
const ANY_GAP_MS = 350;

let prefs: SoundPrefs = load();
const listeners = new Set<() => void>();

function load(): SoundPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null') as Partial<SoundPrefs> | null;
    if (raw && typeof raw.on === 'boolean' && typeof raw.volume === 'number')
      return { on: raw.on, volume: Math.min(1, Math.max(0, raw.volume)) };
  } catch {
    /* localStorage indisponível */
  }
  return DEFAULT_PREFS;
}

export function setSoundPrefs(p: Partial<SoundPrefs>): void {
  prefs = { ...prefs, ...p };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignorado */
  }
  listeners.forEach((f) => f());
}

export function useSoundPrefs(): SoundPrefs {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => prefs,
  );
}

// ---------------------------------------------------------------- síntese

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

/** O navegador só libera áudio depois de um gesto: cria o contexto no primeiro toque ou tecla. */
export function unlockAudio(): void {
  if (typeof AudioContext === 'undefined') return;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

/** Nota com envelope curto. `slide` desliza a frequência até o fim. */
function tone(
  freq: number,
  start: number,
  dur: number,
  { type = 'sine', gain = 0.5, slide }: { type?: OscillatorType; gain?: number; slide?: number } = {},
): void {
  if (!ctx || !master) return;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Ruído filtrado (vento da decolagem). */
function whoosh(start: number, dur: number, from: number, to: number, gain = 0.25): void {
  if (!ctx || !master) return;
  const t = ctx.currentTime + start;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + dur * 0.4);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(env).connect(master);
  src.start(t);
  src.stop(t + dur);
}

const SOUNDS: Record<SoundName, () => void> = {
  // "ding-dong" de aviso de cabine
  event: () => {
    tone(784, 0, 0.5, { gain: 0.45 });
    tone(587, 0.28, 0.7, { gain: 0.4 });
  },
  choose: () => tone(520, 0, 0.09, { type: 'triangle', gain: 0.3, slide: 700 }),
  achievement: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.35, { type: 'triangle', gain: 0.35 }));
  },
  route: () => {
    whoosh(0, 1.1, 300, 2400, 0.3);
    tone(180, 0, 1, { type: 'sawtooth', gain: 0.05, slide: 420 });
  },
  pane: () => {
    tone(160, 0, 0.35, { type: 'square', gain: 0.12 });
    tone(150, 0.4, 0.45, { type: 'square', gain: 0.12 });
  },
  cash: () => {
    tone(1319, 0, 0.12, { type: 'triangle', gain: 0.3 });
    tone(1760, 0.08, 0.3, { type: 'triangle', gain: 0.3 });
  },
  bankrupt: () => {
    [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.22, 0.4, { type: 'triangle', gain: 0.3 }));
  },
};

const lastPlayed: Partial<Record<SoundName, number>> = {};
let lastAny = 0;

/** Toca um som, se ligado, com a aba visível e fora do intervalo mínimo. */
export function play(name: SoundName): void {
  if (!prefs.on || prefs.volume <= 0 || document.hidden) return;
  if (!ctx || !master || ctx.state !== 'running') return;
  const now = performance.now();
  if (now - (lastPlayed[name] ?? -Infinity) < SAME_GAP_MS || now - lastAny < ANY_GAP_MS) return;
  lastPlayed[name] = now;
  lastAny = now;
  // curva perceptiva: o padrão (0,35) fica baixo, mas audível
  master.gain.setValueAtTime(Math.pow(prefs.volume, 1.5), ctx.currentTime);
  SOUNDS[name]();
}
