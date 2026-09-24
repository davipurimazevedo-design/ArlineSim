import type { Airport, AirportCode } from '../types';

// A ordem de inserção importa: o evento "slotbarato" desempata pelo primeiro da lista.
export const AIRPORTS: Record<AirportCode, Airport> = {
  GRU: { city: 'São Paulo', lat: -23.43, lon: -46.47, size: 10, intl: false },
  GIG: { city: 'Rio de Janeiro', lat: -22.81, lon: -43.25, size: 9, intl: false },
  BSB: { city: 'Brasília', lat: -15.87, lon: -47.92, size: 8, intl: false },
  CNF: { city: 'Belo Horizonte', lat: -19.63, lon: -43.97, size: 7, intl: false },
  SSA: { city: 'Salvador', lat: -12.91, lon: -38.33, size: 7, intl: false },
  REC: { city: 'Recife', lat: -8.13, lon: -34.92, size: 7, intl: false },
  FOR: { city: 'Fortaleza', lat: -3.78, lon: -38.53, size: 7, intl: false },
  POA: { city: 'Porto Alegre', lat: -29.99, lon: -51.17, size: 7, intl: false },
  CWB: { city: 'Curitiba', lat: -25.53, lon: -49.18, size: 6, intl: false },
  VCP: { city: 'Campinas', lat: -23.01, lon: -47.13, size: 6, intl: false },
  FLN: { city: 'Florianópolis', lat: -27.67, lon: -48.55, size: 6, intl: false },
  MAO: { city: 'Manaus', lat: -3.04, lon: -60.05, size: 6, intl: false },
  GYN: { city: 'Goiânia', lat: -16.63, lon: -49.22, size: 5, intl: false },
  BEL: { city: 'Belém', lat: -1.38, lon: -48.48, size: 5, intl: false },
  SLZ: { city: 'São Luís', lat: -2.59, lon: -44.24, size: 4, intl: false },
  NAT: { city: 'Natal', lat: -5.77, lon: -35.37, size: 4, intl: false },
  CGB: { city: 'Cuiabá', lat: -15.65, lon: -56.12, size: 4, intl: false },
  THE: { city: 'Teresina', lat: -5.06, lon: -42.82, size: 3, intl: false },
  EZE: { city: 'Buenos Aires', lat: -34.82, lon: -58.54, size: 8, intl: true },
  SCL: { city: 'Santiago', lat: -33.39, lon: -70.79, size: 7, intl: true },
  LIM: { city: 'Lima', lat: -12.02, lon: -77.11, size: 7, intl: true },
  MIA: { city: 'Miami', lat: 25.79, lon: -80.29, size: 9, intl: true },
  JFK: { city: 'Nova York', lat: 40.64, lon: -73.78, size: 10, intl: true },
  LIS: { city: 'Lisboa', lat: 38.77, lon: -9.13, size: 8, intl: true },
  MAD: { city: 'Madri', lat: 40.47, lon: -3.56, size: 8, intl: true },
  CDG: { city: 'Paris', lat: 49.01, lon: 2.55, size: 10, intl: true },
};

export const AIRPORT_CODES = Object.keys(AIRPORTS) as AirportCode[];

export const HUBS: AirportCode[] = ['BSB', 'GRU', 'GIG', 'CNF', 'REC', 'SLZ'];

export type Difficulty = 'Fácil' | 'Médio' | 'Difícil';

export function hubDifficulty(code: AirportCode): Difficulty {
  const s = AIRPORTS[code].size;
  return s >= 9 ? 'Fácil' : s >= 7 ? 'Médio' : 'Difícil';
}
