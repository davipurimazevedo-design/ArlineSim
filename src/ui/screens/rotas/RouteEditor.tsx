import { useId } from 'react';
import {
  actions,
  fairPrice,
  fairPriceJ,
  fmtMoney,
  maxFreq,
  MODELS,
  routeProfit,
  SERVICE,
  simRoute,
  fmtInt,
  type Route,
  type ServiceLevel,
} from '../../../engine';
import type { RoutePatch } from '../../../engine/actions';
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

  const p = g.fleet.find((x) => x.id === r.planeId);
  const m = p && MODELS[p.model];
  const fp = fairPrice(r.dist);
  // previsão ao vivo: simRoute sobre o estado atual
  const prev = p ? simRoute(g, r) : null;
  const prevProfit = prev?.flying ? routeProfit(g, r, prev) : null;
  const mf = m ? maxFreq(m, r.dist) : 1;
  const upd = (patch: RoutePatch) => act((s) => actions.updateRoute(s, r.id, patch));
  const hasJ = !!m && m.j > 0 && g.license >= 2;

  return (
    <div className="editor">
      <label className="field" htmlFor={uid + 'plane'}>
        <span>Aeronave</span>
        <PlaneSelect id={uid + 'plane'} value={r.planeId} dist={r.dist} onChange={(v) => upd({ planeId: v })} />
      </label>
      <div className="field">
        <span>Frequência (idas e voltas/dia)</span>
        <Stepper value={r.freq} min={1} max={mf} disabled={!p} onChange={(v) => upd({ freq: v })} label="Frequência" />
      </div>
      <label className="field wide" htmlFor={uid + 'price'}>
        <span>
          Tarifa econômica <b className="num">{fmtMoney(r.price)}</b> <small>referência de mercado {fmtMoney(fp)}</small>
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
      {hasJ && (
        <label className="field wide" htmlFor={uid + 'priceJ'}>
          <span>
            Tarifa executiva <b className="num">{fmtMoney(r.priceJ)}</b> <small>referência {fmtMoney(fairPriceJ(r.dist))}</small>
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
      <div className="field">
        <span>Serviço de bordo</span>
        <Segmented label="Serviço de bordo" value={r.service} options={SERVICE_OPTIONS} onChange={(v) => upd({ service: v })} />
      </div>
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
          <small>{p ? (prev?.reason ?? '') + '. Sem previsão enquanto a rota não voa.' : 'Escale uma aeronave para ver a previsão.'}</small>
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
