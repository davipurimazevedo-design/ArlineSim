// Versionamento do save. Puro: roda no Node (testes) e no navegador.
import { SAVE_VERSION } from '../engine/newGame';
import type { GameState } from '../engine/types';

type Raw = Record<string, unknown>;

/**
 * Migrações por versão: MIGRATIONS[n] converte um save v=n em v=n+1.
 * Ao mudar o GameState, suba SAVE_VERSION e acrescente a função aqui.
 */
const MIGRATIONS: Record<number, (g: Raw) => Raw> = {
  // v1 (Fase 1) → v2 (Fase 2): rota passa a ter uma lista de aeronaves
  1: (g) => {
    const routes = Array.isArray(g.routes) ? (g.routes as Raw[]) : [];
    return {
      ...g,
      routes: routes.map(({ planeId, freq, ...r }) => ({
        ...r,
        planes:
          typeof planeId === 'string' ? [{ id: planeId, freq: typeof freq === 'number' ? freq : 1 }] : [],
      })),
    };
  },
};

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
