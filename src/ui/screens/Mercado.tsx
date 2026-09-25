import { useState } from 'react';
import {
  actions,
  CONN_MAX,
  CONN_PER_ROUTE,
  hubDailyCost,
  hubSetupCost,
  routesAt,
  searchKey,
  CABINS,
  AIRPORT_CODES,
  AIRPORTS,
  dist,
  fmtInt,
  fmtMoney,
  leaseDeposit,
  LICENSES,
  MAX_RANGE,
  MODEL_KEYS,
  MODELS,
  slotCostFor,
  rules,
  modelAllowed,
  hasRegionalCert,
  REGIONAL_CERT_COST,
  BUSINESS_MODELS,
  type AirportCode,
  slotFeeFor,
  FINANCE_TERMS,
  financeQuote,
  financedBalance,
  financeLimit,
  type FinanceTerm,
  DIVISIONS,
  DIVISION_IDS,
  hasIntlDivision,
  COMPETITORS,
  CODESHARE_AI_CUT,
  CODESHARE_COST,
  CODESHARE_DAILY,
  CODESHARE_PARTNER,
  FOREIGN_HUB_FEE_FACTOR,
  fmtDec,
  hasCargoDivision,
  isFreighter,
  CARGO_CLIENTS_BY_ID,
  cargoCapacityOn,
  clientName,
  contractEnd,
  contractMet,
  CONTRACT_GRACE,
  CONTRACT_PENALTY_DAYS,
  MAX_CONTRACTS,
  type CargoContract,
  acquireBlock,
  ageYears,
  financeQuoteFor,
  usedDeposit,
  USED_FINANCE_TERMS,
} from '../../engine';
import { useGame, useGameState } from '../../store/gameStore';
import { Bar, CellBar } from '../components/Bar';
import { Btn } from '../components/Btn';
import { Empty } from '../components/Empty';
import { Pill } from '../components/Pill';
import { Segmented } from '../components/Segmented';

type Sub = 'avioes' | 'slots' | 'hubs' | 'divisoes' | 'licencas';
const SUBS = [
  ['avioes', 'Aeronaves'],
  ['slots', 'Slots'],
  ['hubs', 'Hubs'],
  ['divisoes', 'Divisões'],
  ['licencas', 'Licenças'],
] as const;

export function Mercado() {
  const [sub, setSub] = useState<Sub>('avioes');
  return (
    <section>
      <div className="section-head">
        <h1>Mercado</h1>
        <Segmented label="Categoria" value={sub} options={SUBS} onChange={setSub} />
      </div>
      {sub === 'avioes' ? (
        <Aeronaves />
      ) : sub === 'slots' ? (
        <Slots />
      ) : sub === 'hubs' ? (
        <Hubs />
      ) : sub === 'divisoes' ? (
        <Divisoes />
      ) : (
        <Licencas />
      )}
    </section>
  );
}

const TERM_OPTIONS = FINANCE_TERMS.map((d) => [d, `${Math.round(d / 365)} anos`] as const);

function Aeronaves() {
  const g = useGameState();
  const act = useGame((s) => s.act);
  const ask = useGame((s) => s.ask);
  const [term, setTerm] = useState<FinanceTerm>(1825);
  const [stock, setStock] = useState<'novos' | 'usados'>('novos');
  const finLeft = financeLimit(g) - financedBalance(g);
  return (
    <>
      <div className="finance-bar">
        <Segmented
          label="Aeronaves novas ou usadas"
          value={stock}
          options={[
            ['novos', 'Novos'],
            ['usados', `Usados (${g.usedMarket.length})`],
          ]}
          onChange={setStock}
        />
        <span>Prazo do financiamento</span>
        <Segmented label="Prazo do financiamento" value={term} options={TERM_OPTIONS} onChange={setTerm} />
        <small>
          Entrada de 20%, juros de ~11,6% ao ano. Disponível para financiar:{' '}
          <b className="num">{fmtMoney(Math.max(0, finLeft))}</b>
        </small>
      </div>
      {stock === 'usados' ? (
        <Usados term={term} finLeft={finLeft} />
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Modelo</th>
                <th className="c">Capacidade</th>
                <th>Alcance</th>
                <th className="r">Leasing</th>
                <th className="r">Compra</th>
                <th className="r">Financiamento</th>
                <th className="r">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {[...MODEL_KEYS]
                .sort(
                  (a, b) =>
                    Number(isFreighter(a)) - Number(isFreighter(b)) ||
                    MODELS[a].tier - MODELS[b].tier ||
                    MODELS[a].y + MODELS[a].j - (MODELS[b].y + MODELS[b].j) ||
                    (MODELS[a].cargo ?? 0) - (MODELS[b].cargo ?? 0),
                )
                .map((k, i) => {
                  const m = MODELS[k];
                  const noDivision = !!m.cargo && !hasCargoDivision(g);
                  const outOfModel = !modelAllowed(g, k);
                  const locked = noDivision || outOfModel || m.tier > g.license;
                  const dep = leaseDeposit(k);
                  const q = financeQuote(k, term);
                  const canFinance = !locked && g.cash >= q.down && q.principal <= finLeft;
                  return (
                    <tr key={k} className={`row ${locked ? 'locked' : 's-good'}${i % 2 ? ' zebra' : ''}`}>
                      <td>
                        <b>{m.name}</b>
                        <small>
                          {m.kind}
                          {noDivision
                            ? ' · requer a divisão Cargas'
                            : outOfModel
                              ? g.businessModel === 'pequeno' && !hasRegionalCert(g)
                                ? ' · requer certificação regional'
                                : ` · fora do modelo ${BUSINESS_MODELS[g.businessModel].name}`
                              : m.tier > g.license
                                ? ` · requer licença ${LICENSES[m.tier].name}`
                                : ''}
                          {CABINS[k] ? ' · cabine configurável' : ''}
                        </small>
                      </td>
                      <td className="c num">
                        {m.cargo ? `${fmtDec(m.cargo)} t` : m.j ? `${m.j}J + ${m.y}Y` : m.y}
                      </td>
                      <td>
                        <CellBar
                          v={(m.range / MAX_RANGE) * 100}
                          tone="blue"
                          label="Alcance"
                          text={`${fmtInt(m.range)} km`}
                        />
                      </td>
                      <td className="r">
                        <b className="num">{fmtMoney(m.lease)}/dia</b>
                        <small>depósito {fmtMoney(dep)}</small>
                      </td>
                      <td className="r num">{fmtMoney(m.price)}</td>
                      <td className="r">
                        <b className="num">{fmtMoney(q.payment)}/dia</b>
                        <small>entrada {fmtMoney(q.down)}</small>
                      </td>
                      <td className="r actions">
                        <Btn
                          small
                          kind="primary"
                          disabled={locked || g.cash < dep}
                          onClick={() => act((s) => actions.lease(s, k))}
                        >
                          Arrendar
                        </Btn>
                        <Btn
                          small
                          disabled={locked || g.cash < m.price}
                          onClick={() => act((s) => actions.buy(s, k))}
                        >
                          Comprar
                        </Btn>
                        <Btn
                          small
                          disabled={!canFinance}
                          title={
                            !locked && q.principal > finLeft ? 'Acima do limite de financiamento' : undefined
                          }
                          onClick={() =>
                            ask({
                              text: `Financiar o ${m.name}? Entrada de ${fmtMoney(q.down)} e ${fmtMoney(q.payment)}/dia por ${Math.round(term / 365)} anos (total de ${fmtMoney(q.down + q.total)}). O avião já é seu, mas só entra no limite de crédito o que estiver pago.`,
                              okLabel: 'Financiar',
                              onOk: () => act((s) => actions.finance(s, k, term)),
                            })
                          }
                        >
                          Financiar
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** Aviões usados à venda: lista renovada a cada 30 dias. */
function Usados({ term, finLeft }: { term: FinanceTerm; finLeft: number }) {
  const g = useGameState();
  const act = useGame((s) => s.act);
  const ask = useGame((s) => s.ask);
  const termOk = USED_FINANCE_TERMS.includes(term);
  const next = Math.max(0, g.nextUsedMarket - g.day);
  if (!g.usedMarket.length)
    return <Empty>Nenhum usado à venda agora. Uma lista nova chega em {next} dias.</Empty>;
  return (
    <>
      <p className="note">
        Mais baratos, mas a idade encarece a manutenção (+4% por ano) e acelera o desgaste (+2% por ano).
        Lista nova em {next} dias. Usados financiam em 3 ou 5 anos.
      </p>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Modelo</th>
              <th className="c">Idade</th>
              <th>Condição</th>
              <th className="r">Leasing</th>
              <th className="r">Compra</th>
              <th className="r">Financiamento</th>
              <th className="r">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {g.usedMarket.map((o, i) => {
              const m = MODELS[o.model];
              const years = Math.round(ageYears(o, g.day));
              const block = acquireBlock(g, o.model);
              const dep = usedDeposit(o);
              const q = financeQuoteFor(o.price, term);
              return (
                <tr key={o.id} className={`row ${block ? 'locked' : 's-good'}${i % 2 ? ' zebra' : ''}`}>
                  <td>
                    <b>{m.name}</b>
                    <small>
                      {m.cargo ? `${fmtDec(m.cargo)} t` : `${m.y + m.j} assentos`}
                      {block ? ` · ${block}` : ''}
                    </small>
                  </td>
                  <td className="c num">{years} anos</td>
                  <td>
                    <CellBar v={o.condition} label="Condição" />
                  </td>
                  <td className="r">
                    <b className="num">{fmtMoney(o.lease)}/dia</b>
                    <small>novo {fmtMoney(m.lease)}</small>
                  </td>
                  <td className="r">
                    <b className="num">{fmtMoney(o.price)}</b>
                    <small>novo {fmtMoney(m.price)}</small>
                  </td>
                  <td className="r">
                    {termOk ? (
                      <>
                        <b className="num">{fmtMoney(q.payment)}/dia</b>
                        <small>entrada {fmtMoney(q.down)}</small>
                      </>
                    ) : (
                      <small>só 3 ou 5 anos</small>
                    )}
                  </td>
                  <td className="r actions">
                    <Btn
                      small
                      kind="primary"
                      disabled={!!block || g.cash < dep}
                      onClick={() => act((s) => actions.leaseUsed(s, o.id))}
                    >
                      Arrendar
                    </Btn>
                    <Btn
                      small
                      disabled={!!block || g.cash < o.price}
                      onClick={() => act((s) => actions.buyUsed(s, o.id))}
                    >
                      Comprar
                    </Btn>
                    <Btn
                      small
                      disabled={!!block || !termOk || g.cash < q.down || q.principal > finLeft}
                      onClick={() =>
                        ask({
                          text: `Financiar o ${m.name} de ${years} anos? Entrada de ${fmtMoney(q.down)} e ${fmtMoney(q.payment)}/dia por ${Math.round(term / 365)} anos.`,
                          okLabel: 'Financiar',
                          onOk: () => act((s) => actions.financeUsed(s, o.id, term)),
                        })
                      }
                    >
                      Financiar
                    </Btn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Slots() {
  const g = useGameState();
  const act = useGame((s) => s.act);
  const [q, setQ] = useState('');
  const own = (c: string) => g.slots.includes(c as never);
  const needle = searchKey(q).trim();
  const match = (c: AirportCode) =>
    !needle || c.toLowerCase().includes(needle) || searchKey(AIRPORTS[c].city).includes(needle);
  // seus primeiro, domésticos antes, depois por distância do hub
  const list = AIRPORT_CODES.filter(match).sort(
    (a, b) =>
      Number(own(b)) - Number(own(a)) ||
      Number(AIRPORTS[a].intl) - Number(AIRPORTS[b].intl) ||
      dist(g.hub, a) - dist(g.hub, b),
  );
  return (
    <>
      <input
        type="text"
        className="slot-search"
        placeholder="Buscar aeroporto por cidade ou código"
        aria-label="Buscar aeroporto"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Aeroporto</th>
              <th>Porte</th>
              <th className="r">Do hub</th>
              <th className="r">Taxa/dia</th>
              <th className="r">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((c, i) => {
              const a = AIRPORTS[c];
              const mine = own(c);
              const locked = a.intl && g.license < 2;
              const cost = slotCostFor(g, c);
              return (
                <tr
                  key={c}
                  className={`row ${mine ? 's-good' : locked ? 'locked' : ''}${i % 2 ? ' zebra' : ''}`}
                >
                  <td>
                    <b>{c}</b>
                    <small>
                      {a.city}
                      {a.intl ? ' · internacional' : ''}
                    </small>
                  </td>
                  <td>
                    <CellBar v={a.size * 10} tone="blue" label="Porte" text={String(a.size)} />
                  </td>
                  <td className="r num">{c === g.hub ? 'hub' : fmtInt(dist(g.hub, c)) + ' km'}</td>
                  <td className="r num">{fmtMoney(slotFeeFor(g, c))}</td>
                  <td className="r">
                    {mine ? (
                      <Pill tone="ok">{g.hubs.includes(c) ? 'Hub' : 'Seu'}</Pill>
                    ) : (
                      <Btn
                        small
                        kind="primary"
                        disabled={locked || g.cash < cost}
                        onClick={() => act((s) => actions.buySlot(s, c))}
                      >
                        {locked ? 'Licença int.' : 'Comprar ' + fmtMoney(cost)}
                      </Btn>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Hubs() {
  const g = useGameState();
  const act = useGame((s) => s.act);
  const ask = useGame((s) => s.ask);
  const intlDiv = hasIntlDivision(g);
  const candidates = g.slots.filter((c) => (intlDiv || !AIRPORTS[c].intl) && !g.hubs.includes(c));
  const bonus = (c: AirportCode) => Math.min(CONN_MAX, CONN_PER_ROUTE * Math.max(0, routesAt(g, c) - 1));
  return (
    <div className="hubs-tab">
      <ul className="hub-rules">
        <li>
          <b>Conexões:</b> rotas que saem de um hub ganham +{Math.round(CONN_PER_ROUTE * 100)}% de demanda por
          outra rota sua no mesmo hub, até +{Math.round(CONN_MAX * 100)}%.
        </li>
        <li>
          <b>Base:</b> aviões que voam a partir de um hub fazem manutenção 20% mais barata e 1 dia mais
          rápida.
        </li>
        <li>
          <b>Pernoite:</b> rotas que não tocam nenhum hub pagam 20% a mais de tripulação
          {g.businessModel === 'lowcost' ? ' (a Low-cost é isenta)' : ''}.
        </li>
        <li>
          <b>Exterior:</b>{' '}
          {intlDiv
            ? `hubs fora do Brasil pagam ${Math.round(FOREIGN_HUB_FEE_FACTOR * 100)}% da taxa diária de slot; implantação e estrutura são cotadas em dólar.`
            : 'hubs fora do Brasil chegam com a divisão Base internacional.'}
        </li>
      </ul>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Seus hubs</th>
              <th className="c">Rotas</th>
              <th>Conexões</th>
              <th className="r">Estrutura/dia</th>
            </tr>
          </thead>
          <tbody>
            {g.hubs.map((c, i) => (
              <tr key={c} className={`row s-good${i % 2 ? ' zebra' : ''}`}>
                <td>
                  <b>{c}</b>
                  <small>
                    {AIRPORTS[c].city} ·{' '}
                    {c === g.hub
                      ? 'hub da fundação'
                      : AIRPORTS[c].intl
                        ? 'base no exterior'
                        : 'hub adicional'}
                  </small>
                </td>
                <td className="c num">{routesAt(g, c)}</td>
                <td>
                  <CellBar
                    v={(bonus(c) / CONN_MAX) * 100}
                    tone="teal"
                    label={`Conexões em ${c}`}
                    text={`+${Math.round(bonus(c) * 100)}%`}
                  />
                </td>
                <td className="r num">{c === g.hub ? 'incluída' : fmtMoney(hubDailyCost(g, c))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="hub-open-title">Abrir hub</h2>
      {candidates.length === 0 ? (
        <Empty>
          Abra rotas ou compre slots numa cidade {intlDiv ? '' : 'do Brasil '}para poder transformá-la em hub.
        </Empty>
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Cidade</th>
                <th className="c">Rotas</th>
                <th className="r">Estrutura/dia</th>
                <th className="r">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c, i) => {
                const cost = hubSetupCost(c, g.fxIdx);
                return (
                  <tr key={c} className={`row${i % 2 ? ' zebra' : ''}`}>
                    <td>
                      <b>{c}</b>
                      <small>
                        {AIRPORTS[c].city} · porte {AIRPORTS[c].size}
                        {AIRPORTS[c].intl ? ` · ${AIRPORTS[c].uf}` : ''}
                      </small>
                    </td>
                    <td className="c num">{routesAt(g, c)}</td>
                    <td className="r num">{fmtMoney(hubDailyCost(g, c))}</td>
                    <td className="r">
                      <Btn
                        small
                        kind="primary"
                        disabled={g.cash < cost}
                        onClick={() =>
                          ask({
                            text: `Abrir hub em ${AIRPORTS[c].city}? Implantação de ${fmtMoney(cost)} e estrutura de ${fmtMoney(hubDailyCost(g, c))} por dia.`,
                            okLabel: 'Abrir hub',
                            onOk: () => act((s) => actions.openHub(s, c)),
                          })
                        }
                      >
                        Abrir · {fmtMoney(cost)}
                      </Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Divisoes() {
  const g = useGameState();
  const act = useGame((s) => s.act);
  const ask = useGame((s) => s.ask);
  const partner = COMPETITORS[CODESHARE_PARTNER].name;
  return (
    <>
      <ol className="licenses">
        {DIVISION_IDS.map((id) => {
          const d = DIVISIONS[id];
          const has = g.divisions.includes(id);
          const blocked = g.license < d.license;
          return (
            <li key={id} className={has ? 'has' : !d.soon && !blocked ? 'next' : ''}>
              <div>
                <b>{d.name}</b>
                <small>{d.desc}</small>
              </div>
              {has ? (
                <Pill tone="ok">Aberta</Pill>
              ) : d.soon ? (
                <small>Em breve</small>
              ) : blocked ? (
                <small>Requer a licença {LICENSES[d.license].name}</small>
              ) : (
                <div className="lic-buy">
                  <Bar
                    v={(Math.max(0, g.cash) / d.cost) * 100}
                    tone="teal"
                    label={`Caixa até ${fmtMoney(d.cost)}`}
                  />
                  <Btn
                    kind="primary"
                    small
                    disabled={g.cash < d.cost}
                    onClick={() =>
                      ask({
                        text: `Abrir a divisão ${d.name} por ${fmtMoney(d.cost)}?`,
                        okLabel: 'Abrir divisão',
                        onOk: () => act((s) => actions.buyDivision(s, id)),
                      })
                    }
                  >
                    Abrir {fmtMoney(d.cost)}
                  </Btn>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {hasCargoDivision(g) && <Contratos />}
      {hasIntlDivision(g) && (
        <>
          <h2 className="hub-open-title">Base internacional</h2>
          <ul className="hub-rules">
            <li>
              <b>Câmbio:</b> dólar a {fmtDec(g.fxIdx, 2)}× o normal. Taxas no exterior, slots e hubs fora do
              Brasil sobem com ele; metade da receita das rotas internacionais também.
            </li>
            <li>
              <b>Hubs no exterior:</b> abra na aba Hubs, numa cidade estrangeira onde você tenha slot.
            </li>
          </ul>
          <ol className="licenses">
            <li className={g.codeshare ? 'has' : 'next'}>
              <div>
                <b>Codeshare com a {partner}</b>
                <small>
                  A {partner} deixa de disputar {Math.round(CODESHARE_AI_CUT * 100)}% da força dela nas suas
                  rotas internacionais. Adesão de {fmtMoney(CODESHARE_COST)} e{' '}
                  {fmtMoney(CODESHARE_DAILY * g.fxIdx)}/dia (em dólar).
                </small>
              </div>
              {g.codeshare ? (
                <Btn
                  small
                  kind="ghost danger"
                  onClick={() =>
                    ask({
                      text: `Encerrar o codeshare com a ${partner}? A adesão não é devolvida.`,
                      okLabel: 'Encerrar',
                      danger: true,
                      onOk: () => act((s) => actions.cancelCodeshare(s)),
                    })
                  }
                >
                  Encerrar acordo
                </Btn>
              ) : (
                <Btn
                  kind="primary"
                  small
                  disabled={g.cash < CODESHARE_COST}
                  onClick={() => act((s) => actions.signCodeshare(s))}
                >
                  Assinar {fmtMoney(CODESHARE_COST)}
                </Btn>
              )}
            </li>
          </ol>
        </>
      )}
    </>
  );
}

function ContractRow({ c, offer }: { c: CargoContract; offer?: boolean }) {
  const g = useGameState();
  const act = useGame((s) => s.act);
  const ask = useGame((s) => s.ask);
  const client = CARGO_CLIENTS_BY_ID[c.client];
  const cap = cargoCapacityOn(g, c.from, c.to);
  const ok = contractMet(g, c);
  return (
    <li className={offer ? 'next' : ok ? 'has' : 'warn'}>
      <div>
        <b>{clientName(c)}</b>
        <small>
          {client?.what ?? 'carga'} · {c.from}–{c.to} · {fmtDec(c.tons)} t/dia
          {c.minCond ? ` · condição ≥ ${c.minCond}%` : ''} · {fmtMoney(c.pay)}/dia
        </small>
        <small>
          {offer
            ? `${c.days} dias · responda até ${c.expires - g.day} dias · ${CONTRACT_GRACE} dias para montar a capacidade`
            : `faltam ${contractEnd(c) - g.day} dias · capacidade no par ${fmtDec(cap.tons)} t/dia${
                ok
                  ? ''
                  : c.miss
                    ? ` · FALTANDO há ${c.miss} de ${CONTRACT_GRACE} dias`
                    : ` · monte a capacidade: prazo de ${CONTRACT_GRACE} dias`
              }`}
        </small>
      </div>
      {offer ? (
        <div className="row-btns">
          <Btn
            kind="primary"
            small
            disabled={g.contracts.length >= MAX_CONTRACTS}
            onClick={() => act((s) => actions.acceptCargoOffer(s))}
          >
            Aceitar
          </Btn>
          <Btn small kind="ghost" onClick={() => act((s) => actions.declineCargoOffer(s))}>
            Recusar
          </Btn>
        </div>
      ) : (
        <Btn
          small
          kind="ghost danger"
          onClick={() =>
            ask({
              text: `Encerrar o contrato com a ${clientName(c)}? Multa de ${fmtMoney(c.pay * CONTRACT_PENALTY_DAYS)} e perda de reputação.`,
              okLabel: 'Encerrar',
              danger: true,
              onOk: () => act((s) => actions.cancelContract(s, c.id)),
            })
          }
        >
          Encerrar
        </Btn>
      )}
    </li>
  );
}

function Contratos() {
  const g = useGameState();
  return (
    <>
      <h2 className="hub-open-title">Cargas</h2>
      <ul className="hub-rules">
        <li>
          <b>Rotas de carga:</b> crie em Rotas → Nova rota → Carga. Só cargueiros voam nelas; pesam o frete, a
          frequência e a condição dos aviões.
        </li>
        <li>
          <b>Contratos:</b> clientes pagam um valor fixo por dia enquanto você mantiver a capacidade exigida
          no par (t/dia num sentido). Sem ela por {CONTRACT_GRACE} dias seguidos, o contrato é rompido com
          multa de {CONTRACT_PENALTY_DAYS} dias de pagamento. Até {MAX_CONTRACTS} ao mesmo tempo.
        </li>
      </ul>
      <ol className="licenses contracts">
        {g.cargoOffer && <ContractRow c={g.cargoOffer} offer />}
        {g.contracts.map((c) => (
          <ContractRow key={c.id} c={c} />
        ))}
      </ol>
      {!g.cargoOffer && g.contracts.length === 0 && (
        <Empty>Nenhum contrato ainda. Propostas chegam de tempos em tempos e ficam 15 dias à espera.</Empty>
      )}
    </>
  );
}

function Licencas() {
  const g = useGameState();
  const act = useGame((s) => s.act);
  const pequeno = g.businessModel === 'pequeno';
  const cert = hasRegionalCert(g);
  return (
    <ol className="licenses">
      {pequeno && (
        <li className="has">
          <div>
            <b>Táxi aéreo</b>
            <small>Aviões de até 19 lugares, pistas curtas e de terra</small>
          </div>
          <Pill tone="ok">Ativa</Pill>
        </li>
      )}
      {pequeno && !cert && (
        <li className="next">
          <div>
            <b>Certificação regional</b>
            <small>Libera o ATR e o caminho das licenças Nacional e Internacional</small>
          </div>
          <div className="lic-buy">
            <Bar
              v={(Math.max(0, g.cash) / REGIONAL_CERT_COST) * 100}
              tone="teal"
              label={`Caixa até ${fmtMoney(REGIONAL_CERT_COST)}`}
            />
            <Btn
              kind="primary"
              small
              disabled={g.cash < REGIONAL_CERT_COST}
              onClick={() => act((s) => actions.buyRegionalCert(s))}
            >
              Obter {fmtMoney(REGIONAL_CERT_COST)}
            </Btn>
          </div>
        </li>
      )}
      {LICENSES.map((L) => {
        // no Pequeno porte, a licença Regional só vale depois da certificação
        const has = g.license >= L.tier && (!pequeno || cert);
        const next = L.tier === g.license + 1;
        const waitingCert = pequeno && !cert;
        const blocked = !waitingCert && L.tier > rules(g).maxLicense;
        return (
          <li key={L.tier} className={has ? 'has' : next && !waitingCert ? 'next' : ''}>
            <div>
              <b>{L.name}</b>
              <small>{L.desc}</small>
            </div>
            {has ? (
              <Pill tone="ok">Ativa</Pill>
            ) : waitingCert ? (
              <small>
                {L.tier === 0 ? 'Vem com a certificação regional' : 'Depois da certificação regional'}
              </small>
            ) : blocked ? (
              <small>Fora do modelo {BUSINESS_MODELS[g.businessModel].name}</small>
            ) : next ? (
              <div className="lic-buy">
                <Bar
                  v={(Math.max(0, g.cash) / L.cost) * 100}
                  tone="teal"
                  label={`Caixa até ${fmtMoney(L.cost)}`}
                />
                <Btn
                  kind="primary"
                  small
                  disabled={g.cash < L.cost}
                  onClick={() => act((s) => actions.buyLicense(s, L.tier))}
                >
                  Obter {fmtMoney(L.cost)}
                </Btn>
              </div>
            ) : (
              <small>{fmtMoney(L.cost)}</small>
            )}
          </li>
        );
      })}
    </ol>
  );
}
