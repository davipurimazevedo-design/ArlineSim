// Eventos da Fase 2: sazonais, cadeias e avulsos (textos revisados em docs/eventos-fase2.md).
import { MODELS } from './aircraft';
import { fmtMoney } from '../format';
import { addMod, chainReady, changeRep, hitFleet, scaleCost, setFlag } from '../helpers';
import { chance } from '../rng';
import type { GameEvent, GameState } from '../types';

const hasRoutes = (s: GameState, n = 1) => s.routes.filter((r) => r.planes.length > 0).length >= n;
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

export const MORE_EVENTS: GameEvent[] = [
  // ---------- sazonais ----------
  {
    id: 'carnaval',
    icon: 'mask',
    title: 'Carnaval chegando',
    text: 'Salvador, Recife e Rio lotaram. As buscas por voos triplicaram nesta semana.',
    window: [35, 48], // 4 a 17 de fevereiro
    need: (s) => hasRoutes(s),
    L: {
      label: 'Reforçar a malha',
      fx: { cash: 1, fleet: -1 },
      apply: (s) => {
        addMod(s, 'demand', 1.3, 7);
        hitFleet(s, -4);
        return 'Aviões cheios de confete. Demanda +30% por 7 dias.';
      },
    },
    R: {
      label: 'Tarifa de alta temporada',
      fx: { cash: 1, rep: -1 },
      apply: (s) => {
        const c = earn(s, 180000);
        changeRep(s, -2);
        return `Receita extra de ${fmtMoney(c)}. Reclamações de preço nas redes.`;
      },
    },
  },
  {
    id: 'ferias',
    icon: 'family',
    title: 'Férias de julho',
    text: 'Escolas em férias e famílias no balcão. As crianças desacompanhadas dobraram.',
    window: [175, 195], // 24 de junho a 14 de julho
    need: (s) => hasRoutes(s),
    L: {
      label: 'Programa Criança a Bordo',
      fx: { cash: -1, rep: 1 },
      apply: (s) => {
        const c = pay(s, 60000);
        changeRep(s, 4);
        addMod(s, 'demand', 1.1, 20);
        return `Pais elogiam o cuidado da tripulação. Custo: ${fmtMoney(c)}.`;
      },
    },
    R: {
      label: 'Só vender assentos',
      fx: { cash: 1 },
      apply: (s) => {
        addMod(s, 'demand', 1.2, 15);
        return 'Demanda +20% por 15 dias.';
      },
    },
  },
  {
    id: 'fimdeano',
    icon: 'gift',
    title: 'Fim de ano',
    text: 'Dezembro chegou. Aeroportos cheios e bagagem extraviada no noticiário.',
    window: [330, 355], // 26 de novembro a 21 de dezembro
    need: (s) => hasRoutes(s),
    L: {
      label: 'Contratar temporários',
      fx: { cash: -1, rep: 1 },
      apply: (s) => {
        const c = pay(s, 100000);
        changeRep(s, 3);
        addMod(s, 'demand', 1.25, 15);
        return `Balcões rápidos e malas no destino. Custo: ${fmtMoney(c)}.`;
      },
    },
    R: {
      label: 'Operar com a equipe atual',
      fx: { rep: -1, fleet: -1 },
      apply: (s) => {
        addMod(s, 'demand', 1.25, 15);
        hitFleet(s, -6);
        if (chance(s, 0.4)) {
          changeRep(s, -6);
          return 'Malas extraviadas viraram notícia. Reputação −6.';
        }
        return 'A equipe segurou o tranco. Demanda +25% por 15 dias.';
      },
    },
  },

  // ---------- cadeias ----------
  {
    id: 'sindicato',
    icon: 'handshake',
    title: 'Sindicato volta à mesa',
    text: 'Os pilotos não esqueceram a greve. Querem um acordo de dois anos antes da próxima data-base.',
    need: (s) => chainReady(s, 'greve_dura', 60, 'sindicato'),
    L: {
      label: 'Assinar o acordo',
      fx: { cash: -1 },
      apply: (s) => {
        addMod(s, 'salary', 1.08, 365);
        setFlag(s, 'greve_bloqueio', s.day + 365);
        return 'Acordo assinado. Salários +8% por um ano e paz na cabine.';
      },
    },
    R: {
      label: 'Adiar de novo',
      fx: { ops: -1, rep: -1 },
      apply: (s) => {
        if (chance(s, 0.5)) {
          addMod(s, 'halt', 1, 5);
          changeRep(s, -8);
          return 'Nova paralisação: cinco dias sem voar.';
        }
        return 'O sindicato recuou. Por enquanto.';
      },
    },
  },
  {
    id: 'clubefinal',
    icon: 'trophy',
    title: 'Seu clube na final',
    text: 'O time que leva sua marca chegou à final. A torcida quer viajar junto.',
    need: (s) => chainReady(s, 'patrocinio', 30, 'clubefinal'),
    L: {
      label: 'Fretar voos da torcida',
      fx: { cash: 1, rep: 1 },
      apply: (s) => {
        const c = earn(s, 250000);
        changeRep(s, 4);
        return `Arquibancada no ar. Receita de ${fmtMoney(c)} e festa na chegada.`;
      },
    },
    R: { label: 'Deixar passar', fx: {}, apply: () => 'Os fretamentos ficaram com a concorrência.' },
  },
  {
    id: 'clubeescandalo',
    icon: 'siren',
    title: 'Escândalo no clube',
    text: 'O presidente do clube que você patrocina foi preso. Sua marca está na camisa.',
    need: (s) => chainReady(s, 'patrocinio', 45, 'clubeescandalo'),
    L: {
      label: 'Romper o contrato',
      fx: { cash: -1, rep: 1 },
      apply: (s) => {
        const c = pay(s, 150000);
        changeRep(s, 2);
        return `Contrato rompido. Multa de ${fmtMoney(c)}, marca preservada.`;
      },
    },
    R: {
      label: 'Manter o patrocínio',
      fx: { rep: -1 },
      apply: (s) => {
        changeRep(s, -8);
        return 'Sua marca apareceu em todas as manchetes. Reputação −8.';
      },
    },
  },
  {
    id: 'hedge',
    icon: 'lock',
    title: 'Hedge vence',
    text: 'O banco oferece renovar a trava do querosene por mais 60 dias.',
    need: (s) => chainReady(s, 'hedge', 40, 'hedge'),
    L: {
      label: 'Renovar a trava',
      fx: { cash: -1 },
      apply: (s) => {
        const c = pay(s, 200000);
        addMod(s, 'fuel', 0.92, 60);
        return `Trava renovada por ${fmtMoney(c)}. Combustível 8% abaixo do mercado.`;
      },
    },
    R: { label: 'Voltar ao mercado', fx: {}, apply: () => 'Você volta a pagar o preço do dia.' },
  },
  {
    id: 'anacvolta',
    icon: 'search',
    title: 'A ANAC voltou',
    text: 'Os inspetores voltaram para conferir as pendências do prazo que você pediu.',
    need: (s) => chainReady(s, 'anac_prazo', 30, 'anacvolta'),
    L: {
      label: 'Abrir todos os registros',
      fx: { cash: -1, fleet: 1 },
      apply: (s) => {
        const c = pay(s, 150000);
        hitFleet(s, 5);
        return `Pendências resolvidas (${fmtMoney(c)}). Frota +5% de condição.`;
      },
    },
    R: {
      label: 'Pedir mais prazo',
      fx: { cash: -1, ops: -1 },
      apply: (s) => {
        if (chance(s, 0.6)) {
          const c = pay(s, 600000);
          addMod(s, 'halt', 1, 2);
          return `Multa de ${fmtMoney(c)} e dois dias de frota retida.`;
        }
        return 'Os inspetores aceitaram. Desta vez.';
      },
    },
  },
  {
    id: 'procon',
    icon: 'gavel',
    title: 'Ação coletiva',
    text: 'Passageiros entraram na Justiça por causa da poltrona quebrada. O Procon quer uma posição.',
    need: (s) => chainReady(s, 'video_ignorado', 40, 'procon'),
    L: {
      label: 'Fazer acordo',
      fx: { cash: -1, rep: 1 },
      apply: (s) => {
        const c = pay(s, 200000);
        changeRep(s, 3);
        return `Acordo fechado por ${fmtMoney(c)}. O caso saiu do noticiário.`;
      },
    },
    R: {
      label: 'Ir até o fim',
      fx: { cash: -1, rep: -1 },
      apply: (s) => {
        if (chance(s, 0.5)) {
          const c = pay(s, 500000);
          changeRep(s, -5);
          return `Derrota na Justiça: ${fmtMoney(c)} e reputação −5.`;
        }
        return 'O juiz deu ganho de causa à companhia.';
      },
    },
  },

  // ---------- avulsos ----------
  {
    id: 'turbulencia',
    icon: 'wave',
    title: 'Turbulência severa',
    text: 'Um voo pegou turbulência forte. Dois comissários feridos, nenhum passageiro.',
    need: (s) => hasRoutes(s),
    L: {
      label: 'Revisar o procedimento',
      fx: { cash: -1, rep: 1 },
      apply: (s) => {
        const c = pay(s, 70000);
        changeRep(s, 2);
        return `Treinamento refeito (${fmtMoney(c)}). Tripulação agradece.`;
      },
    },
    R: {
      label: 'Soltar nota à imprensa',
      fx: { rep: -1 },
      apply: (s) => {
        changeRep(s, -3);
        return 'A nota soou fria. Reputação −3.';
      },
    },
  },
  {
    id: 'app',
    icon: 'app',
    title: 'Aplicativo novo',
    text: 'Uma agência propõe um app de reservas com check-in pelo celular.',
    need: (s) => s.fleet.length >= 3,
    L: {
      label: 'Investir no app',
      fx: { cash: -1, ops: 1 },
      apply: (s) => {
        const c = pay(s, 400000);
        addMod(s, 'share', 1.06, 180);
        return `App no ar por ${fmtMoney(c)}. Atratividade +6% por 180 dias.`;
      },
    },
    R: { label: 'Manter o site', fx: {}, apply: () => 'O site continua como está.' },
  },
  {
    id: 'obras',
    icon: 'cone',
    title: 'Obras na pista',
    text: 'O aeroporto do seu hub vai fechar uma pista por 20 dias para recapeamento.',
    need: (s) => hasRoutes(s),
    L: {
      label: 'Reduzir voos',
      fx: { ops: -1 },
      apply: (s) => {
        addMod(s, 'demand', 0.85, 20);
        return 'Malha enxuta: demanda −15% por 20 dias.';
      },
    },
    R: {
      label: 'Pagar por horários noturnos',
      fx: { cash: -1 },
      apply: (s) => {
        const c = pay(s, 150000);
        return `Voos remanejados para a madrugada por ${fmtMoney(c)}.`;
      },
    },
  },
  {
    id: 'aeroportuarios',
    icon: 'tower',
    title: 'Greve nos aeroportos',
    text: 'Bombeiros e operadores de pátio cruzam os braços amanhã. Seus pilotos não têm nada com isso.',
    need: (s) => hasRoutes(s),
    L: {
      label: 'Esperar em solo',
      fx: { ops: -1 },
      apply: (s) => {
        addMod(s, 'halt', 1, 2);
        return 'Dois dias de aviões parados no pátio.';
      },
    },
    R: {
      label: 'Desviar para outros aeroportos',
      fx: { cash: -1, rep: -1 },
      apply: (s) => {
        const c = pay(s, 120000);
        changeRep(s, -2);
        return `Voos desviados por ${fmtMoney(c)}. Passageiros chegaram de ônibus.`;
      },
    },
  },
  {
    id: 'recall',
    icon: 'engine',
    title: 'Alerta do fabricante',
    text: 'O fabricante pede inspeção num lote de motores. Alguns dos seus aviões podem estar nele.',
    need: (s) => s.fleet.some((p) => MODELS[p.model].tier >= 1),
    L: {
      label: 'Inspecionar já',
      fx: { cash: -1, fleet: 1 },
      apply: (s) => {
        const c = pay(s, 100000);
        hitFleet(s, 5);
        return `Motores inspecionados (${fmtMoney(c)}). Frota +5% de condição.`;
      },
    },
    R: {
      label: 'Esperar o próximo check',
      fx: { fleet: -1 },
      apply: (s) => {
        addMod(s, 'wear', 1.3, 60);
        return 'Desgaste 30% maior pelos próximos 60 dias.';
      },
    },
  },
  {
    id: 'talento',
    icon: 'pilot',
    title: 'Piloto-chefe assediado',
    text: 'A Horizonte quer levar seu piloto-chefe e metade dos instrutores.',
    need: (s) => s.fleet.length >= 4,
    L: {
      label: 'Cobrir a oferta',
      fx: { cash: -1 },
      apply: (s) => {
        addMod(s, 'salary', 1.04, 180);
        return 'Equipe mantida. Salários +4% por 180 dias.';
      },
    },
    R: {
      label: 'Deixar ir',
      fx: { fleet: -1, rep: -1 },
      apply: (s) => {
        addMod(s, 'wear', 1.15, 90);
        changeRep(s, -2);
        return 'Sem os instrutores, a frota sofre: desgaste +15% por 90 dias.';
      },
    },
  },
  {
    id: 'dolar',
    icon: 'dollar',
    title: 'Dólar dispara',
    text: 'O real perdeu 12% em uma semana. Combustível e peças são cotados em dólar.',
    need: (s) => hasRoutes(s),
    L: {
      label: 'Travar o câmbio',
      fx: { cash: -1 },
      apply: (s) => {
        const c = pay(s, 200000);
        return `Câmbio travado por ${fmtMoney(c)}.`;
      },
    },
    R: {
      label: 'Correr o risco',
      fx: { cash: -1 },
      apply: (s) => {
        addMod(s, 'fuel', 1.12, 30);
        return 'Combustível 12% mais caro por 30 dias.';
      },
    },
  },
  {
    id: 'aerovia',
    icon: 'arrival',
    title: 'Aerovia chega ao hub',
    text: 'A Aerovia vai abrir voos no seu hub com tarifas promocionais.',
    need: (s) => hasRoutes(s, 3),
    L: {
      label: 'Lançar programa de fidelidade',
      fx: { cash: -1, ops: 1 },
      apply: (s) => {
        const c = pay(s, 250000);
        addMod(s, 'share', 1.05, 120);
        return `Fidelidade no ar por ${fmtMoney(c)}. Clientes mais fiéis por 120 dias.`;
      },
    },
    R: {
      label: 'Não reagir',
      fx: { ops: -1 },
      apply: (s) => {
        addMod(s, 'share', 0.85, 45);
        return 'A promoção levou parte dos seus passageiros por 45 dias.';
      },
    },
  },
  {
    id: 'enchente',
    icon: 'rain',
    title: 'Enchente no Sul',
    text: 'Chuvas isolaram cidades gaúchas. A Defesa Civil pede aviões para levar doações.',
    need: (s) => hasRoutes(s),
    L: {
      label: 'Ceder aviões',
      fx: { rep: 1, ops: -1 },
      apply: (s) => {
        addMod(s, 'demand', 0.9, 5);
        changeRep(s, 6);
        return 'Toneladas de doações entregues. O país agradece.';
      },
    },
    R: {
      label: 'Doar em dinheiro',
      fx: { cash: -1, rep: 1 },
      apply: (s) => {
        const c = pay(s, 100000);
        changeRep(s, 2);
        return `Doação de ${fmtMoney(c)} entregue à Defesa Civil.`;
      },
    },
  },
];
