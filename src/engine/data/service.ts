import type { Service } from '../types';

export const SERVICE: readonly [Service, Service, Service] = [
  { name: 'Básico', cost: 6, q: -0.12 },
  { name: 'Padrão', cost: 20, q: 0 },
  { name: 'Premium', cost: 45, q: 0.14 },
];

/** passageiro da executiva custa este múltiplo do serviço */
export const SERVICE_J_MULT = 4;
