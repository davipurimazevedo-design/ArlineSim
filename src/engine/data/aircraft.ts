import type { AircraftModel, ModelKey } from '../types';

// prettier-ignore
export const MODELS: Record<ModelKey, AircraftModel> = {
  AT7: { name: 'ATR 72-600', kind: 'Turboélice', tier: 0, y: 70, j: 0, range: 1500, speed: 500, fuelKm: 7, crewH: 1800, lease: 28000, price: 55e6, wearH: 0.08, util: 15 },
  E295: { name: 'Embraer E195-E2', kind: 'Jato regional', tier: 1, y: 132, j: 0, range: 4800, speed: 830, fuelKm: 11, crewH: 3000, lease: 52000, price: 105e6, wearH: 0.07, util: 16 },
  A20N: { name: 'Airbus A320neo', kind: 'Narrowbody', tier: 1, y: 174, j: 0, range: 6300, speed: 840, fuelKm: 13, crewH: 3600, lease: 68000, price: 145e6, wearH: 0.065, util: 17 },
  B38M: { name: 'Boeing 737 MAX 8', kind: 'Narrowbody', tier: 1, y: 186, j: 0, range: 6500, speed: 840, fuelKm: 13.5, crewH: 3800, lease: 72000, price: 152e6, wearH: 0.065, util: 17 },
  A339: { name: 'Airbus A330-900', kind: 'Widebody', tier: 2, y: 257, j: 30, range: 13300, speed: 870, fuelKm: 27, crewH: 8500, lease: 175000, price: 420e6, wearH: 0.05, util: 22 },
};

export const MODEL_KEYS = Object.keys(MODELS) as ModelKey[];

export const MAX_RANGE = Math.max(...MODEL_KEYS.map((k) => MODELS[k].range));
