// Gerador pseudoaleatório mulberry32. O estado (uint32) vive em GameState.seed,
// então testes, simulações e o cálculo offline são reproduzíveis.

export interface Seeded {
  seed: number;
}

/** Número em [0, 1). Avança o estado. */
export function rand(s: Seeded): number {
  s.seed = (s.seed + 0x6d2b79f5) >>> 0;
  let t = s.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Inteiro em [0, n). */
export function randInt(s: Seeded, n: number): number {
  return Math.floor(rand(s) * n);
}

/** Uniforme em [a, b). */
export function randRange(s: Seeded, a: number, b: number): number {
  return a + rand(s) * (b - a);
}

/** true com probabilidade p. */
export function chance(s: Seeded, p: number): boolean {
  return rand(s) < p;
}

/** Normaliza qualquer número para uma semente uint32 válida. */
export function toSeed(n: number): number {
  return Math.floor(Math.abs(n)) >>> 0;
}

/** Identificador curto de 7 caracteres base 36. */
export function uid(s: Seeded): string {
  let out = '';
  for (let i = 0; i < 7; i++) out += randInt(s, 36).toString(36);
  return out;
}
