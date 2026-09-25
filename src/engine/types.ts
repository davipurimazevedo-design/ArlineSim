// Tipos do motor. O GameState é 100% serializável em JSON.

// prettier-ignore
export type AirportCode =
  | 'GRU' | 'GIG' | 'BSB' | 'CNF' | 'SSA' | 'REC' | 'FOR' | 'POA' | 'CWB' | 'VCP' | 'FLN' | 'MAO'
  | 'GYN' | 'BEL' | 'SLZ' | 'NAT' | 'CGB' | 'THE' | 'EZE' | 'SCL' | 'LIM' | 'MIA' | 'JFK' | 'LIS'
  | 'MAD' | 'CDG' | 'CJZ' | 'VDC' | 'JTC' | 'AQA' | 'AJU' | 'AFL' | 'ARU' | 'AAX' | 'BVB' | 'CAC'
  | 'CFB' | 'CGR' | 'XAP' | 'CKS' | 'CLV' | 'CAW' | 'CMG' | 'CXJ' | 'CZS' | 'BYO' | 'PPB' | 'IGU'
  | 'FEN' | 'GVR' | 'ATM' | 'ITB' | 'IOS' | 'IPN' | 'IMP' | 'JJG' | 'JJD' | 'JDF' | 'JPR' | 'JPA'
  | 'JDO' | 'JOI' | 'CPV' | 'LEC' | 'LAJ' | 'LDB' | 'MAB' | 'MGF' | 'MOC' | 'MII' | 'MCZ' | 'MCP'
  | 'MVF' | 'MNX' | 'NVT' | 'GEL' | 'PHB' | 'PFB' | 'PGZ' | 'PMW' | 'PET' | 'PNZ' | 'PTO' | 'PMG'
  | 'BPS' | 'PVH' | 'RBR' | 'ROO' | 'SDU' | 'RAO' | 'OPS' | 'SJK' | 'RIA' | 'STM' | 'SMT' | 'CGH'
  | 'SJP' | 'TMT' | 'UNA' | 'TOW' | 'TFF' | 'TJL' | 'TBT' | 'TUR' | 'SJL' | 'PAV' | 'URG' | 'UDI'
  | 'UBA' | 'BVH' | 'VIX' | 'IZA' | 'SOD' | 'BRA' | 'JPE' | 'GUZ' | 'SET' | 'CAU' | 'OPP' | 'VAL'
  | 'BVS' | 'GGF' | 'PYT' | 'CEL' | 'FBE' | 'GGJ' | 'OAL' | 'UMU' | 'UVI' | 'SRA' | 'BAZ' | 'RBB'
  | 'CAF' | 'AUX' | 'LBR' | 'IRZ' | 'TGQ' | 'BOG' | 'PTY' | 'MVD' | 'ASU' | 'MCO' | 'LHR' | 'FRA'
  | 'FCO';

export interface Airport {
  city: string;
  /** UF (Brasil) ou nome do país (exterior) */
  uf: string;
  lat: number;
  lon: number;
  /** porte 1–10 */
  size: number;
  intl: boolean;
  /** pista mais longa, em metros */
  runway: number;
  /** a pista é pavimentada */
  paved: boolean;
}

// prettier-ignore
export type ModelKey =
  | 'AT7' | 'E295' | 'A20N' | 'B38M' | 'A339'
  | 'C208' | 'PC12' | 'DHC6' | 'C408' | 'L410' | 'AT4' | 'E175'
  | 'C208F' | 'C408F' | 'AT7F' | 'B73F' | 'B763F';
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
  /** pista mínima em operação normal de etapa curta, em metros */
  minRunway: number;
  /** opera em pista não pavimentada */
  unpaved: boolean;
  /** cargueiro: capacidade em toneladas (y e j ficam 0) */
  cargo?: number;
  /** base do custo de manutenção quando difere do preço (avião convertido e antigo, que custa pouco e gasta muito) */
  maintBase?: number;
  /** carga no porão por voo e sentido, em toneladas (rotas de passageiros com a divisão Cargas) */
  belly?: number;
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

/** fare: multiplica as tarifas cobradas (as definidas pelo jogador não mudam); cargo: demanda das rotas de carga */
export type ModType = 'fuel' | 'demand' | 'salary' | 'share' | 'halt' | 'wear' | 'fare' | 'cargo';

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
  /** índice do layout de cabine (data/cabins.ts); 0 = de fábrica */
  cabin: number;
  hours: number;
  /** dia em que entrou na frota */
  since: number;
  /** dia de fabricação (negativo para usados fabricados antes do começo do jogo) */
  built: number;
  /** leasing diário próprio (arrendamento de usado); sem ele, vale o do modelo */
  lease?: number;
  /** financiamento em aberto (só em aeronave própria) */
  loan?: PlaneLoan;
}

export interface PlaneLoan {
  /** saldo devedor */
  balance: number;
  /** parcela diária fixa */
  payment: number;
  /** parcelas restantes */
  left: number;
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

/** Concorrente presente numa rota, com o peso dele na força total (Route.ai). */
export interface RouteRival {
  id: string;
  /** pesos da rota somam 1 */
  w: number;
}

/** Aeronave escalada numa rota, com a própria frequência. */
export interface RoutePlane {
  id: string;
  /** idas e voltas por dia desta aeronave */
  freq: number;
}

/** rota de passageiros ou de carga (divisão Cargas) */
export type RouteKind = 'pax' | 'cargo';

export interface Route {
  id: string;
  kind: RouteKind;
  from: AirportCode;
  to: AirportCode;
  dist: number;
  /** aeronaves escaladas (capacidade e frequência somam) */
  planes: RoutePlane[];
  /** tarifa da econômica; na rota de carga, R$ por tonelada */
  price: number;
  priceJ: number;
  service: ServiceLevel;
  /** força total da concorrência na rota */
  ai: number;
  /** concorrentes presentes e como dividem a força total */
  rivals: RouteRival[];
  opened: number;
  last: RouteLast | null;
}

export interface DayReport {
  day: number;
  rev: number;
  fuel: number;
  crew: number;
  lease: number;
  /** parcelas de aeronaves financiadas */
  loans: number;
  /** receita de carga (fretes) */
  cargo: number;
  /** receita fixa dos contratos de carga */
  contracts: number;
  /** toneladas transportadas */
  tons: number;
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

export type BusinessModelId = 'tradicional' | 'lowcost' | 'regional' | 'pequeno';
export type DivisionId = 'cargas' | 'internacional';

export interface GameState {
  /** versão do save */
  v: number;
  /** modelo de negócio escolhido na fundação (Fase 3) */
  businessModel: BusinessModelId;
  /** divisões compradas depois (Fase 3) */
  divisions: DivisionId[];
  /** hubs da companhia; o primeiro é o da fundação */
  hubs: AirportCode[];
  /** estado do RNG (uint32) */
  seed: number;
  name: string;
  hub: AirportCode;
  day: number;
  cash: number;
  debt: number;
  reputation: number;
  fuelIdx: number;
  /** câmbio do dólar (1 = neutro); anda depois da licença Internacional */
  fxIdx: number;
  /** acordo de codeshare com a parceira estrangeira (divisão Base internacional) */
  codeshare: boolean;
  /** contratos de carga em vigor */
  contracts: CargoContract[];
  /** aviões usados à venda (lista renovada a cada 30 dias) */
  usedMarket: UsedOffer[];
  /** dia da próxima lista de usados */
  nextUsedMarket: number;
  /** proposta de contrato aguardando resposta */
  cargoOffer: CargoContract | null;
  /** dia da próxima proposta de contrato (divisão Cargas) */
  nextCargoOffer: number;
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
  /** marcas de escolhas passadas (cadeias de eventos): nome → dia */
  flags: Record<string, number>;
  /** objetivos cumpridos: id → dia */
  achievements: Record<string, number>;
  lastDay: DayReport | null;
  speed: Speed;
  savedAt: number;
  gameOver: boolean;
}

/** Avião usado à venda no Mercado. */
export interface UsedOffer {
  id: string;
  model: ModelKey;
  /** dia de fabricação */
  built: number;
  condition: number;
  price: number;
  /** leasing diário do usado */
  lease: number;
}

/** Contrato de carga: receita fixa por dia enquanto houver capacidade no par. */
export interface CargoContract {
  id: string;
  /** cliente (data/cargoClients.ts) */
  client: string;
  from: AirportCode;
  to: AirportCode;
  /** capacidade exigida, t/dia num sentido */
  tons: number;
  /** pagamento fixo, R$/dia */
  pay: number;
  /** duração em dias */
  days: number;
  /** dia do aceite (0 enquanto é proposta) */
  start: number;
  /** último dia para aceitar a proposta */
  expires: number;
  /** dias seguidos sem cumprir */
  miss: number;
  /** condição média mínima dos cargueiros no par */
  minCond: number;
}

export interface SimResult {
  id: string;
  pax: number;
  /** toneladas transportadas (rota de carga ou porão) */
  tons: number;
  /** parte da receita que é frete (rota de carga inteira; porão numa rota de passageiros) */
  cargoRev: number;
  paxJ: number;
  rev: number;
  fuel: number;
  crew: number;
  fees: number;
  svc: number;
  share: number;
  lf: number;
  flying: boolean;
  /** horas de voo somadas */
  hours: number;
  /** horas de voo por aeronave (id → h) */
  planeHours: Record<string, number>;
  /** frequência total das aeronaves que voaram */
  freq: number;
  /** multiplicador da demanda por rotas próprias que disputam os mesmos passageiros (1 = nenhuma) */
  overlap: number;
  reason: string;
}

export type FxKey = 'cash' | 'rep' | 'fleet' | 'ops';
export type Fx = Partial<Record<FxKey, 1 | -1>>;

// prettier-ignore
export type EventIcon =
  | 'strike' | 'fuel' | 'ash' | 'phone' | 'sun' | 'clip'
  | 'tag' | 'bird' | 'star' | 'bug' | 'ball' | 'key'
  | 'mask' | 'family' | 'gift' | 'handshake' | 'trophy' | 'siren'
  | 'lock' | 'search' | 'gavel' | 'wave' | 'app' | 'cone'
  | 'tower' | 'engine' | 'pilot' | 'dollar' | 'arrival' | 'rain';

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
  /** texto que depende do estado (por exemplo, o nome de uma cidade); sem ele, vale `text` */
  textFor?: (s: GameState) => string;
  need?: (s: GameState) => boolean;
  /** evento sazonal: só elegível entre estes dias do ano (1–365, inclusive) */
  window?: [number, number];
  /** dias mínimos até se repetir (padrão: EVENT_COOLDOWN; sazonais: SEASONAL_COOLDOWN) */
  cooldown?: number;
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
