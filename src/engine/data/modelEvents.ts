// Eventos da Fase 3: por modelo de negócio e por divisão (textos aprovados em docs/fase3-eventos.md).
// Cada um só sai para a companhia com aquele modelo ou divisão.
import { AIRPORT_CODES, AIRPORTS } from './airports';
import { hasCargoDivision } from '../cargo';
import { fmtMoney } from '../format';
import { clamp, dist, isIntlPair } from '../formulas';
import { addMod, changeRep, hitFleet, scaleCost } from '../helpers';
import { FX_MAX, FX_MIN, hasIntlDivision } from '../international';
import { chance } from '../rng';
import type { AirportCode, BusinessModelId, GameEvent, GameState } from '../types';

const flying = (s: GameState) => s.routes.filter((r) => r.planes.length > 0);
const hasRoutes = (s: GameState) => flying(s).length > 0;
const isModel = (s: GameState, m: BusinessModelId) => s.businessModel === m && hasRoutes(s);
const cargoFlying = (s: GameState) => hasCargoDivision(s) && flying(s).some((r) => r.kind === 'cargo');
const intlFlying = (s: GameState) => hasIntlDivision(s) && flying(s).some((r) => isIntlPair(r.from, r.to));

const pay = (s: GameState, perPlane: number) => {
  const c = perPlane * scaleCost(s);
  s.cash -= c;
  return c;
};
const earn = (s: GameState, perPlane: number) => {
  const c = perPlane * scaleCost(s);
  s.cash += c;
  return c;
};
/** Câmbio multiplicado por f, dentro da faixa. */
const moveFx = (s: GameState, f: number) => {
  s.fxIdx = clamp(s.fxIdx * f, FX_MIN, FX_MAX);
};

/**
 * Aeroporto doméstico sem slot da companhia, de porte entre min e max, o mais perto do hub.
 * Determinístico: o texto da carta e o efeito apontam a mesma cidade.
 */
function nearbyCity(s: GameState, min: number, max: number): AirportCode | undefined {
  return AIRPORT_CODES.filter((c) => {
    const a = AIRPORTS[c];
    return !a.intl && !s.slots.includes(c) && a.size >= min && a.size <= max;
  }).sort((a, b) => dist(s.hub, a) - dist(s.hub, b))[0];
}
const cityName = (c: AirportCode | undefined) => (c ? AIRPORTS[c].city : 'uma cidade vizinha');

/** Slot grátis numa cidade, se ela ainda estiver disponível. */
function freeSlot(s: GameState, c: AirportCode | undefined): boolean {
  if (!c || s.slots.includes(c)) return false;
  s.slots.push(c);
  return true;
}

const SECUNDARIO: [number, number] = [3, 6];
const PREFEITURA: [number, number] = [2, 5];

export const MODEL_EVENTS: GameEvent[] = [
  // ---------- Low-cost ----------
  {
    id: 'bagagem',
    icon: 'gavel',
    title: 'Procon questiona a taxa de bagagem',
    text: 'O Procon abriu processo contra a cobrança de mala despachada. A imprensa quer saber se você recua.',
    need: (s) => isModel(s, 'lowcost'),
    L: {
      label: 'Manter a taxa',
      fx: { cash: 1, rep: -1 },
      apply: (s) => {
        const c = earn(s, 40000);
        changeRep(s, -3);
        return `A taxa fica. Receita de ${fmtMoney(c)} e manchetes azedas.`;
      },
    },
    R: {
      label: 'Liberar uma mala',
      fx: { cash: -1, rep: 1 },
      apply: (s) => {
        pay(s, 30000);
        changeRep(s, 2);
        addMod(s, 'demand', 1.1, 20);
        return 'Mala grátis por um mês. Demanda +10% por 20 dias.';
      },
    },
  },
  {
    id: 'guerratarifa',
    icon: 'tag',
    title: 'Guerra de tarifas',
    text: 'A Aerovia anunciou passagens a partir de R$ 99 nas rotas que vocês disputam.',
    need: (s) => isModel(s, 'lowcost'),
    L: {
      label: 'Cobrir o preço',
      fx: { cash: -1, ops: 1 },
      apply: (s) => {
        addMod(s, 'fare', 0.85, 30);
        addMod(s, 'share', 1.2, 30);
        return 'Tarifas 15% menores e aviões cheios por 30 dias.';
      },
    },
    R: {
      label: 'Não entrar na briga',
      fx: { ops: -1 },
      apply: (s) => {
        addMod(s, 'share', 0.85, 30);
        return 'A Aerovia leva parte dos seus passageiros por 30 dias.';
      },
    },
  },
  {
    id: 'assento',
    icon: 'phone',
    title: 'Vídeo do assento apertado',
    text: 'Um passageiro de 1,95 m filmou os joelhos no encosto da frente. São 4 milhões de visualizações.',
    need: (s) => isModel(s, 'lowcost'),
    L: {
      label: 'Pedir desculpas e dar voucher',
      fx: { cash: -1, rep: 1 },
      apply: (s) => {
        const c = pay(s, 50000);
        changeRep(s, 2);
        return `Voucher entregue e desculpas aceitas. Custo: ${fmtMoney(c)}.`;
      },
    },
    R: {
      label: 'Defender o preço baixo',
      fx: { rep: -1, ops: 1 },
      apply: (s) => {
        changeRep(s, -4);
        addMod(s, 'demand', 1.05, 20);
        return '"É o preço de voar barato." Metade da internet concordou. Demanda +5%.';
      },
    },
  },
  {
    id: 'secundario',
    icon: 'key',
    title: 'Aeroporto secundário quer você',
    text: 'A concessionária de um aeroporto vizinho oferece slots de graça para uma low-cost que traga voos.',
    textFor: (s) =>
      `A concessionária de ${cityName(nearbyCity(s, ...SECUNDARIO))} oferece slots de graça para uma low-cost que traga voos.`,
    need: (s) => isModel(s, 'lowcost') && !!nearbyCity(s, ...SECUNDARIO),
    L: {
      label: 'Aceitar os slots',
      fx: { ops: 1 },
      apply: (s) => {
        const c = nearbyCity(s, ...SECUNDARIO);
        return freeSlot(s, c) ? `Slots em ${cityName(c)} garantidos, sem custo.` : 'Nada aconteceu.';
      },
    },
    R: {
      label: 'Recusar',
      fx: {},
      apply: () => 'A concessionária foi atrás da Aerovia.',
    },
  },

  // ---------- Regional ----------
  {
    id: 'prefeitura',
    icon: 'handshake',
    title: 'Prefeito quer voo',
    text: 'O prefeito de uma cidade vizinha promete divulgação e isenção de taxas se você colocar a cidade no mapa.',
    textFor: (s) =>
      `O prefeito de ${cityName(nearbyCity(s, ...PREFEITURA))} promete divulgação e isenção de taxas se você colocar a cidade no mapa.`,
    need: (s) => isModel(s, 'regional') && !!nearbyCity(s, ...PREFEITURA),
    L: {
      label: 'Aceitar a parceria',
      fx: { ops: 1, rep: 1 },
      apply: (s) => {
        const c = nearbyCity(s, ...PREFEITURA);
        if (!freeSlot(s, c)) return 'Nada aconteceu.';
        changeRep(s, 2);
        return `Faixa na praça e slots em ${cityName(c)} sem custo.`;
      },
    },
    R: {
      label: 'Agradecer e recusar',
      fx: { rep: -1 },
      apply: (s) => {
        changeRep(s, -1);
        return 'O prefeito reclamou na rádio local.';
      },
    },
  },
  {
    id: 'pecas',
    icon: 'engine',
    title: 'Falta peça de turboélice',
    text: 'A fábrica atrasou hélices e peças de motor. Três aviões podem ficar no chão.',
    need: (s) => isModel(s, 'regional'),
    L: {
      label: 'Comprar de terceiros',
      fx: { cash: -1 },
      apply: (s) => {
        const c = pay(s, 60000);
        return `Peças de outra operadora, a preço de ouro. Custo: ${fmtMoney(c)}.`;
      },
    },
    R: {
      label: 'Canibalizar um avião',
      fx: { fleet: -1 },
      apply: (s) => {
        hitFleet(s, -8);
        return 'Peças tiradas de um avião para manter os outros voando. Frota −8.';
      },
    },
  },
  {
    id: 'subsidio',
    icon: 'dollar',
    title: 'Programa de aviação regional',
    text: 'O governo lançou um programa que paga parte do custo de rotas para cidades médias.',
    need: (s) => isModel(s, 'regional'),
    L: {
      label: 'Aderir',
      fx: { cash: 1, rep: 1 },
      apply: (s) => {
        const c = earn(s, 80000);
        changeRep(s, 2);
        addMod(s, 'demand', 0.95, 60);
        return `Subsídio de ${fmtMoney(c)}. Em troca, tarifa tabelada: demanda −5% por 60 dias.`;
      },
    },
    R: {
      label: 'Ficar de fora',
      fx: {},
      apply: () => 'Sem papelada e sem subsídio.',
    },
  },
  {
    id: 'neblina',
    icon: 'tower',
    title: 'Neblina no interior',
    text: 'Uma semana de neblina fechou aeroportos sem ILS no interior. Os voos das cidades pequenas estão atrasando.',
    need: (s) => isModel(s, 'regional'),
    L: {
      label: 'Cancelar quando fechar',
      fx: { ops: -1, rep: 1 },
      apply: (s) => {
        addMod(s, 'demand', 0.85, 7);
        changeRep(s, 1);
        return 'Cancelamentos avisados com antecedência. Demanda −15% por 7 dias.';
      },
    },
    R: {
      label: 'Esperar a janela',
      fx: { fleet: -1, rep: -1 },
      apply: (s) => {
        if (chance(s, 0.35)) {
          hitFleet(s, -10);
          changeRep(s, -5);
          return 'Arremetidas e atrasos em cascata. Frota −10 e reputação −5.';
        }
        return 'A neblina abriu a tempo.';
      },
    },
  },

  // ---------- Pequeno porte ----------
  {
    id: 'pistaalagada',
    icon: 'rain',
    title: 'Pista alagada',
    text: 'A chuva transformou a pista de terra de uma das suas cidades em lama.',
    need: (s) =>
      isModel(s, 'pequeno') && flying(s).some((r) => !AIRPORTS[r.from].paved || !AIRPORTS[r.to].paved),
    L: {
      label: 'Suspender os voos',
      fx: { ops: -1, rep: 1 },
      apply: (s) => {
        addMod(s, 'halt', 1, 2);
        changeRep(s, 1);
        return 'Dois dias sem voar até a pista secar.';
      },
    },
    R: {
      label: 'Operar com cuidado',
      fx: { fleet: -1, rep: -1 },
      apply: (s) => {
        if (chance(s, 0.3)) {
          hitFleet(s, -15);
          changeRep(s, -5);
          return 'Um avião atolou e danificou o trem de pouso. Frota −15 e reputação −5.';
        }
        return 'Pousos na lama, sem incidentes.';
      },
    },
  },
  {
    id: 'garimpo',
    icon: 'search',
    title: 'Fretamento para o garimpo',
    text: 'Um empresário oferece pagar em dinheiro vivo por voos semanais para uma pista clandestina.',
    need: (s) => isModel(s, 'pequeno'),
    L: {
      label: 'Aceitar',
      fx: { cash: 1, rep: -1 },
      apply: (s) => {
        earn(s, 150000);
        changeRep(s, -6);
        if (chance(s, 0.25)) {
          const fine = pay(s, 300000);
          const p = s.fleet.find((x) => !x.maint);
          if (p) {
            p.maint = 1;
            p.restore = false;
          }
          return `A Polícia Federal apreendeu o avião por um dia. Multa de ${fmtMoney(fine)}.`;
        }
        return 'Dinheiro no caixa e má fama na região.';
      },
    },
    R: {
      label: 'Recusar',
      fx: { rep: 1 },
      apply: (s) => {
        changeRep(s, 2);
        return 'Você recusou. A notícia correu e a cidade gostou.';
      },
    },
  },
  {
    id: 'uti',
    icon: 'siren',
    title: 'Remoção médica urgente',
    text: 'Um paciente grave precisa sair de uma cidade isolada hoje. A prefeitura pede o seu avião.',
    need: (s) => isModel(s, 'pequeno'),
    L: {
      label: 'Atender',
      fx: { cash: -1, rep: 1 },
      apply: (s) => {
        pay(s, 15000);
        changeRep(s, 5);
        return 'O paciente chegou a tempo. A cidade não vai esquecer.';
      },
    },
    R: {
      label: 'Não atender',
      fx: { rep: -1 },
      apply: (s) => {
        changeRep(s, -3);
        return 'A família procurou outra empresa. A história se espalhou.';
      },
    },
  },
  {
    id: 'parintins',
    icon: 'mask',
    title: 'Festival de Parintins',
    text: 'O boi-bumbá vai lotar a ilha. Não há estrada até lá.',
    window: [166, 181], // 15 a 30 de junho
    need: (s) => isModel(s, 'pequeno'),
    L: {
      label: 'Voos extras',
      fx: { ops: 1, fleet: -1 },
      apply: (s) => {
        addMod(s, 'demand', 1.4, 7);
        hitFleet(s, -4);
        return 'Aviões lotados de torcedores de Garantido e Caprichoso. Demanda +40%.';
      },
    },
    R: {
      label: 'Tarifa de festival',
      fx: { cash: 1, rep: -1 },
      apply: (s) => {
        const c = earn(s, 50000);
        changeRep(s, -2);
        return `Receita extra de ${fmtMoney(c)} e reclamações do preço.`;
      },
    },
  },

  // ---------- Divisão Cargas ----------
  {
    id: 'blackfriday',
    icon: 'gift',
    title: 'Black Friday',
    text: 'O comércio eletrônico prevê o dobro de encomendas. Os centros de distribuição pedem espaço nos seus cargueiros.',
    window: [319, 334], // 15 a 30 de novembro
    need: cargoFlying,
    L: {
      label: 'Voos extras de carga',
      fx: { ops: 1, fleet: -1 },
      apply: (s) => {
        addMod(s, 'cargo', 1.5, 10);
        hitFleet(s, -4);
        return 'Porões cheios de caixas. Demanda de carga +50% por 10 dias.';
      },
    },
    R: {
      label: 'Frete de pico',
      fx: { cash: 1 },
      apply: (s) => {
        const c = earn(s, 60000);
        return `Frete de pico cobrado. Receita extra de ${fmtMoney(c)}.`;
      },
    },
  },
  {
    id: 'apreensao',
    icon: 'lock',
    title: 'Receita Federal retém carga',
    text: 'A fiscalização reteve um lote no seu terminal por suspeita de nota fria de um cliente.',
    need: cargoFlying,
    L: {
      label: 'Cooperar e esperar',
      fx: { ops: -1 },
      apply: (s) => {
        addMod(s, 'cargo', 0.7, 10);
        return 'Terminal sob fiscalização. Demanda de carga −30% por 10 dias.';
      },
    },
    R: {
      label: 'Contestar na Justiça',
      fx: { cash: -1 },
      apply: (s) => {
        const c = pay(s, 40000);
        if (chance(s, 0.4)) {
          changeRep(s, -4);
          return `O juiz negou e o caso virou notícia. Custo: ${fmtMoney(c)} e reputação −4.`;
        }
        return `Liminar concedida. Custo: ${fmtMoney(c)}.`;
      },
    },
  },
  {
    id: 'safra',
    icon: 'sun',
    title: 'Safra recorde',
    text: 'Frutas, peixe e flores em volume recorde. Exportadores querem mandar tudo antes de estragar.',
    need: cargoFlying,
    L: {
      label: 'Priorizar perecíveis',
      fx: { ops: 1, fleet: -1 },
      apply: (s) => {
        addMod(s, 'cargo', 1.3, 30);
        hitFleet(s, -3);
        return 'Cargueiros refrigerados rodando dia e noite. Demanda de carga +30% por 30 dias.';
      },
    },
    R: {
      label: 'Manter a programação',
      fx: {},
      apply: () => 'Os exportadores foram para a Rota Norte Cargo.',
    },
  },
  {
    id: 'perigosa',
    icon: 'cone',
    title: 'Carga perigosa mal declarada',
    text: 'O raio-X mostrou baterias de lítio num lote declarado como roupas. O cliente jura que é engano.',
    need: cargoFlying,
    L: {
      label: 'Recusar o lote',
      fx: { cash: -1, rep: 1 },
      apply: (s) => {
        pay(s, 20000);
        changeRep(s, 1);
        return 'Lote devolvido. O cliente pagou a multa, você a armazenagem.';
      },
    },
    R: {
      label: 'Embarcar assim mesmo',
      fx: { cash: 1, fleet: -1 },
      apply: (s) => {
        earn(s, 40000);
        if (chance(s, 0.2)) {
          hitFleet(s, -12);
          changeRep(s, -8);
          return 'Princípio de incêndio no porão, pouso de emergência. Frota −12 e reputação −8.';
        }
        return 'Chegou sem incidentes. Desta vez.';
      },
    },
  },

  // ---------- Divisão Base internacional ----------
  {
    id: 'cambio',
    icon: 'dollar',
    title: 'Câmbio dispara',
    text: 'O dólar subiu 8% em uma semana. Leasing, taxas e hubs no exterior ficam mais caros.',
    need: intlFlying,
    L: {
      label: 'Contratar hedge cambial',
      fx: { cash: -1 },
      apply: (s) => {
        const c = pay(s, 100000);
        moveFx(s, 1.03);
        return `Hedge contratado por ${fmtMoney(c)}. O impacto ficou em 3%.`;
      },
    },
    R: {
      label: 'Absorver a alta',
      fx: { cash: -1 },
      apply: (s) => {
        moveFx(s, 1.12);
        return 'Dólar 12% mais caro. Custos no exterior sobem junto.';
      },
    },
  },
  {
    id: 'realforte',
    icon: 'arrival',
    title: 'Real se valoriza',
    text: 'Boas notícias na economia: o dólar caiu. Viajar para fora ficou mais barato para o brasileiro.',
    need: intlFlying,
    L: {
      label: 'Campanha "Conheça o mundo"',
      fx: { cash: -1, ops: 1 },
      apply: (s) => {
        moveFx(s, 0.92);
        pay(s, 40000);
        addMod(s, 'demand', 1.1, 30);
        return 'Campanha no ar. Demanda +10% por 30 dias.';
      },
    },
    R: {
      label: 'Guardar a folga no caixa',
      fx: { cash: 1 },
      apply: (s) => {
        moveFx(s, 0.92);
        const c = earn(s, 30000);
        return `Custos no exterior menores e ${fmtMoney(c)} a mais no caixa.`;
      },
    },
  },
  {
    id: 'codeshare',
    icon: 'handshake',
    title: 'Atlântica quer rever o acordo',
    text: 'A Atlântica diz que o codeshare favorece você e pede uma compensação.',
    need: (s) => intlFlying(s) && s.codeshare,
    L: {
      label: 'Pagar a compensação',
      fx: { cash: -1 },
      apply: (s) => {
        const c = pay(s, 100000);
        return `Acordo mantido por mais um tempo. Custo: ${fmtMoney(c)}.`;
      },
    },
    R: {
      label: 'Encerrar o acordo',
      fx: { ops: -1 },
      apply: (s) => {
        s.codeshare = false;
        return 'Fim do codeshare. A Atlântica volta a disputar tudo.';
      },
    },
  },
  {
    id: 'visto',
    icon: 'lock',
    title: 'Regras de visto mais duras',
    text: 'Um país da sua malha endureceu a entrada de brasileiros. Passageiros estão sendo barrados no embarque.',
    need: intlFlying,
    L: {
      label: 'Montar um balcão de apoio',
      fx: { cash: -1, rep: 1 },
      apply: (s) => {
        const c = pay(s, 30000);
        changeRep(s, 3);
        return `Orientação no check-in e menos barrados. Custo: ${fmtMoney(c)}.`;
      },
    },
    R: {
      label: 'Deixar com o passageiro',
      fx: { rep: -1, ops: -1 },
      apply: (s) => {
        changeRep(s, -3);
        addMod(s, 'demand', 0.95, 30);
        return 'Filas, choro no portão e demanda −5% por 30 dias.';
      },
    },
  },
];
