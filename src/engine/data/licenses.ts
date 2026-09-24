import type { License } from '../types';

export const LICENSES: readonly [License, License, License] = [
  { tier: 0, name: 'Regional', desc: 'Turboélices, rotas até 1.500 km', cost: 0 },
  { tier: 1, name: 'Nacional', desc: 'Jatos em qualquer rota doméstica', cost: 25e6 },
  {
    tier: 2,
    name: 'Internacional',
    desc: 'Destinos no exterior, widebodies e classe executiva',
    cost: 120e6,
  },
];

/** alcance máximo de rota com licença regional */
export const REGIONAL_MAX_KM = 1500;
