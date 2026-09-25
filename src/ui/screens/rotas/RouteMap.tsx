import { useState, useSyncExternalStore } from 'react';
import {
  AIRPORTS,
  fmtMoney,
  hasIntlDivision,
  routeFreq,
  type AirportCode,
  type Route,
} from '../../../engine';
import { useGame, useGameState } from '../../../store/gameStore';
import { Segmented } from '../../components/Segmented';
import { COUNTRIES } from '../../map/world';

type ViewId = 'brasil' | 'mundo';

/** Enquadramento de cada vista (projeção equirretangular; `k` corrige a largura pela latitude média). */
interface View {
  lon0: number;
  lon1: number;
  lat0: number;
  lat1: number;
  k: number;
  /** unidades do viewBox por grau */
  s: number;
  /** tamanho da letra e dos pontos, em unidades do viewBox */
  font: number;
  dot: number;
}

const VIEWS: Record<ViewId, View> = {
  // todo o Brasil, de Cruzeiro do Sul a Fernando de Noronha, com um pouco dos vizinhos
  brasil: {
    lon0: -75,
    lon1: -31,
    lat0: 7,
    lat1: -35,
    k: Math.cos((15 * Math.PI) / 180),
    s: 10,
    font: 9,
    dot: 2.4,
  },
  // mapa-múndi sem a Antártida
  mundo: { lon0: -170, lon1: 180, lat0: 78, lat1: -56, k: 1, s: 2.5, font: 12, dot: 2.6 },
};

/** margem para as setas das rotas que saem da vista */
const EDGE = 14;
/** no máximo tantos aviõezinhos animados, para não pesar */
const MAX_PLANES = 30;

type Pt = { x: number; y: number };

function projector(v: View) {
  const w = (v.lon1 - v.lon0) * v.k * v.s;
  const h = (v.lat0 - v.lat1) * v.s;
  const p = (lon: number, lat: number): Pt => ({ x: (lon - v.lon0) * v.k * v.s, y: (v.lat0 - lat) * v.s });
  return { w, h, p };
}

/** Contornos dos países já projetados, um path por país (calculado uma vez por vista). */
const LAND: Record<ViewId, { br: boolean; d: string }[]> = (() => {
  const out = {} as Record<ViewId, { br: boolean; d: string }[]>;
  for (const id of Object.keys(VIEWS) as ViewId[]) {
    const { p } = projector(VIEWS[id]);
    out[id] = COUNTRIES.map((c) => ({
      br: c.br,
      d: c.rings
        .map((r) => {
          let s = '';
          let split = false;
          for (let i = 0; i < r.length; i += 2) {
            const q = p(r[i]!, r[i + 1]!);
            // salto pela linha de data (Fiji, Rússia): começa um traço novo em vez de cruzar o mapa
            const jump = i > 0 && Math.abs(r[i]! - r[i - 2]!) > 180;
            if (jump) split = true;
            s += `${i && !jump ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
          }
          return split ? s : s + 'Z';
        })
        .join(''),
    }));
  }
  return out;
})();

type Tone = 'good' | 'bad' | 'idle' | 'cargo';

function tone(r: Route): Tone {
  if (!r.planes.length) return 'idle';
  if (r.last?.flying && r.last.profit < 0) return 'bad';
  return r.kind === 'cargo' ? 'cargo' : 'good';
}

function subscribeMotion(cb: () => void) {
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// preferências de exibição do mapa (no aparelho, fora do save)
const SHOWN_KEY = 'asanorte-mapa';
const VIEW_KEY = 'asanorte-mapa-vista';
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, v: string): void {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* ignorado */
  }
}

/** Mapa minimalista das rotas da companhia. Clicar numa rota abre o editor dela na lista. */
export function RouteMap({ routes }: { routes: Route[] }) {
  const g = useGameState();
  const open = useGame((s) => s.routeOpen);
  const [shown, setShown] = useState(() => read(SHOWN_KEY) !== '0');
  const [pref, setPref] = useState<ViewId>(() => (read(VIEW_KEY) === 'mundo' ? 'mundo' : 'brasil'));
  const reduced = useSyncExternalStore(subscribeMotion, reducedMotion);
  const [hover, setHover] = useState<string | null>(null);

  // o mapa-múndi chega com a divisão Base internacional
  const world = hasIntlDivision(g);
  const viewId: ViewId = world ? pref : 'brasil';
  const view = VIEWS[viewId];
  const { w: W, h: H, p } = projector(view);
  const point = (c: AirportCode) => p(AIRPORTS[c].lon, AIRPORTS[c].lat);
  const inside = (q: Pt) => q.x >= 0 && q.x <= W && q.y >= 0 && q.y <= H;

  /** Ponto onde a reta de `a` (dentro da vista) até `b` (fora) cruza a borda, recuado pela margem. */
  const toEdge = (a: Pt, b: Pt): Pt => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let t = 1;
    if (dx > 0) t = Math.min(t, (W - EDGE - a.x) / dx);
    if (dx < 0) t = Math.min(t, (EDGE - a.x) / dx);
    if (dy > 0) t = Math.min(t, (H - EDGE - a.y) / dy);
    if (dy < 0) t = Math.min(t, (EDGE - a.y) / dy);
    return { x: a.x + dx * t, y: a.y + dy * t };
  };

  const toggle = () => {
    setShown(!shown);
    write(SHOWN_KEY, shown ? '0' : '1');
  };
  const pickView = (v: ViewId) => {
    setPref(v);
    write(VIEW_KEY, v);
  };
  const select = (id: string) => {
    useGame.setState({ routeOpen: id, routeForm: false });
    requestAnimationFrame(() =>
      document.getElementById(`rota-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
    );
  };

  // aeroportos a marcar: slots da companhia e pontas das rotas que caem dentro da vista
  const codes = new Set<AirportCode>();
  for (const c of g.slots) if (inside(point(c))) codes.add(c);
  const labeled = new Set<AirportCode>(g.hubs);
  for (const r of routes) {
    labeled.add(r.from);
    labeled.add(r.to);
    for (const c of [r.from, r.to]) if (inside(point(c))) codes.add(c);
  }

  const lines = routes
    .map((r) => {
      let a = point(r.from);
      let b = point(r.to);
      let abroad: { p: Pt; code: AirportCode } | null = null;
      const ia = inside(a);
      const ib = inside(b);
      if (!ia && !ib) return null; // as duas pontas fora da vista
      if (!ib) {
        b = toEdge(a, b);
        abroad = { p: b, code: r.to };
      } else if (!ia) {
        a = toEdge(b, a);
        abroad = { p: a, code: r.from };
      }
      const d = `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      return { r, d, abroad, tone: tone(r) };
    })
    .filter((x) => x !== null);
  const animate = g.speed > 0 && !reduced;
  const fs = view.font;

  return (
    <div className={`panel route-map v-${viewId}`}>
      <div className="map-head">
        <h2>Mapa</h2>
        {world && shown && (
          <Segmented
            label="Vista do mapa"
            value={viewId}
            options={[
              ['brasil', 'Brasil'],
              ['mundo', 'Mundo'],
            ]}
            onChange={pickView}
          />
        )}
        <button type="button" className="link" onClick={toggle} aria-expanded={shown}>
          {shown ? 'Ocultar mapa' : 'Mostrar mapa'}
        </button>
      </div>
      {shown && (
        <>
          <svg
            viewBox={`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`}
            role="img"
            aria-label={`Mapa ${viewId === 'mundo' ? 'mundial' : 'do Brasil'} com ${routes.length} ${
              routes.length === 1 ? 'rota' : 'rotas'
            }`}
          >
            {LAND[viewId].map((c, i) => (
              <path key={i} d={c.d} className={c.br ? 'map-land br' : 'map-land'} />
            ))}
            {lines.map(({ r, d, tone }) => (
              <path
                key={r.id}
                d={d}
                className={`map-route t-${tone}${r.id === open || r.id === hover ? ' on' : ''}`}
                style={{ strokeWidth: (1.1 + Math.min(routeFreq(r), 6) * 0.3) * (fs / 9) }}
              />
            ))}
            {animate &&
              lines
                .filter(({ r }) => r.last?.flying)
                .slice(0, MAX_PLANES)
                .map(({ r, d }) => (
                  <circle key={'p' + r.id} r={view.dot} className="map-plane">
                    <animateMotion
                      dur={`${(3 + r.dist / 700).toFixed(1)}s`}
                      repeatCount="indefinite"
                      path={d}
                      keyPoints="0;1;0"
                      keyTimes="0;0.5;1"
                      calcMode="linear"
                    />
                  </circle>
                ))}
            {[...codes].map((c) => {
              const q = point(c);
              const hub = g.hubs.includes(c);
              return (
                <g key={c} className={hub ? 'map-ap hub' : 'map-ap'}>
                  <circle cx={q.x} cy={q.y} r={hub ? view.dot * 1.75 : view.dot} />
                  {labeled.has(c) && (
                    <text x={q.x + fs * 0.55} y={q.y - fs * 0.45} style={{ fontSize: fs }}>
                      {c}
                    </text>
                  )}
                </g>
              );
            })}
            {lines
              .filter((x) => x.abroad)
              .map(({ r, abroad }) => (
                <g key={'x' + r.id} className="map-abroad">
                  <circle cx={abroad!.p.x} cy={abroad!.p.y} r={view.dot * 1.25} />
                  <text
                    x={abroad!.p.x}
                    // perto da borda de cima, o rótulo vai para baixo do ponto
                    y={abroad!.p.y < 24 ? abroad!.p.y + fs * 1.45 : abroad!.p.y - fs * 0.65}
                    textAnchor={abroad!.p.x > W - 30 ? 'end' : abroad!.p.x < 30 ? 'start' : 'middle'}
                    style={{ fontSize: fs }}
                  >
                    {abroad!.code}
                  </text>
                </g>
              ))}
            {/* área de clique larga por cima de cada rota */}
            {lines.map(({ r, d }) => (
              <path
                key={'h' + r.id}
                d={d}
                className="map-hit"
                onClick={() => select(r.id)}
                onPointerEnter={() => setHover(r.id)}
                onPointerLeave={() => setHover(null)}
              >
                <title>
                  {`${r.from} → ${r.to}${r.kind === 'cargo' ? ' (carga)' : ''} · ${
                    r.last?.flying
                      ? `${fmtMoney(r.last.profit)}/dia`
                      : r.planes.length
                        ? 'aguardando'
                        : 'sem aeronave'
                  }`}
                </title>
              </path>
            ))}
          </svg>
          <ul className="map-legend" aria-hidden="true">
            <li className="t-good">passageiros</li>
            {routes.some((r) => r.kind === 'cargo') && <li className="t-cargo">carga</li>}
            <li className="t-bad">no prejuízo</li>
            <li className="t-idle">sem aeronave</li>
            <li className="hub">hub</li>
          </ul>
        </>
      )}
    </div>
  );
}
