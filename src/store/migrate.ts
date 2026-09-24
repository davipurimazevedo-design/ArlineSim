// Versionamento do save. Puro: roda no Node (testes) e no navegador.
import { SAVE_VERSION } from '../engine/newGame';
import type { GameState } from '../engine/types';

type Raw = Record<string, unknown>;

/**
 * Migrações por versão: MIGRATIONS[n] converte um save v=n em v=n+1.
 * Hoje não há nenhuma; ao mudar o GameState, suba SAVE_VERSION e acrescente a função aqui.
 */
const MIGRATIONS: Record<number, (g: Raw) => Raw> = {};

/** Valida e migra um save cru. Devolve null se não for aproveitável. */
export function migrate(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  let g = raw as Raw;
  let v = typeof g.v === 'number' ? g.v : 0;
  if (v > SAVE_VERSION) return null;
  while (v < SAVE_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) return null;
    g = step(g);
    v++;
    g.v = v;
  }
  const ok =
    typeof g.name === 'string' &&
    typeof g.hub === 'string' &&
    typeof g.day === 'number' &&
    typeof g.cash === 'number' &&
    typeof g.seed === 'number' &&
    Array.isArray(g.fleet) &&
    Array.isArray(g.routes) &&
    Array.isArray(g.slots);
  return ok ? (g as unknown as GameState) : null;
}
