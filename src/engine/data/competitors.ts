// Concorrentes fictícios. A força total da concorrência numa rota continua sendo Route.ai;
// os concorrentes dividem essa força entre si (pesos que somam 1), conforme a personalidade.
import type { Airport } from '../types';

export type RivalId = 'horizonte' | 'aerovia' | 'ipe' | 'sabia' | 'atlantica' | 'rotanorte';

export interface Competitor {
  id: RivalId;
  name: string;
  /** perfil curto mostrado na interface */
  style: string;
  /** peso inicial na divisão da rota */
  weight: number;
  /** se opera o par de aeroportos */
  serves: (a: Airport, b: Airport, intl: boolean) => boolean;
}

export const COMPETITORS: Record<RivalId, Competitor> = {
  horizonte: {
    id: 'horizonte',
    name: 'Horizonte',
    style: 'Tradicional, malha nacional',
    weight: 1,
    serves: (_a, _b, intl) => !intl,
  },
  aerovia: {
    id: 'aerovia',
    name: 'Aerovia',
    style: 'Low-cost: cresce quando sua tarifa sobe',
    weight: 0.8,
    serves: (a, b, intl) => !intl && Math.min(a.size, b.size) >= 5,
  },
  ipe: {
    id: 'ipe',
    name: 'Ipê Linhas Aéreas',
    style: 'Premium: cresce quando seu serviço é básico',
    weight: 0.6,
    serves: (a, b) => Math.max(a.size, b.size) >= 8,
  },
  sabia: {
    id: 'sabia',
    name: 'Sabiá Regional',
    style: 'Regional: cresce quando você voa pouco',
    weight: 0.7,
    serves: (a, b, intl) => !intl && Math.min(a.size, b.size) <= 6,
  },
  atlantica: {
    id: 'atlantica',
    name: 'Atlântica',
    style: 'Internacional, voos longos',
    weight: 1,
    serves: (_a, _b, intl) => intl,
  },
  rotanorte: {
    id: 'rotanorte',
    name: 'Rota Norte Cargo',
    style: 'Carga aérea, malha nacional',
    weight: 1,
    // só nas rotas de carga (cargoRivals), nunca nas de passageiros
    serves: () => false,
  },
};

export const MAX_RIVALS_PER_ROUTE = 3;
