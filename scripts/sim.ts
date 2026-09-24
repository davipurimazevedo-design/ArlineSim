// Simulação headless de balanceamento: npm run sim [-- --seed 2026 --days 600 --seeds 10]
//
// Estratégia automática (CLAUDE.md, seções 11 e 16):
// - arrenda um ATR e abre a rota do hub para o aeroporto de maior demanda base entre 350 e 1.500 km;
// - sempre que o caixa passa de R$ 8 mi, compra o próximo slot dessa lista e arrenda outro ATR para ele;
// - faz manutenção quando a condição cai abaixo de 45;
// - escolhe o lado dos eventos aleatoriamente (RNG próprio da estratégia, também com semente);
// - frequência e tarifa padrão, sem empréstimos; para de expandir quando os candidatos acabam.
import {
  actions,
  AIRPORT_CODES,
  baseDemand,
  dist,
  fmtMoney,
  newGame,
  resolveEvent,
  slotAllowed,
  tick,
  type AirportCode,
  type GameState,
} from '../src/engine/index.ts';
import { rand } from '../src/engine/rng.ts';

const HUBS: AirportCode[] = ['BSB', 'GRU', 'SLZ'];

function arg(name: string, def: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? Number(process.argv[i + 1]) : def;
}

const SEED = arg('seed', 2026);
const DAYS = arg('days', 600);
const SEEDS = arg('seeds', 10);

function candidates(s: GameState): AirportCode[] {
  return AIRPORT_CODES.filter((c) => {
    if (s.slots.includes(c) || !slotAllowed(s, c)) return false;
    const d = dist(s.hub, c);
    return d >= 350 && d <= 1500;
  }).sort((a, b) => baseDemand(s.hub, b) - baseDemand(s.hub, a));
}

/** Compra o próximo slot, arrenda um ATR e abre a rota. true se expandiu. */
function expand(s: GameState): boolean {
  const to = candidates(s)[0];
  if (!to) return false;
  if (actions.buySlot(s, to)) return false;
  if (actions.lease(s, 'AT7')) return false;
  const plane = s.fleet.at(-1)!;
  return actions.openRoute(s, { from: s.hub, to, planeId: plane.id }) === null;
}

interface Snapshot {
  day: number;
  cash: number;
  rep: number;
  profit: number;
  routes: number;
}

function simulate(hub: AirportCode, seed: number, days: number): { snaps: Snapshot[]; s: GameState } {
  const s = newGame('Simulação', hub, seed);
  const strategy = { seed: (seed ^ 0x9e3779b9) >>> 0 };
  const snaps: Snapshot[] = [];
  expand(s);
  while (s.day < days && !s.gameOver) {
    tick(s);
    if (s.pendingEvent) resolveEvent(s, rand(strategy) < 0.5 ? 'L' : 'R');
    for (const p of s.fleet) if (p.maint === 0 && p.condition < 45) actions.maintain(s, p.id);
    if (s.cash > 8e6) expand(s);
    if (s.day % 100 === 0 || s.gameOver)
      snaps.push({
        day: s.day,
        cash: s.cash,
        rep: s.reputation,
        profit: s.lastDay?.profit ?? 0,
        routes: s.routes.length,
      });
  }
  return { snaps, s };
}

const pad = (v: string, n: number) => v.padStart(n);

console.log(`Asa Norte · simulação headless · semente ${SEED} · ${DAYS} dias\n`);
for (const hub of HUBS) {
  const { snaps, s } = simulate(hub, SEED, DAYS);
  console.log(`Hub ${hub}`);
  console.log(
    `${pad('dia', 5)} ${pad('caixa', 14)} ${pad('reputação', 10)} ${pad('resultado/dia', 15)} ${pad('rotas', 6)}`,
  );
  for (const x of snaps)
    console.log(
      `${pad(String(x.day), 5)} ${pad(fmtMoney(x.cash), 14)} ${pad(x.rep.toFixed(1), 10)} ${pad(fmtMoney(x.profit), 15)} ${pad(String(x.routes), 6)}`,
    );
  if (s.gameOver) console.log(`  falência no dia ${s.day}`);
  console.log(`  rotas: ${s.routes.map((r) => `${r.from}→${r.to}`).join(', ')}\n`);
}

if (SEEDS > 1) {
  console.log(`Caixa no dia ${DAYS} em ${SEEDS} sementes (${SEED}…${SEED + SEEDS - 1})`);
  console.log(
    `${pad('hub', 5)} ${pad('mínimo', 14)} ${pad('mediana', 14)} ${pad('máximo', 14)} ${pad('falências', 10)}`,
  );
  for (const hub of HUBS) {
    const runs = Array.from({ length: SEEDS }, (_, i) => simulate(hub, SEED + i, DAYS).s);
    const cash = runs.map((s) => s.cash).sort((a, b) => a - b);
    const med = cash[Math.floor(cash.length / 2)]!;
    const broke = runs.filter((s) => s.gameOver).length;
    console.log(
      `${pad(hub, 5)} ${pad(fmtMoney(cash[0]!), 14)} ${pad(fmtMoney(med), 14)} ${pad(fmtMoney(cash.at(-1)!), 14)} ${pad(String(broke), 10)}`,
    );
  }
}
