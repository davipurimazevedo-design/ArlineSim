// Catálogo de eventos (cartas). O estado guarda só o id; o efeito é resolvido aqui.
import { AIRPORT_CODES, AIRPORTS } from './airports';
import { fmtMoney } from '../format';
import { maintCost, slotAllowed } from '../formulas';
import { slotCostFor } from '../rules';
import { addMod, changeRep, hitFleet, scaleCost, setFlag } from '../helpers';
import { chance } from '../rng';
import { MORE_EVENTS } from './moreEvents';
import type { AirportCode, GameEvent, GameState, Plane } from '../types';

const firstAvailable = (s: GameState): Plane | undefined => s.fleet.find((p) => !p.maint);

function slotCandidates(s: GameState): AirportCode[] {
  return AIRPORT_CODES.filter((c) => !s.slots.includes(c) && slotAllowed(s, c));
}

/** Evento no-op quando o pré-requisito sumiu entre o sorteio e a decisão. */
const NOTHING = 'Nada aconteceu.';

const BASE_EVENTS: GameEvent[] = [
  {
    id: 'greve',
    icon: 'strike',
    title: 'Greve de pilotos',
    text: 'O sindicato exige 15% de reajuste. Sem acordo, ninguém decola amanhã.',
    // o acordo do evento "sindicato" impede nova greve por um ano
    need: (s) => !((s.flags.greve_bloqueio ?? 0) > s.day),
    L: {
      label: 'Ceder ao reajuste',
      fx: { cash: -1 },
      apply: (s) => {
        addMod(s, 'salary', 1.15, 120);
        return 'Acordo fechado. Salários +15% pelos próximos 120 dias.';
      },
    },
    R: {
      label: 'Endurecer',
      fx: { rep: -1, ops: -1 },
      apply: (s) => {
        addMod(s, 'halt', 1, 3);
        changeRep(s, -6);
        setFlag(s, 'greve_dura');
        return 'Três dias de greve. Toda a malha parada.';
      },
    },
  },
  {
    id: 'querosene',
    icon: 'fuel',
    title: 'Querosene dispara',
    text: 'A Petrobras anuncia alta de 25% no QAV a partir de segunda.',
    L: {
      label: 'Travar preço (hedge)',
      fx: { cash: -1 },
      apply: (s) => {
        const c = 250000 * scaleCost(s);
        s.cash -= c;
        addMod(s, 'fuel', 0.9, 45);
        setFlag(s, 'hedge');
        return `Hedge contratado por ${fmtMoney(c)}. Combustível 10% abaixo do mercado por 45 dias.`;
      },
    },
    R: {
      label: 'Absorver a alta',
      fx: { cash: -1 },
      apply: (s) => {
        addMod(s, 'fuel', 1.25, 40);
        return 'Combustível 25% mais caro pelos próximos 40 dias.';
      },
    },
  },
  {
    id: 'cinzas',
    icon: 'ash',
    title: 'Nuvem de cinzas',
    text: 'Um vulcão andino lançou cinzas no espaço aéreo do sul. Os modelos divergem sobre o risco.',
    L: {
      label: 'Cancelar voos',
      fx: { ops: -1, rep: 1 },
      apply: (s) => {
        addMod(s, 'halt', 1, 4);
        changeRep(s, 2);
        return 'Malha suspensa por 4 dias. Passageiros elogiam a prudência.';
      },
    },
    R: {
      label: 'Manter a malha',
      fx: { fleet: -1, rep: -1 },
      apply: (s) => {
        if (chance(s, 0.35)) {
          hitFleet(s, -25);
          changeRep(s, -12);
          return 'Dois motores ingeriram cinzas. Frota -25% de condição, reputação em queda.';
        }
        return 'Os voos passaram ao largo da nuvem. Nada aconteceu.';
      },
    },
  },
  {
    id: 'influencer',
    icon: 'phone',
    title: 'Vídeo viral',
    text: 'Uma influenciadora filmou a poltrona quebrada. 2 milhões de visualizações.',
    L: {
      label: 'Pedir desculpas e dar vouchers',
      fx: { cash: -1, rep: 1 },
      apply: (s) => {
        const c = 80000 * scaleCost(s);
        s.cash -= c;
        changeRep(s, 3);
        return `Resposta rápida bem recebida. Custo: ${fmtMoney(c)}.`;
      },
    },
    R: {
      label: 'Ignorar',
      fx: { rep: -1 },
      apply: (s) => {
        changeRep(s, -7);
        setFlag(s, 'video_ignorado');
        return 'O assunto virou meme. Reputação -7.';
      },
    },
  },
  {
    id: 'feriado',
    icon: 'sun',
    title: 'Feriadão à vista',
    text: 'Procura por passagens explodiu para o feriado prolongado.',
    L: {
      label: 'Subir tarifas',
      fx: { cash: 1, rep: -1 },
      apply: (s) => {
        const c = 150000 * scaleCost(s);
        s.cash += c;
        changeRep(s, -2);
        return `Receita extra de ${fmtMoney(c)}. Alguns clientes reclamaram.`;
      },
    },
    R: {
      label: 'Voos extras',
      fx: { cash: 1, fleet: -1 },
      apply: (s) => {
        addMod(s, 'demand', 1.35, 10);
        hitFleet(s, -5);
        return 'Demanda +35% por 10 dias. Frota trabalhando no limite.';
      },
    },
  },
  {
    id: 'anac',
    icon: 'clip',
    title: 'Fiscalização da ANAC',
    text: 'Inspetores pedem os registros de manutenção de toda a frota.',
    L: {
      label: 'Auditoria completa',
      fx: { cash: -1, fleet: 1 },
      apply: (s) => {
        const c = 120000 * scaleCost(s);
        s.cash -= c;
        hitFleet(s, 10);
        return `Auditoria concluída (${fmtMoney(c)}). Frota +10% de condição.`;
      },
    },
    R: {
      label: 'Pedir prazo',
      fx: { cash: -1, rep: -1 },
      apply: (s) => {
        setFlag(s, 'anac_prazo');
        if (chance(s, 0.45)) {
          const c = 400000 * scaleCost(s);
          s.cash -= c;
          changeRep(s, -5);
          return `Pendências encontradas. Multa de ${fmtMoney(c)}.`;
        }
        return 'Prazo concedido sem pendências.';
      },
    },
  },
  {
    id: 'guerra',
    icon: 'tag',
    title: 'Guerra tarifária',
    text: 'A concorrente anunciou passagens 30% mais baratas nas suas rotas.',
    L: {
      label: 'Acompanhar os preços',
      fx: { cash: -1 },
      apply: (s) => {
        // temporário (no protótipo o corte era permanente e o jogador tinha de reajustar à mão)
        addMod(s, 'fare', 0.85, 30);
        return 'Tarifas 15% menores por 30 dias. Depois voltam ao que você definiu.';
      },
    },
    R: {
      label: 'Apostar no serviço',
      fx: { rep: 1, ops: -1 },
      apply: (s) => {
        addMod(s, 'share', 0.8, 30);
        changeRep(s, 2);
        return 'Você perde passageiros por 30 dias, mas a marca sai fortalecida.';
      },
    },
  },
  {
    id: 'passaro',
    icon: 'bird',
    title: 'Colisão com pássaro',
    text: 'Um urubu atingiu o motor na aproximação. O avião pousou bem, mas há marcas no fan.',
    need: (s) => s.fleet.some((p) => !p.maint),
    L: {
      label: 'Inspeção completa',
      fx: { cash: -1, ops: -1 },
      apply: (s) => {
        const p = firstAvailable(s);
        if (!p) return NOTHING;
        // Corrigido em relação ao protótipo: a inspeção é paga e não restaura a condição.
        const c = maintCost(p);
        s.cash -= c;
        p.maint = 4;
        p.restore = false;
        return `${p.reg} parado 4 dias para inspeção boroscópica (${fmtMoney(c)}).`;
      },
    },
    R: {
      label: 'Inspeção visual e seguir',
      fx: { fleet: -1 },
      apply: (s) => {
        const p = firstAvailable(s);
        if (!p) return NOTHING;
        if (chance(s, 0.4)) {
          p.condition = Math.max(0, p.condition - 35);
          changeRep(s, -4);
          return `Dano interno não detectado. ${p.reg} perdeu 35% de condição.`;
        }
        return 'Tudo certo. O avião seguiu voando.';
      },
    },
  },
  {
    id: 'patrocinio',
    icon: 'star',
    title: 'Proposta de patrocínio',
    text: 'Um clube de futebol quer sua marca na camisa. Contrato de um ano.',
    L: { label: 'Recusar', fx: {}, apply: () => 'Proposta recusada.' },
    R: {
      label: 'Fechar contrato',
      fx: { cash: -1, rep: 1 },
      apply: (s) => {
        const c = 300000 * scaleCost(s);
        s.cash -= c;
        changeRep(s, 6);
        addMod(s, 'demand', 1.08, 90);
        setFlag(s, 'patrocinio');
        return 'Marca na camisa. Reputação +6 e demanda +8% por 90 dias.';
      },
    },
  },
  {
    id: 'sistema',
    icon: 'bug',
    title: 'Pane no sistema de reservas',
    text: 'O site caiu na sexta à noite. A TI estima 12 horas para reparar.',
    L: {
      label: 'Chamar consultoria externa',
      fx: { cash: -1 },
      apply: (s) => {
        const c = 90000 * scaleCost(s);
        s.cash -= c;
        return `Sistema restaurado em 2 horas por ${fmtMoney(c)}.`;
      },
    },
    R: {
      label: 'Esperar a equipe interna',
      fx: { rep: -1, cash: -1 },
      apply: (s) => {
        addMod(s, 'demand', 0.7, 3);
        changeRep(s, -3);
        return 'Vendas 30% menores por 3 dias.';
      },
    },
  },
  {
    id: 'copa',
    icon: 'ball',
    title: 'Final no Brasil',
    text: 'A final da Libertadores será no seu hub. Torcedores procuram voos.',
    L: {
      label: 'Pacotes com desconto',
      fx: { rep: 1 },
      apply: (s) => {
        addMod(s, 'demand', 1.2, 7);
        changeRep(s, 3);
        return 'Demanda +20% por 7 dias e torcida agradecida.';
      },
    },
    R: {
      label: 'Tarifa dinâmica',
      fx: { cash: 1, rep: -1 },
      apply: (s) => {
        const c = 200000 * scaleCost(s);
        s.cash += c;
        changeRep(s, -2);
        return `Lucro extra de ${fmtMoney(c)}.`;
      },
    },
  },
  {
    id: 'slotbarato',
    icon: 'key',
    title: 'Slot à venda',
    text: 'Uma companhia em recuperação judicial oferece seus slots pela metade do preço.',
    need: (s) => slotCandidates(s).length > 0,
    L: { label: 'Dispensar', fx: {}, apply: () => 'Oferta recusada.' },
    R: {
      label: 'Comprar',
      fx: { cash: -1 },
      apply: (s) => {
        // sort estável: empate de porte fica com o primeiro na ordem de AIRPORTS
        const c = slotCandidates(s).sort((a, b) => AIRPORTS[b].size - AIRPORTS[a].size)[0];
        if (!c) return NOTHING;
        const cost = slotCostFor(s, c) / 2;
        if (s.cash < cost) return 'Caixa insuficiente. A oferta foi para um concorrente.';
        s.cash -= cost;
        s.slots.push(c);
        return `Slots em ${AIRPORTS[c].city} por ${fmtMoney(cost)}.`;
      },
    },
  },
];

export const EVENTS: GameEvent[] = [...BASE_EVENTS, ...MORE_EVENTS];

export const EVENTS_BY_ID: Record<string, GameEvent> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
