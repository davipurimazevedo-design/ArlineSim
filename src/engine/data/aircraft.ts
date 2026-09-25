import type { AircraftModel, ModelKey } from '../types';

// Os 5 primeiros vêm do protótipo (leasing dos jatos +30% no balanceamento da Fase 2).
// Os demais entraram na Fase 3 com dados reais convertidos para a escala do jogo (docs/fase3-aeronaves.md).
// belly: carga no porão por voo e sentido, em toneladas (Fase 4, docs/fase4-pendentes.md).
// prettier-ignore
export const MODELS: Record<ModelKey, AircraftModel> = {
  AT7: { name: 'ATR 72-600', kind: 'Turboélice', tier: 0, y: 70, j: 0, range: 1500, speed: 500, fuelKm: 7, crewH: 1800, lease: 28000, price: 55e6, wearH: 0.08, util: 15, minRunway: 1000, unpaved: false, belly: 0.3 },
  E295: { name: 'Embraer E195-E2', kind: 'Jato regional', tier: 1, y: 132, j: 0, range: 4800, speed: 830, fuelKm: 11, crewH: 3000, lease: 68000, price: 105e6, wearH: 0.07, util: 16, minRunway: 1300, unpaved: false, belly: 0.8 },
  A20N: { name: 'Airbus A320neo', kind: 'Narrowbody', tier: 1, y: 174, j: 0, range: 6300, speed: 840, fuelKm: 13, crewH: 3600, lease: 88000, price: 145e6, wearH: 0.065, util: 17, minRunway: 1300, unpaved: false, belly: 1.5 },
  B38M: { name: 'Boeing 737 MAX 8', kind: 'Narrowbody', tier: 1, y: 186, j: 0, range: 6500, speed: 840, fuelKm: 13.5, crewH: 3800, lease: 94000, price: 152e6, wearH: 0.065, util: 17, minRunway: 1300, unpaved: false, belly: 1.5 },
  A339: { name: 'Airbus A330-900', kind: 'Widebody', tier: 2, y: 257, j: 30, range: 13300, speed: 870, fuelKm: 27, crewH: 8500, lease: 230000, price: 420e6, wearH: 0.05, util: 22, minRunway: 2200, unpaved: false, belly: 8 },
  C208: { name: 'Cessna Grand Caravan EX', kind: 'Monomotor turboélice', tier: 0, y: 12, j: 0, range: 1689, speed: 343, fuelKm: 2.7, crewH: 600, lease: 4300, price: 6.4e6, wearH: 0.09, util: 10, minRunway: 700, unpaved: true, belly: 0.1 },
  PC12: { name: 'Pilatus PC-12 NGX', kind: 'Monomotor pressurizado', tier: 0, y: 9, j: 0, range: 3269, speed: 500, fuelKm: 1.65, crewH: 650, lease: 9900, price: 14.7e6, wearH: 0.08, util: 11, minRunway: 800, unpaved: true, belly: 0.1 },
  DHC6: { name: 'DHC-6 Twin Otter 300-G', kind: 'Bimotor de pista curta', tier: 0, y: 19, j: 0, range: 1322, speed: 315, fuelKm: 3.9, crewH: 900, lease: 12300, price: 18.3e6, wearH: 0.09, util: 11, minRunway: 500, unpaved: true, belly: 0.1 },
  C408: { name: 'Cessna SkyCourier', kind: 'Bimotor turboélice', tier: 0, y: 19, j: 0, range: 1704, speed: 389, fuelKm: 4.1, crewH: 900, lease: 12700, price: 18.9e6, wearH: 0.08, util: 12, minRunway: 1100, unpaved: false, belly: 0.1 },
  L410: { name: 'Let L-410 NG', kind: 'Bimotor turboélice', tier: 0, y: 19, j: 0, range: 2630, speed: 417, fuelKm: 3.5, crewH: 900, lease: 10700, price: 15.9e6, wearH: 0.09, util: 12, minRunway: 700, unpaved: true, belly: 0.1 },
  AT4: { name: 'ATR 42-600', kind: 'Turboélice', tier: 0, y: 48, j: 0, range: 1302, speed: 540, fuelKm: 6.4, crewH: 1500, lease: 22500, price: 44e6, wearH: 0.08, util: 15, minRunway: 1000, unpaved: false, belly: 0.3 },
  E175: { name: 'Embraer E175', kind: 'Jato regional', tier: 1, y: 80, j: 0, range: 3151, speed: 800, fuelKm: 10.2, crewH: 2600, lease: 40000, price: 68e6, wearH: 0.07, util: 16, minRunway: 1300, unpaved: false, belly: 0.8 },
  // Cargueiros (divisão Cargas): capacidade em toneladas; docs/fase3-cargas.md
  C208F: { name: 'Cessna Caravan Cargo', kind: 'Cargueiro monomotor', tier: 0, y: 0, j: 0, cargo: 1.4, range: 1300, speed: 343, fuelKm: 2.8, crewH: 500, lease: 4400, price: 6.5e6, wearH: 0.09, util: 11, minRunway: 700, unpaved: true },
  C408F: { name: 'Cessna SkyCourier cargueiro', kind: 'Cargueiro bimotor', tier: 0, y: 0, j: 0, cargo: 3, range: 1400, speed: 389, fuelKm: 4.1, crewH: 800, lease: 12700, price: 18.9e6, wearH: 0.08, util: 12, minRunway: 900, unpaved: false },
  AT7F: { name: 'ATR 72-600F', kind: 'Cargueiro turboélice', tier: 0, y: 0, j: 0, cargo: 9.2, range: 1900, speed: 510, fuelKm: 7, crewH: 1200, lease: 29600, price: 59e6, wearH: 0.08, util: 14, minRunway: 1000, unpaved: false },
  B73F: { name: 'Boeing 737-800BCF', kind: 'Cargueiro narrowbody', tier: 1, y: 0, j: 0, cargo: 24, range: 3700, speed: 840, fuelKm: 13.3, crewH: 2600, lease: 24700, price: 37e6, wearH: 0.075, util: 15, minRunway: 1600, unpaved: false },
  B763F: { name: 'Boeing 767-300F', kind: 'Cargueiro widebody', tier: 2, y: 0, j: 0, cargo: 57, range: 7000, speed: 850, fuelKm: 28, crewH: 5000, lease: 14800, price: 12e6, maintBase: 60e6, wearH: 0.09, util: 18, minRunway: 2200, unpaved: false },
};

/** Aeronaves de pequeno porte (licença Táxi aéreo). */
export const SMALL_MODELS: ModelKey[] = ['C208', 'PC12', 'DHC6', 'C408', 'L410'];

/** Cargueiros (só voam rota de carga). */
export const FREIGHTERS: ModelKey[] = ['C208F', 'C408F', 'AT7F', 'B73F', 'B763F'];
/** Cargueiros de pequeno porte (licença Táxi aéreo). */
export const SMALL_FREIGHTERS: ModelKey[] = ['C208F', 'C408F'];

export function isFreighter(model: ModelKey): boolean {
  return (MODELS[model].cargo ?? 0) > 0;
}

export const MODEL_KEYS = Object.keys(MODELS) as ModelKey[];

export const MAX_RANGE = Math.max(...MODEL_KEYS.map((k) => MODELS[k].range));
