import { useId, useState } from 'react';
import {
  actions,
  fairPrice,
  fairPriceJ,
  fmtInt,
  fmtMoney,
  maxFreq,
  MODELS,
  routeFreq,
  routePlanes,
  routeProfit,
  SERVICE,
  simRoute,
  type RoutePatch,
  type Route,
  type ServiceLevel,
} from '../../../engine';
import { useGame } from '../../../store/gameStore';
import { Btn } from '../../components/Btn';
import { Money } from '../../components/Money';
import { Segmented } from '../../components/Segmented';
import { Stepper } from '../../components/Stepper';
import { PlaneSelect } from './PlaneSelect';

const SERVICE_OPTIONS = SERVICE.map((sv, i) => [i as ServiceLevel, sv.name] as const);

export function RouteEditor({ r }: { r: Route }) {
  const g = useGame((s) => s.game!);
  const act = useGame((s) => s.act);
  const ask = useGame((s) => s.ask);
  const uid = useId();
  const [adding, setAdding] = useState<string | null>(null);

  const assigned = routePlanes(g, r);
  const fp = fairPrice(r.dist);
  // previsão ao vivo: simRoute sobre o estado atual
  const prev = assigned.length ? simRoute(g, r) : null;
  const prevProfit = prev?.flying ? routeProfit(g, r, prev) : null;
  const upd = (patch: RoutePatch) => act((s) => actions.updateRoute(s, r.id, patch));
  const hasJ = g.license >= 2 && assigned.some(({ p }) => MODELS[p.model].j > 0);

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
                    max={maxFreq(m, r.dist)}
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
            exclude={assigned.map(({ p }) => p.id)}
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
      <label className="field wide" htmlFor={uid + 'price'}>
        <span>
          Tarifa econômica <b className="num">{fmtMoney(r.price)}</b>{' '}
          <small>referência de mercado {fmtMoney(fp)}</small>
        </span>
        <input
          id={uid + 'price'}
          type="range"
          min={Math.round((fp * 0.5) / 5) * 5}
          max={Math.round((fp * 1.6) / 5) * 5}
          step={5}
          value={r.price}
          onChange={(e) => upd({ price: +e.target.value })}
        />
      </label>
      <div className="field">
        <span>Serviço de bordo</span>
        <Segmented
          label="Serviço de bordo"
          value={r.service}
          options={SERVICE_OPTIONS}
          onChange={(v) => upd({ service: v })}
        />
      </div>
      {hasJ && (
        <label className="field wide" htmlFor={uid + 'priceJ'}>
          <span>
            Tarifa executiva <b className="num">{fmtMoney(r.priceJ)}</b>{' '}
            <small>referência {fmtMoney(fairPriceJ(r.dist))}</small>
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
      <div className="preview" aria-live="polite">
        {prev?.flying && prevProfit !== null ? (
          <>
            <div>
              <small>Previsão</small>
              <b className="num">
                {fmtInt(prev.pax + prev.paxJ)} pax · {Math.round(prev.share * 100)}% do mercado
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
