import { useId, useState } from 'react';
import {
  actions,
  AIRPORTS,
  baseDemand,
  dist,
  fairPrice,
  fmtInt,
  fmtMoney,
  MODELS,
  REGIONAL_MAX_KM,
  routeExists,
  routeOfPlane,
  overlapsOf,
  type AirportCode,
} from '../../../engine';
import { useGame } from '../../../store/gameStore';
import { Btn } from '../../components/Btn';
import { overlapNames } from './overlapText';
import { PlaneSelect } from './PlaneSelect';

export function NewRoute({ onDone }: { onDone: () => void }) {
  const g = useGame((s) => s.game!);
  const act = useGame((s) => s.act);
  const uid = useId();
  const [from, setFrom] = useState<AirportCode>(g.hub);
  const [to, setTo] = useState<AirportCode | ''>(g.slots.find((c) => c !== g.hub) ?? '');
  const idle = g.fleet.find((p) => !routeOfPlane(g, p.id));
  const [plane, setPlane] = useState<string | null>(idle?.id ?? null);

  const d = to && from !== to ? dist(from, to) : 0;
  const p = g.fleet.find((x) => x.id === plane);
  const m = p && MODELS[p.model];

  // rotas próprias que disputariam passageiros com a nova
  const overlaps =
    to && d
      ? overlapsOf(g, {
          id: '',
          from,
          to,
          dist: d,
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

  let warn = '';
  if (g.slots.length < 2) warn = 'Compre slots em outro aeroporto no Mercado.';
  else if (!to || !d) warn = 'Escolha dois aeroportos diferentes.';
  else if (g.license === 0 && d > REGIONAL_MAX_KM) warn = 'A licença regional limita rotas a 1.500 km.';
  else if (m && d > m.range) warn = `Fora do alcance do ${m.name} (${fmtInt(m.range)} km).`;
  else if (routeExists(g, from, to)) warn = 'Essa rota já existe.';

  const options = g.slots.map((c) => (
    <option key={c} value={c}>
      {c} · {AIRPORTS[c].city}
    </option>
  ));

  return (
    <div className="panel new-route">
      <label className="field" htmlFor={uid + 'from'}>
        <span>Origem</span>
        <select id={uid + 'from'} value={from} onChange={(e) => setFrom(e.target.value as AirportCode)}>
          {options}
        </select>
      </label>
      <label className="field" htmlFor={uid + 'to'}>
        <span>Destino</span>
        <select id={uid + 'to'} value={to} onChange={(e) => setTo(e.target.value as AirportCode | '')}>
          <option value="">—</option>
          {options}
        </select>
      </label>
      <label className="field" htmlFor={uid + 'plane'}>
        <span>Aeronave</span>
        <PlaneSelect id={uid + 'plane'} value={plane} dist={d} onChange={setPlane} />
      </label>
      <div className="facts">
        <div>
          <small>Distância</small>
          <b className="num">{d ? fmtInt(d) + ' km' : '—'}</b>
        </div>
        <div>
          <small>Demanda total</small>
          <b className="num">{d && to ? fmtInt(baseDemand(from, to)) + ' pax/dia' : '—'}</b>
        </div>
        <div>
          <small>Tarifa de mercado</small>
          <b className="num">{d ? fmtMoney(fairPrice(d)) : '—'}</b>
        </div>
      </div>
      {!warn && overlaps.length > 0 && (
        <p className="warn-line" role="note">
          Vai disputar passageiros com {overlapNames(overlaps)}.
        </p>
      )}
      {warn && (
        <p className="warn-line" role="alert">
          {warn}
        </p>
      )}
      <Btn
        kind="primary"
        disabled={!!warn}
        onClick={() => {
          if (to && !act((s) => actions.openRoute(s, { from, to, planeId: plane }))) onDone();
        }}
      >
        Abrir rota
      </Btn>
    </div>
  );
}
