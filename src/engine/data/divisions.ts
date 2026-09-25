import type { DivisionId, LicenseTier } from '../types';

export interface Division {
  id: DivisionId;
  name: string;
  /** custo de abertura */
  cost: number;
  /** licença mínima */
  license: LicenseTier;
  desc: string;
  /** ainda não disponível nesta versão */
  soon?: boolean;
}

export const DIVISIONS: Record<DivisionId, Division> = {
  internacional: {
    id: 'internacional',
    name: 'Base internacional',
    cost: 60e6,
    license: 2,
    desc: 'Hubs no exterior com slots pela metade, codeshare com uma parceira estrangeira.',
  },
  cargas: {
    id: 'cargas',
    name: 'Cargas',
    cost: 8e6,
    license: 0,
    desc: 'Cargueiros e rotas de carga, com demanda em toneladas e contratos com clientes.',
  },
};

export const DIVISION_IDS = Object.keys(DIVISIONS) as DivisionId[];
