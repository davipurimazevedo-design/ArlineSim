// Versionamento do save. Puro: roda no Node (testes) e no navegador.
import { SAVE_VERSION } from '../engine/newGame';
import { rivalsFor } from '../engine/rivals';
import type { AirportCode, GameState } from '../engine/types';

type Raw = Record<string, unknown>;

/**
 * Migrações por versão: MIGRATIONS[n] converte um save v=n em v=n+1.
 * Ao mudar o GameState, suba SAVE_VERSION e acrescente a função aqui.
 */
const list = (x: unknown): Raw[] => (Array.isArray(x) ? (x as Raw[]) : []);

const MIGRATIONS: Record<number, (g: Raw) => Raw> = {
  // v1 (Fase 1) → v2: rota passa a ter uma lista de aeronaves
  1: (g) => ({
    ...g,
    routes: list(g.routes).map(({ planeId, freq, ...r }) => ({
      ...r,
      planes: typeof planeId === 'string' ? [{ id: planeId, freq: typeof freq === 'number' ? freq : 1 }] : [],
    })),
  }),
  // v2 → v3: layout de cabine nas aeronaves e concorrentes com nome nas rotas
  2: (g) => ({
    ...g,
    fleet: list(g.fleet).map((p) => ({ ...p, cabin: typeof p.cabin === 'number' ? p.cabin : 0 })),
    routes: list(g.routes).map((r) => ({
      ...r,
      rivals: Array.isArray(r.rivals) ? r.rivals : rivalsFor(r.from as AirportCode, r.to as AirportCode),
    })),
  }),
  // v3 → v4: marcas para cadeias de eventos
  3: (g) => ({ ...g, flags: g.flags && typeof g.flags === 'object' ? g.flags : {} }),
  // v4 → v5: conquistas
  4: (g) => ({
    ...g,
    achievements: g.achievements && typeof g.achievements === 'object' ? g.achievements : {},
  }),
  // v5 → v6: modelo de negócio (saves antigos são Tradicional) e divisões
  5: (g) => ({
    ...g,
    businessModel: typeof g.businessModel === 'string' ? g.businessModel : 'tradicional',
    divisions: Array.isArray(g.divisions) ? g.divisions : [],
  }),
  // v6 → v7: lista de hubs (começa só com o da fundação)
  6: (g) => ({ ...g, hubs: Array.isArray(g.hubs) ? g.hubs : [g.hub] }),
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
