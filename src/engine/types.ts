// Tipos do motor. O GameState é 100% serializável em JSON.

// prettier-ignore
export type AirportCode =
  | 'GRU' | 'GIG' | 'BSB' | 'CNF' | 'SSA' | 'REC' | 'FOR' | 'POA' | 'CWB'
  | 'VCP' | 'FLN' | 'MAO' | 'GYN' | 'BEL' | 'SLZ' | 'NAT' | 'CGB' | 'THE'
  | 'EZE' | 'SCL' | 'LIM' | 'MIA' | 'JFK' | 'LIS' | 'MAD' | 'CDG';

export interface Airport {
  city: string;
  lat: number;
  lon: number;
  /** porte 1–10 */
  size: number;
  intl: boolean;
}

export type ModelKey = 'AT7' | 'E295' | 'A20N' | 'B38M' | 'A339';
export type LicenseTier = 0 | 1 | 2;
export type ServiceLevel = 0 | 1 | 2;

export interface AircraftModel {
  name: string;
  kind: string;
  tier: LicenseTier;
  /** assentos econômica */
  y: number;
  /** assentos executiva */
  j: number;
  /** km */
  range: number;
  /** km/h */
  speed: number;
  /** R$ por km voado */
  fuelKm: number;
  /** R$ por hora de voo */
  crewH: number;
  /** R$ por dia */
  lease: number;
  price: number;
  /** % de condição perdida por hora de voo */
  wearH: number;
  /** utilização máxima, h/dia */
  util: number;
}

export interface License {
  tier: LicenseTier;
  name: string;
  desc: string;
  cost: number;
}

export interface Service {
  name: string;
  cost: number;
  q: number;
}

export type ModType = 'fuel' | 'demand' | 'salary' | 'share' | 'halt' | 'wear';

export interface Modifier {
  type: ModType;
  value: number;
  /** ativo enquanto until > day */
  until: number;
}

export interface Plane {
  id: string;
  reg: string;
  model: ModelKey;
  owned: boolean;
  /** 0–100 */
  condition: number;
  /** dias restantes de manutenção (0 = operando) */
  maint: number;
  /** se a parada atual devolve a condição a 100 ao terminar (falso na inspeção do evento "passaro") */
  restore: boolean;
  hours: number;
  /** dia em que entrou na frota */
  since: number;
}

export interface RouteLast {
  pax: number;
  paxJ: number;
  share: number;
  lf: number;
  profit: number;
  reason: string;
  flying: boolean;
}

export interface Route {
  id: string;
  from: AirportCode;
  to: AirportCode;
  dist: number;
  planeId: string | null;
  /** idas e voltas por dia */
  freq: number;
  price: number;
  priceJ: number;
  service: ServiceLevel;
  /** força da concorrência na rota */
  ai: number;
  opened: number;
  last: RouteLast | null;
}

export interface DayReport {
  day: number;
  rev: number;
  fuel: number;
  crew: number;
  lease: number;
  fees: number;
  svc: number;
  slots: number;
  overhead: number;
  interest: number;
  maint: number;
  pax: number;
  profit: number;
}

export interface HistoryEntry {
  day: number;
  cash: number;
  profit: number;
  rep: number;
}

export type Tone = 'good' | 'bad' | 'warn' | 'info' | 'event';

export interface LogEntry {
  day: number;
  text: string;
  tone: Tone;
}

export type Speed = 0 | 1 | 2 | 4;

export interface GameState {
  /** versão do save */
  v: number;
  /** estado do RNG (uint32) */
  seed: number;
  name: string;
  hub: AirportCode;
  day: number;
  cash: number;
  debt: number;
  reputation: number;
  fuelIdx: number;
  license: LicenseTier;
  slots: AirportCode[];
  fleet: Plane[];
  routes: Route[];
  mods: Modifier[];
  history: HistoryEntry[];
  log: LogEntry[];
  nextEvent: number;
  pendingEvent: string | null;
  usedEvents: Record<string, number>;
  lastDay: DayReport | null;
  speed: Speed;
  savedAt: number;
  gameOver: boolean;
}

export interface SimResult {
  id: string;
  pax: number;
  paxJ: number;
  rev: number;
  fuel: number;
  crew: number;
  fees: number;
  svc: number;
  share: number;
  lf: number;
  flying: boolean;
  hours: number;
  reason: string;
}

export type FxKey = 'cash' | 'rep' | 'fleet' | 'ops';
export type Fx = Partial<Record<FxKey, 1 | -1>>;

// prettier-ignore
export type EventIcon =
  | 'strike' | 'fuel' | 'ash' | 'phone' | 'sun' | 'clip'
  | 'tag' | 'bird' | 'star' | 'bug' | 'ball' | 'key';

export type Side = 'L' | 'R';

export interface EventOption {
  label: string;
  fx: Fx;
  /** aplica o efeito sobre o estado e devolve o texto do desfecho */
  apply: (s: GameState) => string;
}

export interface GameEvent {
  id: string;
  icon: EventIcon;
  title: string;
  text: string;
  need?: (s: GameState) => boolean;
  L: EventOption;
  R: EventOption;
}

export interface OfflineSummary {
  days: number;
  profit: number;
  rep: number;
  /** segundos reais fora */
  away: number;
}

/** Ação do jogador: null = sucesso; string = mensagem de erro. */
export type ActionResult = string | null;
