import { describe, expect, it } from 'vitest';
import * as actions from '../../src/engine/actions';
import {
  CARGO_HANDLING,
  cargoCapacityOn,
  cargoDemand,
  cargoFair,
  hasCargoDivision,
} from '../../src/engine/cargo';
import {
  CONTRACT_GRACE,
  CONTRACT_PENALTY_DAYS,
  generateOffer,
  processContracts,
} from '../../src/engine/contracts';
import { MODELS } from '../../src/engine/data/aircraft';
import { routesAt } from '../../src/engine/hubs';
import { newGame } from '../../src/engine/newGame';
import { overlapFactor } from '../../src/engine/overlap';
import { createRoute, planRoute } from '../../src/engine/routePlanner';
import { modelAllowed } from '../../src/engine/rules';
import { simRoute } from '../../src/engine/simRoute';
import { tick } from '../../src/engine/tick';
import type { CargoContract, GameState } from '../../src/engine/types';
import { migrate } from '../../src/store/migrate';
import { addTestPlane, addTestRoute, makeGame } from './helpers';

function cargoGame(hub: Parameters<typeof makeGame>[0] = 'GRU'): GameState {
  const s = makeGame(hub);
  s.cash = 200e6;
  s.license = 1;
  expect(actions.buyDivision(s, 'cargas')).toBeNull();
  return s;
}

describe('divisão Cargas', () => {
  it('abre desde a licença Regional por R$ 8 mi', () => {
    const s = makeGame();
    expect(actions.buyDivision(s, 'cargas')).toBeNull();
    expect(hasCargoDivision(s)).toBe(true);
    expect(s.cash).toBe(4e6);
  });

  it('cargueiros exigem a divisão e a licença de cada um', () => {
    const s = makeGame();
    s.cash = 100e6;
    expect(actions.lease(s, 'AT7F')).toMatch(/divisão Cargas/);
    actions.buyDivision(s, 'cargas');
    expect(actions.lease(s, 'AT7F')).toBeNull();
    expect(actions.lease(s, 'B73F')).toMatch(/Licença/);
  });

  it('Pequeno porte: só Caravan Cargo e SkyCourier cargueiro até a certificação', () => {
    const s = newGame('x', 'CGH', 1, 0, 'pequeno');
    expect(modelAllowed(s, 'C208F')).toBe(true);
    expect(modelAllowed(s, 'C408F')).toBe(true);
    expect(modelAllowed(s, 'AT7F')).toBe(false);
    // começa com R$ 5 mi: precisa crescer antes de abrir a divisão (R$ 8 mi)
    expect(actions.buyDivision(s, 'cargas')).toMatch(/Caixa/);
    s.cash = 9e6;
    expect(actions.buyDivision(s, 'cargas')).toBeNull();
    expect(actions.lease(s, 'C208F')).toBeNull();
  });
});

describe('demanda e frete', () => {
  it('peso logístico: Viracopos e Manaus movem mais carga', () => {
    // mesmo porte (6), pesos diferentes
    expect(cargoDemand('VCP', 'MAO')).toBeGreaterThan(cargoDemand('CWB', 'FLN') * 5);
  });

  it('rota curta perde para o caminhão, menos em cidade remota', () => {
    const d = 300;
    const short = cargoDemand('GRU', 'CNF', d);
    const normal = cargoDemand('GRU', 'CNF', 800);
    expect(short / normal).toBeCloseTo(0.3);
  });

  it('frete de referência por tonelada cresce com a distância e o destino remoto', () => {
    expect(cargoFair('GRU', 'GIG', 1000)).toBe(4000);
    expect(cargoFair('GRU', 'MAO', 2690)).toBe(6190);
    expect(cargoFair('VCP', 'MIA', 6560)).toBe(10060 - 1530);
  });
});

describe('rota de carga', () => {
  it('criador: cargueiro só em rota de carga e vice-versa', () => {
    const s = cargoGame();
    const base = { from: 'GRU' as const, to: 'REC' as const, planeId: null };
    expect(planRoute(s, { ...base, leaseModel: 'AT7F' }).error).toMatch(/cargueiro/);
    expect(planRoute(s, { ...base, leaseModel: 'A20N', kind: 'cargo' }).error).toMatch(/não é cargueiro/);
    const p = planRoute(s, { ...base, leaseModel: 'B73F', kind: 'cargo' });
    expect(p.error).toBeNull();
    expect(p.fair).toBe(cargoFair('GRU', 'REC'));
    expect(p.preview!.tons).toBeGreaterThan(0);
  });

  it('pares iguais de passageiros e carga convivem sem dividir demanda', () => {
    const s = cargoGame();
    expect(createRoute(s, { from: 'GRU', to: 'REC', planeId: null, leaseModel: 'A20N' })).toBeNull();
    expect(
      createRoute(s, { from: 'GRU', to: 'REC', planeId: null, leaseModel: 'B73F', kind: 'cargo' }),
    ).toBeNull();
    expect(createRoute(s, { from: 'GRU', to: 'REC', planeId: null, kind: 'cargo' })).toMatch(/já existe/);
    const [pax, cargo] = s.routes;
    expect(cargo!.kind).toBe('cargo');
    expect(cargo!.rivals[0]!.id).toBe('rotanorte');
    expect(overlapFactor(s, pax!)).toBe(1);
    expect(overlapFactor(s, cargo!)).toBe(1);
    // conexões de hub só contam rotas de passageiros
    expect(routesAt(s, 'GRU')).toBe(1);
  });

  it('simula toneladas até a capacidade, com frete e manuseio', () => {
    const s = cargoGame();
    const p = addTestPlane(s, 'B73F');
    const r = addTestRoute(s, 'GRU', 'MAO', p.id, { freq: 1, kind: 'cargo', price: cargoFair('GRU', 'MAO') });
    r.ai = 0.8;
    const x = simRoute(s, r);
    expect(x.flying).toBe(true);
    expect(x.pax).toBe(0);
    expect(x.tons).toBeGreaterThan(0);
    expect(x.tons).toBeLessThanOrEqual(MODELS.B73F.cargo! * 2);
    expect(x.rev).toBeCloseTo(x.tons * r.price);
    expect(x.fees).toBeCloseTo(x.tons * CARGO_HANDLING);
    expect(x.svc).toBe(0);
  });

  it('reputação não muda a carga; a condição dos cargueiros sim', () => {
    const s = cargoGame();
    const p = addTestPlane(s, 'AT7F');
    const r = addTestRoute(s, 'GRU', 'CNF', p.id, { freq: 1, kind: 'cargo', price: cargoFair('GRU', 'CNF') });
    r.ai = 3; // concorrência forte: a demanda não enche o avião
    const base = simRoute(s, r).tons;
    s.reputation = 95;
    expect(simRoute(s, r).tons).toBe(base);
    p.condition = 30;
    expect(simRoute(s, r).tons).toBeLessThan(base);
  });

  it('o tick separa receita de carga e toneladas', () => {
    const s = cargoGame();
    const p = addTestPlane(s, 'AT7F');
    addTestRoute(s, 'GRU', 'CNF', p.id, { freq: 1, kind: 'cargo', price: cargoFair('GRU', 'CNF') });
    tick(s, { noEvents: true });
    const d = s.lastDay!;
    expect(d.rev).toBe(0);
    expect(d.cargo).toBeGreaterThan(0);
    expect(d.tons).toBeGreaterThan(0);
    expect(d.pax).toBe(0);
  });
});

describe('contratos de carga', () => {
  function contract(s: GameState, extra: Partial<CargoContract> = {}): CargoContract {
    const c: CargoContract = {
      id: 'c1',
      client: 'malote',
      from: 'GRU',
      to: 'REC',
      tons: 5,
      pay: 20000,
      days: 100,
      start: s.day,
      expires: 0,
      miss: 0,
      minCond: 0,
      ...extra,
    };
    s.contracts.push(c);
    return c;
  }

  it('proposta chega depois da abertura da divisão, e pode ser aceita', () => {
    const s = cargoGame();
    expect(s.nextCargoOffer).toBe(s.day + 10);
    for (let i = 0; i < 10 && !s.cargoOffer; i++) tick(s, { noEvents: true });
    const o = s.cargoOffer!;
    expect(o).toBeTruthy();
    expect(s.slots.includes(o.from) || s.slots.includes(o.to)).toBe(true);
    expect(o.pay).toBeGreaterThan(0);
    expect(actions.acceptCargoOffer(s)).toBeNull();
    expect(s.contracts).toHaveLength(1);
    expect(s.contracts[0]!.start).toBe(s.day);
    expect(s.cargoOffer).toBeNull();
  });

  it('proposta expira sem resposta', () => {
    const s = cargoGame();
    s.cargoOffer = generateOffer(s);
    s.nextCargoOffer = 1e9;
    s.day = s.cargoOffer!.expires + 1;
    processContracts(s);
    expect(s.cargoOffer).toBeNull();
  });

  it('Pequeno porte recebe contratos pequenos', () => {
    const s = newGame('x', 'MAO', 7, 0, 'pequeno');
    s.cash = 50e6;
    actions.buyDivision(s, 'cargas');
    for (let i = 0; i < 20; i++) {
      const o = generateOffer(s);
      if (o) expect(o.tons).toBeLessThanOrEqual(3);
    }
  });

  it('paga com a capacidade exigida no par', () => {
    const s = cargoGame();
    const p = addTestPlane(s, 'AT7F');
    addTestRoute(s, 'REC', 'GRU', p.id, { freq: 1, kind: 'cargo' });
    contract(s, { tons: 9 });
    expect(cargoCapacityOn(s, 'GRU', 'REC').tons).toBeCloseTo(9.2);
    s.nextCargoOffer = 1e9;
    expect(processContracts(s)).toBe(20000);
  });

  it('sem capacidade por 7 dias: rompe com multa e reputação', () => {
    const s = cargoGame();
    s.nextCargoOffer = 1e9;
    contract(s, { tons: 5 });
    const cash = s.cash;
    const rep = s.reputation;
    for (let i = 0; i < CONTRACT_GRACE; i++) expect(processContracts(s)).toBe(0);
    expect(s.contracts).toHaveLength(0);
    expect(s.cash).toBe(cash - 20000 * CONTRACT_PENALTY_DAYS);
    expect(s.reputation).toBeLessThan(rep);
  });

  it('Farmavida exige cargueiros em boa condição', () => {
    const s = cargoGame();
    s.nextCargoOffer = 1e9;
    const p = addTestPlane(s, 'AT7F', { condition: 60 });
    addTestRoute(s, 'GRU', 'REC', p.id, { freq: 1, kind: 'cargo' });
    contract(s, { client: 'farmavida', tons: 2, minCond: 70 });
    expect(processContracts(s)).toBe(0);
    p.condition = 90;
    expect(processContracts(s)).toBe(20000);
  });

  it('contrato cumprido até o fim dá reputação', () => {
    const s = cargoGame();
    s.nextCargoOffer = 1e9;
    const p = addTestPlane(s, 'AT7F');
    addTestRoute(s, 'GRU', 'REC', p.id, { freq: 1, kind: 'cargo' });
    contract(s, { tons: 2, days: 1 });
    s.day++;
    const rep = s.reputation;
    processContracts(s);
    expect(s.contracts).toHaveLength(0);
    expect(s.reputation).toBeGreaterThan(rep);
  });
});

describe('save v10', () => {
  it('rotas antigas viram de passageiros e ganham contratos vazios', () => {
    const s = makeGame();
    addTestRoute(s, 'BSB', 'GRU', null);
    tick(s, { noEvents: true });
    const raw = JSON.parse(JSON.stringify({ ...s, v: 9 }));
    delete raw.routes[0].kind;
    delete raw.contracts;
    delete raw.cargoOffer;
    delete raw.nextCargoOffer;
    delete raw.lastDay.cargo;
    const g = migrate(raw)!;
    expect(g.routes[0]!.kind).toBe('pax');
    expect(g.contracts).toEqual([]);
    expect(g.cargoOffer).toBeNull();
    expect(g.lastDay!.cargo).toBe(0);
  });
});
