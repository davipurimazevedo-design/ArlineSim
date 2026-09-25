// Objetivos, em ordem de progressão. Cumprido, vira conquista e dá reputação (nunca dinheiro).
import { AIRPORTS } from './airports';
import { MODELS } from './aircraft';
import { isIntlPair, routeFair } from '../formulas';
import type { AirportCode, BusinessModelId, GameState } from '../types';

export interface Progress {
  cur: number;
  target: number;
  /** como a interface mostra o progresso */
  kind: 'count' | 'money' | 'check';
}

export interface Goal {
  id: string;
  title: string;
  desc: string;
  /** pontos de reputação ao cumprir */
  rep: number;
  progress: (s: GameState) => Progress;
  /** só aparece para certo modelo ou divisão (sem isso, para todos) */
  show?: (s: GameState) => boolean;
}

const flyingRoutes = (s: GameState) => s.routes.filter((r) => r.planes.length > 0);
const count = (cur: number, target: number): Progress => ({
  cur: Math.min(cur, target),
  target,
  kind: 'count',
});
const check = (ok: boolean): Progress => ({ cur: ok ? 1 : 0, target: 1, kind: 'check' });
const money = (cash: number, target: number): Progress => ({
  cur: Math.max(0, Math.min(cash, target)),
  target,
  kind: 'money',
});

export const GOALS: Goal[] = [
  {
    id: 'primeiro_voo',
    title: 'Primeiro voo',
    desc: 'Abra uma rota com aeronave escalada.',
    rep: 1,
    progress: (s) => count(flyingRoutes(s).length, 1),
  },
  {
    id: 'mes_azul',
    title: 'Mês no azul',
    desc: 'Feche 30 dias seguidos com resultado somado positivo.',
    rep: 2,
    progress: (s) => {
      const last = s.history.slice(-30);
      return check(last.length === 30 && last.reduce((a, h) => a + h.profit, 0) > 0);
    },
  },
  {
    id: 'frota_3',
    title: 'Pequena frota',
    desc: 'Tenha 3 aeronaves.',
    rep: 1,
    progress: (s) => count(s.fleet.length, 3),
  },
  {
    id: 'rotas_5',
    title: 'Malha regional',
    desc: 'Opere 5 rotas com aeronave.',
    rep: 2,
    progress: (s) => count(flyingRoutes(s).length, 5),
  },
  {
    id: 'caixa_25',
    title: 'Caixa forte',
    desc: 'Chegue a R$ 25 mi em caixa.',
    rep: 1,
    progress: (s) => money(s.cash, 25e6),
  },
  {
    id: 'licenca_nacional',
    title: 'Voo nacional',
    desc: 'Obtenha a licença Nacional.',
    rep: 2,
    progress: (s) => check(s.license >= 1),
  },
  {
    id: 'primeiro_jato',
    title: 'Era do jato',
    desc: 'Tenha um jato na frota.',
    rep: 1,
    progress: (s) => check(s.fleet.some((p) => MODELS[p.model].tier >= 1)),
  },
  {
    id: 'aviao_proprio',
    title: 'Avião próprio',
    desc: 'Compre uma aeronave ou quite um leasing.',
    rep: 2,
    progress: (s) => check(s.fleet.some((p) => p.owned)),
  },
  {
    id: 'pax_1000',
    title: 'Mil passageiros',
    desc: 'Transporte 1.000 passageiros num só dia.',
    rep: 2,
    progress: (s) => count(s.lastDay?.pax ?? 0, 1000),
  },
  {
    id: 'reputacao_70',
    title: 'Marca querida',
    desc: 'Alcance reputação 70.',
    rep: 3,
    progress: (s) => count(Math.floor(s.reputation), 70),
  },
  {
    id: 'rotas_10',
    title: 'Malha nacional',
    desc: 'Opere 10 rotas com aeronave.',
    rep: 3,
    progress: (s) => count(flyingRoutes(s).length, 10),
  },
  {
    id: 'caixa_100',
    title: 'Cem milhões',
    desc: 'Chegue a R$ 100 mi em caixa.',
    rep: 3,
    progress: (s) => money(s.cash, 100e6),
  },
  {
    id: 'um_ano',
    title: 'Primeiro aniversário',
    desc: 'Complete um ano de operação.',
    rep: 2,
    progress: (s) => count(s.day, 366),
  },
  {
    id: 'licenca_intl',
    title: 'Asas internacionais',
    desc: 'Obtenha a licença Internacional.',
    rep: 3,
    progress: (s) => check(s.license >= 2),
  },
  {
    id: 'primeira_intl',
    title: 'Além da fronteira',
    desc: 'Opere uma rota internacional.',
    rep: 3,
    progress: (s) => check(flyingRoutes(s).some((r) => isIntlPair(r.from, r.to))),
  },
  {
    id: 'executiva',
    title: 'Classe executiva',
    desc: 'Venda assentos executivos num dia.',
    rep: 2,
    progress: (s) => check(s.routes.some((r) => (r.last?.paxJ ?? 0) > 0)),
  },
  {
    id: 'frota_20',
    title: 'Grande companhia',
    desc: 'Tenha 20 aeronaves.',
    rep: 4,
    progress: (s) => count(s.fleet.length, 20),
  },
  {
    id: 'caixa_500',
    title: 'Meio bilhão',
    desc: 'Chegue a R$ 500 mi em caixa.',
    rep: 4,
    progress: (s) => money(s.cash, 500e6),
  },
];

// ---------- Fase 3: objetivos por modelo e divisão (docs/fase3-eventos.md) ----------

const isModel = (m: BusinessModelId) => (s: GameState) => s.businessModel === m;
const hasDivision = (d: 'cargas' | 'internacional') => (s: GameState) => s.divisions.includes(d);
const paxFlying = (s: GameState) => flyingRoutes(s).filter((r) => r.kind === 'pax');
/** aeroportos atendidos por rotas com aeronave que cumprem o filtro */
const servedAirports = (s: GameState, ok: (c: AirportCode) => boolean) =>
  new Set(
    flyingRoutes(s)
      .flatMap((r) => [r.from, r.to])
      .filter(ok),
  ).size;

const SOUTH_AMERICA = new Set(['Argentina', 'Chile', 'Peru', 'Colômbia', 'Uruguai', 'Paraguai']);
const EUROPE = new Set(['Portugal', 'Espanha', 'França', 'Reino Unido', 'Alemanha', 'Itália']);
/** continente de um aeroporto no exterior (a América Central conta como do Norte) */
function continent(c: AirportCode): 'sul' | 'norte' | 'europa' | null {
  const a = AIRPORTS[c];
  if (!a.intl) return null;
  return SOUTH_AMERICA.has(a.uf) ? 'sul' : EUROPE.has(a.uf) ? 'europa' : 'norte';
}

const PHASE3_GOALS: Goal[] = [
  {
    id: 'lc_cheio',
    title: 'Avião cheio',
    desc: 'Ocupação média de 90% com 5 rotas voando.',
    rep: 2,
    show: isModel('lowcost'),
    progress: (s) => {
      const r = paxFlying(s).filter((x) => x.last?.flying);
      const lf = r.length ? r.reduce((a, x) => a + (x.last?.lf ?? 0), 0) / r.length : 0;
      return check(r.length >= 5 && lf >= 0.9);
    },
  },
  {
    id: 'lc_onibus',
    title: 'Tarifa de ônibus',
    desc: '8 rotas voando, todas com tarifa abaixo da referência.',
    rep: 2,
    show: isModel('lowcost'),
    progress: (s) => {
      const r = paxFlying(s);
      return check(r.length >= 8 && r.every((x) => x.price < routeFair(x.from, x.to, x.dist)));
    },
  },
  {
    id: 'lc_multidao',
    title: 'Multidão',
    desc: 'Transporte 3.000 passageiros num só dia.',
    rep: 3,
    show: isModel('lowcost'),
    progress: (s) => count(s.lastDay?.pax ?? 0, 3000),
  },
  {
    id: 'rg_interior',
    title: 'Interior conectado',
    desc: 'Atenda 10 aeroportos de porte até 6 com rotas voando.',
    rep: 3,
    show: isModel('regional'),
    progress: (s) =>
      count(
        servedAirports(s, (c) => AIRPORTS[c].size <= 6),
        10,
      ),
  },
  {
    id: 'rg_capilar',
    title: 'Capilaridade',
    desc: 'Tenha slots em 20 aeroportos.',
    rep: 2,
    show: isModel('regional'),
    progress: (s) => count(s.slots.length, 20),
  },
  {
    id: 'rg_jato',
    title: 'Jato regional',
    desc: 'Opere um E195-E2 ou um E175.',
    rep: 1,
    show: isModel('regional'),
    progress: (s) => check(s.fleet.some((p) => p.model === 'E295' || p.model === 'E175')),
  },
  {
    id: 'pp_terra',
    title: 'Pouso na terra',
    desc: 'Voe para um aeroporto de pista não pavimentada.',
    rep: 1,
    show: isModel('pequeno'),
    progress: (s) => check(servedAirports(s, (c) => !AIRPORTS[c].paved) > 0),
  },
  {
    id: 'pp_amazonia',
    title: 'Amazônia no mapa',
    desc: 'Atenda 5 cidades de porte até 2.',
    rep: 2,
    show: isModel('pequeno'),
    progress: (s) =>
      count(
        servedAirports(s, (c) => AIRPORTS[c].size <= 2),
        5,
      ),
  },
  {
    id: 'pp_certificacao',
    title: 'Gente grande',
    desc: 'Obtenha a certificação regional.',
    rep: 3,
    show: isModel('pequeno'),
    progress: (s) => check(s.flags.cert_regional !== undefined),
  },
  {
    id: 'pp_atr',
    title: 'Primeiro ATR',
    desc: 'Tenha um ATR 42 ou ATR 72 na frota.',
    rep: 1,
    show: isModel('pequeno'),
    progress: (s) => check(s.fleet.some((p) => p.model === 'AT4' || p.model === 'AT7' || p.model === 'AT7F')),
  },
  {
    id: 'cg_primeira',
    title: 'Primeira carga',
    desc: 'Opere uma rota de carga com cargueiro.',
    rep: 1,
    show: hasDivision('cargas'),
    progress: (s) => check(flyingRoutes(s).some((r) => r.kind === 'cargo')),
  },
  {
    id: 'cg_cem',
    title: 'Cem toneladas',
    desc: 'Transporte 100 t de carga num só dia.',
    rep: 2,
    show: hasDivision('cargas'),
    progress: (s) => count(Math.floor(s.lastDay?.tons ?? 0), 100),
  },
  {
    id: 'cg_fiel',
    title: 'Cliente fiel',
    desc: 'Cumpra um contrato de carga até o fim.',
    rep: 2,
    show: hasDivision('cargas'),
    progress: (s) => check(s.flags.contrato_cumprido !== undefined),
  },
  {
    id: 'in_bandeira',
    title: 'Bandeira lá fora',
    desc: 'Abra um hub no exterior.',
    rep: 2,
    show: hasDivision('internacional'),
    progress: (s) => check(s.hubs.some((c) => AIRPORTS[c].intl)),
  },
  {
    id: 'in_parceria',
    title: 'Parceria global',
    desc: 'Assine o codeshare.',
    rep: 1,
    show: hasDivision('internacional'),
    progress: (s) => check(s.codeshare),
  },
  {
    id: 'in_continentes',
    title: 'Três continentes',
    desc: 'Voe para a América do Sul, a América do Norte e a Europa.',
    rep: 3,
    show: hasDivision('internacional'),
    progress: (s) => {
      const reached = new Set(
        flyingRoutes(s)
          .flatMap((r) => [continent(r.from), continent(r.to)])
          .filter((x) => x !== null),
      );
      return count(reached.size, 3);
    },
  },
];

GOALS.push(...PHASE3_GOALS);

export const GOALS_BY_ID: Record<string, Goal> = Object.fromEntries(GOALS.map((g) => [g.id, g]));
