// Modelos de negócio (Fase 3): escolhidos na fundação, mudam regras do motor via rules(s).
import { SMALL_FREIGHTERS, SMALL_MODELS } from './aircraft';
import type { Airport, BusinessModelId, LicenseTier, ModelKey, ServiceLevel } from '../types';

export type { BusinessModelId };

export interface Rules {
  /** multiplica os assentos de econômica */
  seatFactor: number;
  /** multiplica a estrutura diária */
  overheadFactor: number;
  /** horas de utilização a mais por dia (giro rápido) */
  utilBonus: number;
  /** expoente da sensibilidade a preço (protótipo: 2,2) */
  elasticity: number;
  /** serviços de bordo permitidos; o primeiro é o padrão de rota nova */
  services: ServiceLevel[];
  /** teto de reputação */
  repCap: number;
  /** aeronaves de passageiros que o modelo opera (null = todas, conforme a licença) */
  models: ModelKey[] | null;
  /** cargueiros que o modelo opera, com a divisão Cargas (null = todos, conforme a licença) */
  freighters: ModelKey[] | null;
  /** cabines com executiva permitidas */
  allowJ: boolean;
  /** licença mais alta que o modelo pode obter */
  maxLicense: LicenseTier;
  /** endurecimento da IA a cada reação (padrão 0,06) */
  aiStep: number;
  slotCostFactor: (a: Airport) => number;
  slotFeeFactor: (a: Airport) => number;
  /** multiplicador de demanda do par */
  demandFactor: (a: Airport, b: Airport) => number;
}

export interface BusinessModel {
  id: BusinessModelId;
  name: string;
  tagline: string;
  gains: string[];
  losses: string[];
  /** false enquanto o modelo ainda não está no jogo */
  available: boolean;
  rules: Rules;
  /** capital inicial fixo (senão, pela dificuldade do hub) */
  startCash?: number;
  /** porte mínimo do aeroporto para ser hub na fundação (padrão 3) */
  hubMinSize?: number;
  /** regras depois da certificação regional (só Pequeno porte) */
  evolved?: Rules;
}

const NEUTRAL: Rules = {
  seatFactor: 1,
  overheadFactor: 1,
  utilBonus: 0,
  elasticity: 2.2,
  services: [1, 0, 2],
  repCap: 100,
  models: null,
  freighters: null,
  allowJ: true,
  maxLicense: 2,
  aiStep: 0.06,
  slotCostFactor: () => 1,
  slotFeeFactor: () => 1,
  demandFactor: () => 1,
};

/** aeroporto pequeno/médio no modelo regional */
const REGIONAL_SIZE = 6;
/** aeroporto grande no modelo regional */
const BIG_SIZE = 9;

export const BUSINESS_MODELS: Record<BusinessModelId, BusinessModel> = {
  tradicional: {
    id: 'tradicional',
    name: 'Tradicional',
    tagline: 'Equilíbrio entre preço, serviço e malha.',
    gains: ['Todas as aeronaves e licenças', 'Todos os níveis de serviço e classe executiva'],
    losses: ['Nenhuma vantagem específica'],
    available: true,
    rules: NEUTRAL,
  },
  lowcost: {
    id: 'lowcost',
    name: 'Low-cost',
    tagline: 'Tarifa baixa, avião cheio e custo enxuto.',
    gains: [
      'Cabine densa: +10% de assentos',
      'Estrutura 30% mais barata',
      'Giro rápido: +1 h de voo por dia',
      'Demanda responde mais a tarifa baixa',
    ],
    losses: [
      'Serviço de bordo só Básico',
      'Sem executiva e sem widebody',
      'Reputação com teto de 70',
      'Concorrência reage mais rápido',
    ],
    available: true,
    rules: {
      ...NEUTRAL,
      seatFactor: 1.1,
      overheadFactor: 0.7,
      utilBonus: 1,
      elasticity: 2.8,
      services: [0],
      repCap: 70,
      models: ['AT7', 'E295', 'A20N', 'B38M'],
      allowJ: false,
      aiStep: 0.09,
    },
  },
  regional: {
    id: 'regional',
    name: 'Regional',
    tagline: 'Cidades médias e pequenas, onde os grandes não chegam.',
    gains: [
      'Slots e taxas 20% mais baratos em aeroportos de porte ≤ 6',
      '+5% de demanda em rotas que tocam esses aeroportos',
    ],
    losses: [
      'Slots e taxas 25% mais caros em aeroportos de porte ≥ 9',
      'Só turboélices e jatos regionais (sem A320/737/A330)',
      'Sem licença Internacional',
    ],
    available: true,
    rules: {
      ...NEUTRAL,
      models: ['AT7', 'AT4', 'E295', 'E175'],
      maxLicense: 1,
      slotCostFactor: (a) => (a.size <= REGIONAL_SIZE ? 0.8 : a.size >= BIG_SIZE ? 1.25 : 1),
      slotFeeFactor: (a) => (a.size <= REGIONAL_SIZE ? 0.8 : a.size >= BIG_SIZE ? 1.25 : 1),
      demandFactor: (a, b) => (Math.min(a.size, b.size) <= REGIONAL_SIZE ? 1.05 : 1),
    },
  },
  pequeno: {
    id: 'pequeno',
    name: 'Pequeno porte',
    tagline: 'Começar de baixo, com aviões pequenos e destinos remotos.',
    gains: [
      'Hub em qualquer cidade, inclusive as pequenas',
      'Aviões baratos que pousam em pista curta e de terra',
      'Estrutura 80% mais barata e slots a 25% (até a certificação)',
      'Evolui para o regional com a certificação',
    ],
    losses: [
      'Capital inicial de R$ 5 mi',
      'Só aviões de até 19 lugares até a certificação regional',
      'Nacional e Internacional só depois da certificação',
    ],
    available: true,
    startCash: 5e6,
    hubMinSize: 1,
    // estrutura de táxi aéreo: bem menor que a de uma companhia regular
    rules: {
      ...NEUTRAL,
      models: SMALL_MODELS,
      freighters: SMALL_FREIGHTERS,
      maxLicense: 0,
      overheadFactor: 0.2,
      // taxas aeroportuárias reais são por pouso e peso: avião leve paga uma fração
      slotCostFactor: () => 0.25,
      slotFeeFactor: () => 0.25,
    },
    evolved: NEUTRAL,
  },
};

export const BUSINESS_MODEL_IDS = Object.keys(BUSINESS_MODELS) as BusinessModelId[];

/** Custo da certificação regional do Pequeno porte (libera ATR e o caminho das licenças). */
export const REGIONAL_CERT_COST = 10e6;
