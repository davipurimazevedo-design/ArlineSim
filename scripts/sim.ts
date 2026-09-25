// Simulação headless de balanceamento.
//   npm run sim                         → estratégia básica (referência da seção 11) + resumo de todas
//   npm run sim -- --strategy expansao  → só uma estratégia, com detalhe por hub
//   opções: --seed 2026 --days 600 --seeds 10 --strategy basica|esperta|expansao|todas
//           --model tradicional|lowcost|regional|pequeno --hubs BSB,GRU,SLZ
//
// Estratégias:
// - basica   (seção 11 do CLAUDE.md): ATR, destino de maior demanda base entre 350 e 1.500 km do hub,
//            novo slot + ATR quando o caixa passa de R$ 8 mi, manutenção abaixo de 45, eventos ao acaso.
// - esperta  como um jogador atento: escolhe destino e frequência pelo lucro estimado (simRoute),
//            evita rotas que canibalizam as próprias e escala mais aviões em rotas lotadas.
// - expansao esperta + licenças Nacional e Internacional, jatos e rotas internacionais.
// Todas usam RNG com semente (o do jogo e um próprio para as decisões), então são reproduzíveis.
import {
  actions,
  AIRPORT_CODES,
  baseDemand,
  dist,
  routeFair,
  routeFairJ,
  fmtMoney,
  LICENSES,
  maxFreqFor,
  modelAllowed,
  runwayIssue,
  MODEL_KEYS,
  MODELS,
  newGame,
  resolveEvent,
  routeProfit,
  simRoute,
  slotAllowed,
  slotCostFor,
  slotFeeFor,
  tick,
  type AirportCode,
  type BusinessModelId,
  type GameState,
  type ModelKey,
  type Plane,
  type Route,
} from '../src/engine/index.ts';
import { rand, type Seeded } from '../src/engine/rng.ts';

type StrategyId = 'basica' | 'esperta' | 'expansao';
const STRATEGIES: StrategyId[] = ['basica', 'esperta', 'expansao'];
const DEFAULT_HUBS: AirportCode[] = ['BSB', 'GRU', 'SLZ'];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}
const SEED = Number(arg('seed') ?? 2026);
const DAYS = Number(arg('days') ?? 600);
const SEEDS = Number(arg('seeds') ?? 10);
const ONLY = (arg('strategy') ?? 'todas') as StrategyId | 'todas';
const MODEL = (arg('model') ?? 'tradicional') as BusinessModelId;
const HUB_LIST = arg('hubs')?.split(',') as AirportCode[] | undefined;

// ---------------------------------------------------------------- avaliação de rotas hipotéticas

const TMP_PLANE = '__sim_plane';
/** acima deste share a IA endurece (tick.ts) */
const AI_SHARE_LIMIT = 0.55;
const TMP_ROUTE = '__sim_route';

/** Lucro diário estimado de levar um avião do modelo para a rota (nova ou existente), na melhor frequência. */
function estimate(
  s: GameState,
  from: AirportCode,
  to: AirportCode,
  model: ModelKey,
  existing?: Route,
): { profit: number; freq: number } | null {
  const m = MODELS[model];
  const d = dist(from, to);
  const mf = maxFreqFor(s, model, d);
  if (d > m.range || mf < 1 || runwayIssue(model, [from, to])) return null;
  const plane: Plane = {
    id: TMP_PLANE,
    reg: 'PR-SIM',
    model,
    owned: false,
    condition: 100,
    maint: 0,
    restore: true,
    cabin: model === 'A20N' || model === 'B38M' ? (s.license >= 2 ? 1 : 0) : 0,
    hours: 0,
    since: s.day,
  };
  s.fleet.push(plane);
  // estima em condições normais: sem modificadores temporários (feriado, Carnaval, greve...)
  const mods = s.mods;
  s.mods = [];
  let route: Route;
  let base = 0;
  if (existing) {
    route = existing;
    base = routeProfit(s, route, simRoute(s, route));
  } else {
    route = {
      id: TMP_ROUTE,
      kind: 'pax',
      from,
      to,
      dist: d,
      planes: [],
      price: 0,
      priceJ: 0,
      service: 1,
      ai: 1.2,
      rivals: [],
      opened: s.day,
      last: null,
    };
    route.price = routeFair(from, to, d);
    route.priceJ = Math.round(routeFairJ(from, to, d) / 10) * 10;
    s.routes.push(route);
  }
  let best: { profit: number; freq: number } | null = null;
  for (let f = 1; f <= mf; f++) {
    route.planes.push({ id: TMP_PLANE, freq: f });
    const x = simRoute(s, route);
    // 2.500/dia de estrutura por avião + manutenção preventiva (condição gasta × custo por ponto)
    const upkeep = 2500 + (x.planeHours[TMP_PLANE] ?? 0) * m.wearH * m.price * 0.00015;
    // share acima de 55% faz a concorrência endurecer a cada 30 dias: o jogador atento evita
    const profit = routeProfit(s, route, x) - base - upkeep - (x.share > AI_SHARE_LIMIT ? 1e9 : 0);
    route.planes.pop();
    if (!best || profit > best.profit) best = { profit, freq: f };
  }
  s.fleet.pop();
  s.mods = mods;
  if (!existing) s.routes.pop();
  return best;
}

/**
 * Aeronaves que o robô considera. Fora do Pequeno porte, só as 5 do protótipo, para a linha de base
 * continuar comparável (o robô ainda não sabe combinar aviões pequenos e grandes; revisão no fim da Fase 3).
 */
function modelsAvailable(s: GameState): ModelKey[] {
  const pool = s.businessModel === 'pequeno' ? MODEL_KEYS : MODEL_KEYS.slice(0, 5);
  return pool.filter((k) => MODELS[k].tier <= s.license && modelAllowed(s, k));
}

// ---------------------------------------------------------------- estratégias

interface Bot {
  seeded: Seeded;
  reserve: number;
}

/** Referência da seção 11: sempre ATR, destino de maior demanda base entre 350 e 1.500 km (26 aeroportos do protótipo). */
function basica(s: GameState): void {
  if (s.cash <= 8e6 && s.routes.length > 0) return;
  // só os 26 aeroportos do protótipo, para continuar comparável com a referência da seção 11
  const to = AIRPORT_CODES.slice(0, 26)
    .filter((c) => {
      if (s.slots.includes(c) || !slotAllowed(s, c)) return false;
      const d = dist(s.hub, c);
      return d >= 350 && d <= 1500;
    })
    .sort((a, b) => baseDemand(s.hub, b) - baseDemand(s.hub, a))[0];
  if (!to || actions.buySlot(s, to) || actions.lease(s, 'AT7')) return;
  actions.openRoute(s, { from: s.hub, to, planeId: s.fleet.at(-1)!.id });
}

/** Melhor oportunidade: nova rota a partir do hub ou mais um avião numa rota existente. */
function bestMove(s: GameState, bot: Bot) {
  type Move = {
    kind: 'new' | 'add';
    to: AirportCode;
    model: ModelKey;
    freq: number;
    score: number;
    route?: Route;
  };
  let best: Move | null = null;
  for (const model of modelsAvailable(s)) {
    const deposit = MODELS[model].lease * 10;
    for (const to of AIRPORT_CODES) {
      if (to === s.hub || s.slots.includes(to) || !slotAllowed(s, to)) continue;
      if (s.license === 0 && dist(s.hub, to) > 1500) continue;
      const cost = slotCostFor(s, to) + deposit;
      if (s.cash - cost < bot.reserve) continue;
      const e = estimate(s, s.hub, to, model);
      if (!e) continue;
      const profit = e.profit - slotFeeFor(s, to);
      // lucro proporcional ao avião (35% do leasing diário) e que pague slot + depósito em até 2 anos
      if (profit <= 0.35 * MODELS[model].lease || profit * 730 < cost) continue;
      const score = profit / Math.sqrt(cost); // lucro diário, com peso para o investimento
      if (!best || score > best.score) best = { kind: 'new', to, model, freq: e.freq, score };
    }
    for (const r of s.routes) {
      if (!r.last?.flying || r.last.lf < 0.9) continue;
      // só escala outro avião quando os atuais já voam o máximo
      const saturated = r.planes.every((x) => {
        const p = s.fleet.find((f) => f.id === x.id);
        return !p || x.freq >= maxFreqFor(s, p.model, r.dist);
      });
      if (!saturated) continue;
      if (s.cash - deposit < bot.reserve) continue;
      const to = r.from === s.hub ? r.to : r.from;
      const e = estimate(s, r.from, r.to, model, r);
      if (!e || e.profit <= 0.35 * MODELS[model].lease || e.profit * 730 < deposit) continue;
      const score = e.profit / Math.sqrt(deposit);
      if (!best || score > best.score) best = { kind: 'add', to, model, freq: e.freq, score, route: r };
    }
  }
  return best;
}

/** A cada 30 dias, devolve o último avião de rotas com mais de um avião que estão no prejuízo. */
function prune(s: GameState): void {
  if (s.day % 30 !== 0) return;
  for (const r of s.routes) {
    if (r.planes.length < 2 || !r.last?.flying || r.last.profit >= 0) continue;
    const last = r.planes[r.planes.length - 1]!;
    actions.release(s, last.id);
  }
}

/** A cada 30 dias, ajusta a frequência de cada avião para a que dá mais lucro (sem modificadores temporários). */
function tuneFreq(s: GameState): void {
  if (s.day % 15 !== 0) return;
  const mods = s.mods;
  s.mods = [];
  for (const r of s.routes) {
    for (const x of r.planes) {
      const p = s.fleet.find((f) => f.id === x.id);
      if (!p || p.maint > 0) continue; // parado, todas as frequências empatam
      const m = MODELS[p.model];
      let best = { f: x.freq, v: -Infinity };
      for (let f = 1; f <= maxFreqFor(s, p.model, r.dist); f++) {
        x.freq = f;
        const sim = simRoute(s, r);
        const upkeep = (sim.planeHours[p.id] ?? 0) * m.wearH * m.price * 0.00015;
        const v = routeProfit(s, r, sim) - upkeep - (sim.share > AI_SHARE_LIMIT ? 1e9 : 0);
        if (v > best.v) best = { f, v };
      }
      x.freq = best.f;
    }
  }
  s.mods = mods;
}

function esperta(s: GameState, bot: Bot): void {
  prune(s);
  tuneFreq(s);
  const move = bestMove(s, bot);
  if (!move) return;
  if (actions.lease(s, move.model)) return;
  const plane = s.fleet.at(-1)!;
  if (move.kind === 'new') {
    if (actions.buySlot(s, move.to)) return;
    if (actions.openRoute(s, { from: s.hub, to: move.to, planeId: plane.id })) return;
    const r = s.routes.at(-1)!;
    actions.setPlaneFreq(s, r.id, plane.id, move.freq);
  } else if (move.route) {
    if (actions.assignPlane(s, move.route.id, plane.id)) return;
    actions.setPlaneFreq(s, move.route.id, plane.id, move.freq);
  }
}

function expansao(s: GameState, bot: Bot): void {
  // Pequeno porte: certificação regional quando sobra caixa
  if (s.businessModel === 'pequeno' && !s.flags.cert_regional && s.cash > 20e6) actions.buyRegionalCert(s);
  // licenças quando sobra caixa além da reserva
  const next = LICENSES[s.license + 1];
  if (next && s.cash > next.cost + 15e6 && s.routes.length >= 4) {
    actions.buyLicense(s, (s.license + 1) as 1 | 2);
  }
  // com licença internacional, narrowbodies com cabine mista
  if (s.license >= 2)
    for (const p of s.fleet)
      if ((p.model === 'A20N' || p.model === 'B38M') && p.cabin === 0 && p.maint === 0 && s.cash > 20e6)
        actions.setCabin(s, p.id, 1);
  esperta(s, bot);
}

// ---------------------------------------------------------------- execução

interface RunResult {
  s: GameState;
  cashAt: Record<number, number>;
  licenseDay: [number | null, number | null];
}

function simulate(strategy: StrategyId, hub: AirportCode, seed: number, days: number): RunResult {
  const s = newGame('Simulação', hub, seed, 0, MODEL);
  const bot: Bot = { seeded: { seed: (seed ^ 0x9e3779b9) >>> 0 }, reserve: 4e6 };
  const cashAt: Record<number, number> = {};
  const licenseDay: [number | null, number | null] = [null, null];
  const step = () => {
    if (strategy === 'basica') basica(s);
    else if (strategy === 'esperta') esperta(s, bot);
    else expansao(s, bot);
  };
  step();
  while (s.day < days && !s.gameOver) {
    tick(s);
    if (s.pendingEvent) resolveEvent(s, rand(bot.seeded) < 0.5 ? 'L' : 'R');
    for (const p of s.fleet) if (p.maint === 0 && p.condition < 45) actions.maintain(s, p.id);
    step();
    if (s.license >= 1 && licenseDay[0] === null) licenseDay[0] = s.day;
    if (s.license >= 2 && licenseDay[1] === null) licenseDay[1] = s.day;
    if (s.day % 100 === 0) cashAt[s.day] = s.cash;
  }
  return { s, cashAt, licenseDay };
}

const pad = (v: string, n: number) => v.padStart(n);
const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  return a[Math.floor(a.length / 2)]!;
};

function detail(strategy: StrategyId): void {
  console.log(`\n=== Estratégia ${strategy} · semente ${SEED} · ${DAYS} dias ===`);
  for (const hub of HUB_LIST ?? DEFAULT_HUBS) {
    const { s, cashAt } = simulate(strategy, hub, SEED, DAYS);
    console.log(`\nHub ${hub}`);
    console.log(`${pad('dia', 5)} ${pad('caixa', 14)}`);
    for (const [day, cash] of Object.entries(cashAt))
      console.log(`${pad(day, 5)} ${pad(fmtMoney(cash), 14)}`);
    const flying = s.routes.filter((r) => r.planes.length);
    console.log(
      `  final: reputação ${s.reputation.toFixed(1)} · resultado/dia ${fmtMoney(s.lastDay?.profit ?? 0)} · ` +
        `${flying.length} rotas · ${s.fleet.length} aviões · licença ${LICENSES[s.license].name}` +
        (s.gameOver ? ` · FALÊNCIA no dia ${s.day}` : ''),
    );
    console.log(`  rotas: ${flying.map((r) => `${r.from}→${r.to}×${r.planes.length}`).join(', ')}`);
  }
}

function summary(): void {
  console.log(`\n=== Resumo: caixa no dia ${DAYS}, ${SEEDS} sementes (${SEED}…${SEED + SEEDS - 1}) ===`);
  console.log(
    `${pad('estratégia', 10)} ${pad('hub', 4)} ${pad('mínimo', 13)} ${pad('mediana', 13)} ${pad('máximo', 13)} ` +
      `${pad('falências', 9)} ${pad('Nacional', 9)} ${pad('Intern.', 8)}`,
  );
  for (const strategy of ONLY === 'todas' ? STRATEGIES : [ONLY]) {
    for (const hub of HUB_LIST ?? DEFAULT_HUBS) {
      const runs = Array.from({ length: SEEDS }, (_, i) => simulate(strategy, hub, SEED + i, DAYS));
      const cash = runs.map((r) => r.s.cash);
      const broke = runs.filter((r) => r.s.gameOver).length;
      const lic = (i: 0 | 1) => {
        const days = runs.map((r) => r.licenseDay[i]).filter((d): d is number => d !== null);
        return days.length ? `d${median(days)} (${days.length})` : '—';
      };
      console.log(
        `${pad(strategy, 10)} ${pad(hub, 4)} ${pad(fmtMoney(Math.min(...cash)), 13)} ${pad(fmtMoney(median(cash)), 13)} ` +
          `${pad(fmtMoney(Math.max(...cash)), 13)} ${pad(String(broke), 9)} ${pad(lic(0), 9)} ${pad(lic(1), 8)}`,
      );
    }
  }
}

if (process.env.SIM_DEBUG) {
  const r = simulate(ONLY === 'todas' ? 'esperta' : ONLY, (arg('hub') ?? 'BSB') as AirportCode, SEED, DAYS);
  const s = r.s;
  console.log(
    Object.entries(r.cashAt)
      .map(([d, c]) => `${d}:${fmtMoney(c)}`)
      .join(' '),
  );
  for (const x of s.routes)
    console.log(
      `${x.from}-${x.to} ${x.dist}km ${x.planes.map((p) => s.fleet.find((f) => f.id === p.id)?.model).join('/')} planes=${x.planes.length} freq=${x.planes.map((p) => p.freq)} ai=${x.ai.toFixed(2)} share=${x.last?.share.toFixed(2)} lf=${x.last?.lf.toFixed(2)} profit=${fmtMoney(x.last?.profit ?? 0)}`,
    );
  console.log(s.lastDay);
  process.exit(0);
}
detail(ONLY === 'todas' ? 'basica' : ONLY);
if (SEEDS > 1) summary();
