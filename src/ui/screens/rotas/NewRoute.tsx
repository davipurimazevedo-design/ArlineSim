import { useState } from 'react';
import {
  actions,
  AIRPORTS,
  BUSINESS_MODELS,
  createRoute,
  acquireBlock,
  fmtDec,
  fmtReais,
  hasCargoDivision,
  isFreighter,
  fmtInt,
  fmtMoney,
  MODEL_KEYS,
  MODELS,
  maxFreqFor,
  overlapsOf,
  planRoute,
  routeOfPlane,
  runwayIssue,
  type AirportCode,
  type ModelKey,
  type RouteKind,
} from '../../../engine';
import { useGame, useGameState } from '../../../store/gameStore';
import { AirportPicker } from '../../components/AirportPicker';
import { Btn } from '../../components/Btn';
import { Money } from '../../components/Money';
import { Segmented } from '../../components/Segmented';
import { overlapNames } from './overlapText';

/** Aeronave escolhida: da frota ("p:<id>") ou arrendar nova ("m:<modelo>"). */
type PlaneChoice = '' | `p:${string}` | `m:${ModelKey}`;

/** Criador de rotas: origem, destino e aeronave; compra os slots que faltam e abre a rota de uma vez. */
export function NewRoute({ onDone }: { onDone: () => void }) {
  const g = useGameState();
  const act = useGame((s) => s.act);
  const [from, setFrom] = useState<AirportCode | ''>(g.hub);
  const [to, setTo] = useState<AirportCode | ''>('');
  const [kind, setKindState] = useState<RouteKind>('pax');
  const cargo = kind === 'cargo';
  const fits = (model: ModelKey) => isFreighter(model) === cargo;
  const firstChoice = (k: RouteKind): PlaneChoice => {
    const idle = g.fleet.find((p) => !routeOfPlane(g, p.id) && isFreighter(p.model) === (k === 'cargo'));
    if (idle) return `p:${idle.id}`;
    const m = MODEL_KEYS.find((x) => isFreighter(x) === (k === 'cargo') && !acquireBlock(g, x));
    return m ? `m:${m}` : '';
  };
  const [choice, setChoice] = useState<PlaneChoice>(() => firstChoice('pax'));
  const setKind = (k: RouteKind) => {
    setKindState(k);
    setChoice(firstChoice(k));
  };

  const planeId = choice.startsWith('p:') ? choice.slice(2) : null;
  const leaseModel = choice.startsWith('m:') ? (choice.slice(2) as ModelKey) : null;
  const args = from && to ? { from, to, planeId, leaseModel, kind } : null;
  const plan = args ? planRoute(g, args) : null;
  const overlaps =
    plan && plan.dist && from && to
      ? overlapsOf(g, {
          id: '',
          kind,
          from,
          to,
          dist: plan.dist,
          planes: [],
          price: 0,
          priceJ: 0,
          service: 1,
          ai: 0,
          rivals: [],
          opened: 0,
          last: null,
        })
      : [];

  const leasable = MODEL_KEYS.filter((k) => fits(k) && !acquireBlock(g, k));
  const fleet = g.fleet.filter((p) => fits(p.model));

  return (
    <div className="panel route-creator">
      {hasCargoDivision(g) && (
        <Segmented
          label="Tipo de rota"
          value={kind}
          options={[
            ['pax', 'Passageiros'],
            ['cargo', 'Carga'],
          ]}
          onChange={setKind}
        />
      )}
      <div className="rc-grid">
        <AirportPicker label="Origem" value={from} onChange={setFrom} owned={g.slots} />
        <AirportPicker
          label="Destino"
          value={to}
          onChange={setTo}
          owned={g.slots}
          exclude={from ? [from] : []}
        />
        <div className="field">
          <label htmlFor="rc-plane">Aeronave</label>
          <select id="rc-plane" value={choice} onChange={(e) => setChoice(e.target.value as PlaneChoice)}>
            {choice === '' && <option value="">Nenhuma aeronave disponível</option>}
            {fleet.length > 0 && (
              <optgroup label="Da sua frota">
                {fleet.map((p) => {
                  const m = MODELS[p.model];
                  const used = routeOfPlane(g, p.id);
                  const ok =
                    (!plan?.dist || (plan.dist <= m.range && maxFreqFor(g, p.model, plan.dist) > 0)) &&
                    !(from && to && runwayIssue(p.model, [from, to]));
                  return (
                    <option key={p.id} value={`p:${p.id}`} disabled={!ok}>
                      {p.reg} · {m.name}
                      {used ? ` (em ${used.from}–${used.to})` : ''}
                      {ok ? '' : ' — sem alcance ou pista'}
                    </option>
                  );
                })}
              </optgroup>
            )}
            <optgroup label="Arrendar agora">
              {leasable.map((k) => (
                <option key={k} value={`m:${k}`}>
                  {MODELS[k].name} · depósito {fmtMoney(actions.leaseDeposit(k))} ·{' '}
                  {fmtMoney(MODELS[k].lease)}/dia
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {plan && plan.dist > 0 && (
        <>
          <div className="facts">
            <div>
              <small>Distância</small>
              <b className="num">{fmtInt(plan.dist)} km</b>
            </div>
            <div>
              <small>Demanda total</small>
              <b className="num">
                {cargo ? `${fmtDec(plan.demand)} t/dia` : `${fmtInt(plan.demand)} pax/dia`}
              </b>
            </div>
            <div>
              <small>{cargo ? 'Frete de mercado' : 'Tarifa de mercado'}</small>
              <b className="num">{cargo ? `${fmtReais(plan.fair)}/t` : fmtMoney(plan.fair)}</b>
            </div>
            {plan.preview && (
              <div>
                <small>Resultado estimado</small>
                <Money v={plan.preview.profit} signed />
                <small>
                  {cargo ? `${fmtDec(plan.preview.tons)} t` : `${fmtInt(plan.preview.pax)} pax`} ·{' '}
                  {Math.round(plan.preview.share * 100)}% do mercado · {plan.preview.freq}× por dia
                </small>
              </div>
            )}
          </div>

          <ul className="rc-costs" aria-label="Custos para abrir a rota">
            {plan.slots.map((x) => (
              <li key={x.code}>
                <span>
                  Slots em {AIRPORTS[x.code].city} ({x.code})
                </span>
                <b className="num">{fmtMoney(x.cost)}</b>
              </li>
            ))}
            {plan.deposit > 0 && leaseModel && (
              <li>
                <span>Depósito do leasing do {MODELS[leaseModel].name}</span>
                <b className="num">{fmtMoney(plan.deposit)}</b>
              </li>
            )}
            <li className="total">
              <span>Sai do caixa agora</span>
              <b className="num">{plan.total ? fmtMoney(plan.total) : 'nada'}</b>
            </li>
            {(plan.newSlotFees > 0 || leaseModel) && (
              <li className="daily">
                <span>Custos fixos novos por dia</span>
                <small className="num">
                  {[
                    plan.newSlotFees > 0 ? `slots ${fmtMoney(plan.newSlotFees)}` : '',
                    leaseModel ? `leasing ${fmtMoney(MODELS[leaseModel].lease)}` : '',
                  ]
                    .filter(Boolean)
                    .join(' + ')}
                </small>
              </li>
            )}
          </ul>
        </>
      )}

      {plan?.error ? (
        <p className="warn-line" role="alert">
          {plan.error}
        </p>
      ) : (
        overlaps.length > 0 && (
          <p className="warn-line" role="note">
            Vai disputar {cargo ? 'carga' : 'passageiros'} com {overlapNames(overlaps)}.
          </p>
        )
      )}
      {!args && (
        <p className="note">Escolha a origem e o destino. Os slots que faltarem são comprados junto.</p>
      )}
      {g.businessModel !== 'tradicional' && (
        <p className="note">
          Modelo {BUSINESS_MODELS[g.businessModel].name}: só aparecem as aeronaves que ele opera.
        </p>
      )}

      <Btn
        kind="primary"
        disabled={!args || !plan || !!plan.error}
        onClick={() => {
          if (args && !act((s) => createRoute(s, args))) onDone();
        }}
      >
        {plan?.total ? `Criar rota · ${fmtMoney(plan.total)}` : 'Criar rota'}
      </Btn>
    </div>
  );
}
