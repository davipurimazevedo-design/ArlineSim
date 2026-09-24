import type { ModelKey } from '../types';

export interface CabinLayout {
  y: number;
  j: number;
}

/**
 * Layouts de cabine dos narrowbodies, liberados com a licença internacional.
 * Cada assento executivo ocupa o espaço de 3 econômicos. O índice 0 é o de fábrica.
 * Modelos fora desta tabela têm só a cabine de fábrica.
 */
export const CABINS: Partial<Record<ModelKey, CabinLayout[]>> = {
  A20N: [
    { y: 174, j: 0 },
    { y: 138, j: 12 },
    { y: 102, j: 24 },
  ],
  B38M: [
    { y: 186, j: 0 },
    { y: 150, j: 12 },
    { y: 114, j: 24 },
  ],
};

export const CABIN_CHANGE_COST = 1.5e6;
export const CABIN_CHANGE_DAYS = 5;

export function cabinLabel(c: CabinLayout): string {
  return c.j ? `${c.j}J + ${c.y}Y` : `${c.y}Y`;
}
