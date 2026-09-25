// Clientes fictícios dos contratos de carga (divisão Cargas).
import type { AirportCode } from '../types';

export interface CargoClient {
  id: string;
  name: string;
  /** o que transporta, mostrado na proposta */
  what: string;
  /** faixa de toneladas por dia exigidas */
  tons: [number, number];
  /** multiplica o pagamento */
  payFactor: number;
  /** origens fixas (senão, qualquer aeroporto que cumpra os portes) */
  origins?: AirportCode[];
  /** porte mínimo das duas pontas (se não houver origem fixa) */
  minSize: number;
  /** porte mínimo do destino */
  destMinSize: number;
  /** cliente de cidade remota: uma ponta de porte ≤ 3 */
  remote?: boolean;
  /** condição média mínima dos cargueiros (0 = sem exigência) */
  minCond: number;
}

export const CARGO_CLIENTS: CargoClient[] = [
  {
    id: 'malote',
    name: 'Malote Nacional',
    what: 'malotes e correspondência',
    tons: [2, 6],
    payFactor: 1,
    minSize: 5,
    destMinSize: 5,
    minCond: 0,
  },
  {
    id: 'compraja',
    name: 'CompraJá',
    what: 'encomendas de comércio eletrônico',
    tons: [3, 10],
    payFactor: 0.9,
    origins: ['GRU', 'VCP', 'CWB', 'CNF', 'GIG'],
    minSize: 0,
    destMinSize: 4,
    minCond: 0,
  },
  {
    id: 'farmavida',
    name: 'Farmavida',
    what: 'remédios e vacinas',
    tons: [1, 4],
    payFactor: 1.5,
    minSize: 6,
    destMinSize: 4,
    minCond: 70,
  },
  {
    id: 'polo',
    name: 'Polo Eletrônico',
    what: 'eletrônicos da Zona Franca',
    tons: [5, 15],
    payFactor: 1.1,
    origins: ['MAO'],
    minSize: 0,
    destMinSize: 6,
    minCond: 0,
  },
  {
    id: 'frutas',
    name: 'Frutas do Vale',
    what: 'frutas frescas do São Francisco',
    tons: [2, 8],
    payFactor: 1,
    origins: ['PNZ'],
    minSize: 0,
    destMinSize: 7,
    minCond: 0,
  },
  {
    id: 'ribeirinha',
    name: 'Rede Ribeirinha',
    what: 'mantimentos e encomendas para cidades isoladas',
    tons: [0.5, 2],
    payFactor: 1.3,
    minSize: 0,
    destMinSize: 1,
    remote: true,
    minCond: 0,
  },
];

export const CARGO_CLIENTS_BY_ID: Record<string, CargoClient> = Object.fromEntries(
  CARGO_CLIENTS.map((c) => [c.id, c]),
);
