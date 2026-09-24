// Objetivos, em ordem de progressão. Cumprido, vira conquista e dá reputação (nunca dinheiro).
import { MODELS } from './aircraft';
import { isIntlPair } from '../formulas';
import type { GameState } from '../types';

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

export const GOALS_BY_ID: Record<string, Goal> = Object.fromEntries(GOALS.map((g) => [g.id, g]));
