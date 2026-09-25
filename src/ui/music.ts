// Música de fundo gerada ao vivo com Web Audio: trilha ambiente calma, no clima de "lounge de aeroporto".
// Acordes longos com filtro suave, um baixo discreto e notas soltas de uma escala pentatônica com eco.
// A melodia é sorteada a cada compasso (Math.random: é só enfeite de interface, fora do motor).
import { audioContext, getSoundPrefs, onSoundPrefs, perceptual } from './sound';

/** andamento lento: ~64 batidas por minuto, compasso de 4 */
const BPM = 64;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
/** quanto à frente agenda (s) e de quanto em quanto confere (ms) */
const LOOKAHEAD = 1.2;
const TICK_MS = 250;
/** volume máximo da música antes da preferência (fica bem abaixo dos efeitos) */
const MUSIC_GAIN = 0.22;

/** progressões em notas MIDI (acordes com sétima), trocadas a cada 8 compassos */
const PROGRESSIONS: number[][][] = [
  // Cmaj7 – Am7 – Fmaj7 – G6
  [
    [60, 64, 67, 71],
    [57, 60, 64, 67],
    [53, 57, 60, 64],
    [55, 59, 62, 64],
  ],
  // Dm9 – G13 – Cmaj9 – Am9
  [
    [62, 65, 69, 72],
    [55, 59, 64, 65],
    [60, 64, 67, 74],
    [57, 60, 64, 71],
  ],
  // Fmaj7 – Em7 – Dm7 – Cmaj7
  [
    [53, 57, 60, 64],
    [52, 55, 59, 62],
    [50, 53, 57, 60],
    [48, 52, 55, 59],
  ],
];
/** pentatônica de dó para as notas soltas (duas oitavas) */
const MELODY = [72, 74, 76, 79, 81, 84, 86, 88];

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** entrada da cadeia (filtro) e volume final da música */
let input: BiquadFilterNode | null = null;
let out: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextBar = 0;
let bar = 0;
let progression = 0;

/** Cadeia da música: filtro passa-baixa → eco → volume próprio. Devolve a entrada. */
function ensureBus(ctx: AudioContext): BiquadFilterNode {
  if (input) return input;
  out = ctx.createGain();
  out.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  const delay = ctx.createDelay(2);
  delay.delayTime.value = BEAT * 0.75;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.32;
  const wet = ctx.createGain();
  wet.gain.value = 0.28;
  filter.connect(out);
  filter.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(out);
  out.connect(ctx.destination);
  input = filter;
  return input;
}

function voice(
  ctx: AudioContext,
  freq: number,
  t: number,
  dur: number,
  gain: number,
  {
    type = 'sine',
    attack = 0.02,
    detune = 0,
  }: { type?: OscillatorType; attack?: number; detune?: number } = {},
): void {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + attack);
  env.gain.setValueAtTime(gain, t + Math.max(attack, dur - 1.2));
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(ensureBus(ctx));
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function scheduleBar(ctx: AudioContext, t: number): void {
  const chords = PROGRESSIONS[progression]!;
  const chord = chords[bar % chords.length]!;
  // pad: duas vozes levemente desafinadas por nota, entrada lenta, emendando no próximo acorde
  for (const n of chord) {
    voice(ctx, hz(n), t, BAR + 1.4, 0.035, { attack: 1.4, detune: -5 });
    voice(ctx, hz(n), t, BAR + 1.4, 0.025, { type: 'triangle', attack: 1.6, detune: 6 });
  }
  // baixo: a fundamental duas oitavas abaixo
  voice(ctx, hz(chord[0]! - 24), t, BAR, 0.09, { attack: 0.3 });
  // notas soltas em colcheias, com pausas (40% de chance em cada tempo fraco ou forte)
  for (let i = 0; i < 8; i++) {
    if (Math.random() > 0.4) continue;
    const pool = MELODY.filter((m) => chord.some((c) => (m - c) % 12 === 0) || Math.random() < 0.35);
    const note = pool[Math.floor(Math.random() * pool.length)] ?? MELODY[0]!;
    voice(ctx, hz(note), t + (i * BEAT) / 2, 1.1, 0.045, { type: 'triangle', attack: 0.01 });
  }
  bar++;
  if (bar % 8 === 0) progression = (progression + 1) % PROGRESSIONS.length;
}

function applyVolume(ctx: AudioContext): void {
  if (!out) return;
  const p = getSoundPrefs();
  const v = p.music && !document.hidden ? perceptual(p.musicVolume) * MUSIC_GAIN : 0;
  out.gain.cancelScheduledValues(ctx.currentTime);
  out.gain.setTargetAtTime(v, ctx.currentTime, 0.8); // entra e sai devagar
}

function loop(): void {
  const ctx = audioContext();
  if (!ctx) return;
  ensureBus(ctx);
  applyVolume(ctx);
  const p = getSoundPrefs();
  if (!p.music || document.hidden) return; // não agenda notas enquanto em silêncio
  if (nextBar < ctx.currentTime) nextBar = ctx.currentTime + 0.1;
  while (nextBar < ctx.currentTime + LOOKAHEAD) {
    scheduleBar(ctx, nextBar);
    nextBar += BAR;
  }
}

/** Liga o agendador da música (toca só depois do primeiro gesto e se estiver ligada). */
export function startMusic(): () => void {
  if (timer) return () => {};
  timer = setInterval(loop, TICK_MS);
  const refresh = () => {
    const ctx = audioContext();
    if (ctx) applyVolume(ctx);
  };
  const off = onSoundPrefs(refresh);
  document.addEventListener('visibilitychange', refresh);
  return () => {
    if (timer) clearInterval(timer);
    timer = null;
    off();
    document.removeEventListener('visibilitychange', refresh);
  };
}
