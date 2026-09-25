import { useId, useState } from 'react';
import {
  actions,
  routeFair,
  routeFairJ,
  cargoFair,
  fmtDec,
  fmtReais,
  fmtInt,
  fmtMoney,
  maxFreqFor,
  rules,
  MODELS,
  routeFreq,
  routePlanes,
  routeProfit,
  routeTouchesHub,
  connectionFactor,
  overlapsOf,
  rivalShares,
  CODESHARE_PARTNER,
  isIntlPair,
  seatsOf,
  SERVICE,
  simRoute,
  type RoutePatch,
  type Route,
  type ServiceLevel,
} from '../../../engine';
import { useGame, useGameState } from '../../../store/gameStore';
import { CellBar } from '../../components/Bar';
import { Btn } from '../../components/Btn';
import { Money } from '../../components/Money';
import { Segmented } from '../../components/Segmented';
import { Stepper } from '../../components/Stepper';
import { overlapNames } from './overlapText';
import { PlaneSelect } from './PlaneSelect';

const SERVICE_OPTIONS = SERVICE.map((sv, i) => [i as ServiceLevel, sv.name] as const);

export function RouteEditor({ r }: { r: Route }) {
  const g = useGameState();
  const act = useGame((s) => s.act);
  const ask = useGame((s) => s.ask);
  const uid = useId();
  const [adding, setAdding] = useState<string | null>(null);

  const assigned = routePlanes(g, r);
  const cargo = r.kind === 'cargo';
  const fp = cargo ? cargoFair(r.from, r.to, r.dist) : routeFair(r.from, r.to, r.dist);
  const step = cargo ? 10 : 5;
  // previsão ao vivo: simRoute sobre o estado atual
  const prev = assigned.length ? simRoute(g, r) : null;
  const prevProfit = prev?.flying ? routeProfit(g, r, prev) : null;
  const upd = (patch: RoutePatch) => act((s) => actions.updateRoute(s, r.id, patch));
  const hasJ = g.license >= 2 && assigned.some(({ p }) => seatsOf(p).j > 0);
  const services = SERVICE_OPTIONS.filter(([k]) => rules(g).services.includes(k));

  return (
    <div className="editor">
      <div className="field full">
        <span>
          Aeronaves <small>{assigned.length ? `${routeFreq(r)} idas e voltas/dia no total` : ''}</small>
        </span>
        {assigned.length > 0 && (
          <ul className="route-planes">
            {assigned.map(({ p, freq }) => {
              const m = MODELS[p.model];
              return (
                <li key={p.id}>
                  <div>
                    <b>{p.reg}</b>
                    <small>
                      {m.name}
                      {p.maint > 0 ? ` · em manutenção (${p.maint} dias)` : ''}
                    </small>
                  </div>
                  <Stepper
                    value={freq}
                    min={1}
                    max={maxFreqFor(g, p.model, r.dist)}
                    onChange={(v) => act((s) => actions.setPlaneFreq(s, r.id, p.id, v))}
                    label={`Frequência do ${p.reg}`}
                  />
                  <Btn
                    small
                    kind="ghost danger"
                    onClick={() => act((s) => actions.unassignFromRoute(s, r.id, p.id))}
                  >
                    Tirar
                  </Btn>
                </li>
              );
            })}
          </ul>
        )}
        <div className="add-plane">
          <PlaneSelect
            id={uid + 'plane'}
            value={adding}
            dist={r.dist}
            airports={[r.from, r.to]}
            exclude={assigned.map(({ p }) => p.id)}
            kind={r.kind}
            emptyLabel={assigned.length ? 'Escalar mais uma aeronave…' : 'Escolha uma aeronave…'}
            onChange={setAdding}
          />
          <Btn
            small
            kind="primary"
            disabled={!adding}
            onClick={() => {
              if (adding && !act((s) => actions.assignPlane(s, r.id, adding))) setAdding(null);
            }}
          >
            Escalar
          </Btn>
        </div>
      </div>
      <label className="field wide" htmlFor={uid + 'price'} data-tut-target="tarifa">
        <span>
          {cargo ? 'Frete por tonelada' : 'Tarifa econômica'}{' '}
          <b className="num">{cargo ? fmtReais(r.price) : fmtMoney(r.price)}</b>{' '}
          <small>referência de mercado {cargo ? fmtReais(fp) : fmtMoney(fp)}</small>
        </span>
        <input
          id={uid + 'price'}
          type="range"
          min={Math.round((fp * 0.5) / step) * step}
          max={Math.round((fp * 1.6) / step) * step}
          step={step}
          value={r.price}
          onChange={(e) => upd({ price: +e.target.value })}
        />
      </label>
      {!cargo && (
        <div className="field">
          <span>Serviço de bordo</span>
          <Segmented
            label="Serviço de bordo"
            value={r.service}
            options={services}
            onChange={(v) => upd({ service: v })}
          />
        </div>
      )}
      {hasJ && (
        <label className="field wide" htmlFor={uid + 'priceJ'}>
          <span>
            Tarifa executiva <b className="num">{fmtMoney(r.priceJ)}</b>{' '}
            <small>referência {fmtMoney(routeFairJ(r.from, r.to, r.dist))}</small>
          </span>
          <input
            id={uid + 'priceJ'}
            type="range"
            min={Math.round(fp * 1.75)}
            max={Math.round(fp * 5.6)}
            step={10}
            value={r.priceJ}
            onChange={(e) => upd({ priceJ: +e.target.value })}
          />
        </label>
      )}
      <p className="note full hub-note">
        {cargo
          ? routeTouchesHub(g, r)
            ? 'Rota de carga saindo de hub: manutenção na base. Carga não faz conexão; pesam a frequência e a condição dos cargueiros.'
            : `Rota de carga ponto a ponto${g.businessModel === 'lowcost' ? '' : ': pernoite da tripulação (+20%)'}. Carga não faz conexão; pesam a frequência e a condição dos cargueiros.`
          : routeTouchesHub(g, r)
            ? `Rota de hub: conexões +${Math.round((connectionFactor(g, r) - 1) * 100)}% de demanda e manutenção na base.`
            : g.businessModel === 'lowcost'
              ? 'Rota ponto a ponto, sem pernoite (Low-cost).'
              : 'Rota ponto a ponto: sem conexões e com pernoite (tripulação +20%). Abra um hub numa das pontas para evitar.'}
      </p>
      {prev?.flying && prev.overlap < 0.995 && (
        <p className="warn-line full" role="note">
          Divide {cargo ? 'carga' : 'passageiros'} com {overlapNames(overlapsOf(g, r))}: demanda −
          {Math.round((1 - prev.overlap) * 100)}%.
        </p>
      )}
      {prev?.flying && (
        <div className="field full">
          <span>Concorrência</span>
          <ul className="rivals">
            <li className="me">
              <div>
                <b>{g.name}</b>
                <small>você</small>
              </div>
              <CellBar v={prev.share * 100} tone="teal" label={`Share de ${g.name}`} />
            </li>
            {rivalShares(r, prev.share).map((x) => (
              <li key={x.id}>
                <div>
                  <b>{x.name}</b>
                  <small>
                    {g.codeshare && x.id === CODESHARE_PARTNER && isIntlPair(r.from, r.to)
                      ? 'parceira de codeshare'
                      : x.style}
                  </small>
                </div>
                <CellBar v={x.share * 100} tone="mid" label={`Share de ${x.name}`} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="preview" aria-live="polite">
        {prev?.flying && prevProfit !== null ? (
          <>
            <div>
              <small>Previsão</small>
              <b className="num">
                {cargo ? `${fmtDec(prev.tons)} t` : `${fmtInt(prev.pax + prev.paxJ)} pax`} ·{' '}
                {Math.round(prev.share * 100)}% do mercado
              </b>
            </div>
            <div>
              <small>Resultado estimado</small>
              <Money v={prevProfit} signed />
            </div>
          </>
        ) : (
          <small>
            {prev
              ? prev.reason + '. Sem previsão enquanto a rota não voa.'
              : 'Escale uma aeronave para ver a previsão.'}
          </small>
        )}
        <Btn
          kind="ghost danger"
          small
          onClick={() =>
            ask({
              text: `Encerrar ${r.from}–${r.to}? A reputação cai 1 ponto.`,
              okLabel: 'Encerrar rota',
              danger: true,
              onOk: () => act((s) => actions.closeRoute(s, r.id)),
            })
          }
        >
          Encerrar rota
        </Btn>
      </div>
    </div>
  );
}
