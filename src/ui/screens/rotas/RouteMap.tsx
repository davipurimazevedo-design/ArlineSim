import { useState, useSyncExternalStore } from 'react';
import { AIRPORTS, fmtMoney, routeFreq, type AirportCode, type Route } from '../../../engine';
import { useGame, useGameState } from '../../../store/gameStore';
import { BRAZIL_OUTLINE } from './brazil';

// Enquadramento: todo o Brasil, de Cruzeiro do Sul a Fernando de Noronha.
const LON0 = -74.5;
const LON1 = -31.5;
const LAT0 = 6;
const LAT1 = -34.5;
/** projeção equirretangular corrigida pela latitude média do país (~15° S) */
const K = Math.cos((15 * Math.PI) / 180);
const S = 10; // unidades do viewBox por grau
const W = (LON1 - LON0) * K * S;
const H = (LAT0 - LAT1) * S;
/** margem para as setas das rotas internacionais */
const EDGE = 14;
/** no máximo tantos aviõezinhos animados, para não pesar */
const MAX_PLANES = 30;

const px = (lon: number) => (lon - LON0) * K * S;
const py = (lat: number) => (LAT0 - lat) * S;

const OUTLINE_PATH =
  BRAZIL_OUTLINE.map(([lon, lat], i) => `${i ? 'L' : 'M'}${px(lon).toFixed(1)} ${py(lat).toFixed(1)}`).join(
    '',
  ) + 'Z';

type Pt = { x: number; y: number };

function point(code: AirportCode): Pt {
  const a = AIRPORTS[code];
  return { x: px(a.lon), y: py(a.lat) };
}

const inside = (p: Pt) => p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H;

/** Ponto onde a reta de `a` (dentro do mapa) até `b` (fora) cruza a borda, recuado pela margem. */
function toEdge(a: Pt, b: Pt): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t = 1;
  if (dx > 0) t = Math.min(t, (W - EDGE - a.x) / dx);
  if (dx < 0) t = Math.min(t, (EDGE - a.x) / dx);
  if (dy > 0) t = Math.min(t, (H - EDGE - a.y) / dy);
  if (dy < 0) t = Math.min(t, (EDGE - a.y) / dy);
  return { x: a.x + dx * t, y: a.y + dy * t };
}

/** Arco suave entre dois pontos (curva para um lado, proporcional à distância). */
function arc(a: Pt, b: Pt): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const bend = 0.18;
  const cx = mx - dy * bend;
  const cy = my + dx * bend;
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

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

const MAP_KEY = 'asanorte-mapa';
function loadShown(): boolean {
  try {
    return localStorage.getItem(MAP_KEY) !== '0';
  } catch {
    return true;
  }
}

/** Mapa minimalista das rotas da companhia. Clicar numa rota abre o editor dela na lista. */
export function RouteMap({ routes }: { routes: Route[] }) {
  const g = useGameState();
  const open = useGame((s) => s.routeOpen);
  const [shown, setShown] = useState(loadShown);
  const reduced = useSyncExternalStore(subscribeMotion, reducedMotion);
  const [hover, setHover] = useState<string | null>(null);

  const toggle = () => {
    const v = !shown;
    setShown(v);
    try {
      localStorage.setItem(MAP_KEY, v ? '1' : '0');
    } catch {
      /* ignorado */
    }
  };

  const select = (id: string) => {
    useGame.setState({ routeOpen: id, routeForm: false });
    requestAnimationFrame(() =>
      document.getElementById(`rota-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
    );
  };

  // aeroportos a marcar: slots da companhia (domésticos) e pontas das rotas
  const codes = new Set<AirportCode>(g.slots.filter((c) => !AIRPORTS[c].intl));
  for (const r of routes) {
    if (!AIRPORTS[r.from].intl) codes.add(r.from);
    if (!AIRPORTS[r.to].intl) codes.add(r.to);
  }
  const labeled = new Set<AirportCode>(g.hubs);
  for (const r of routes) {
    labeled.add(r.from);
    labeled.add(r.to);
  }

  // rota entre dois aeroportos no exterior (hub fora do Brasil) não cabe no mapa
  const shownRoutes = routes.filter((r) => !(AIRPORTS[r.from].intl && AIRPORTS[r.to].intl));
  const lines = shownRoutes.map((r) => {
    let a = point(r.from);
    let b = point(r.to);
    let abroad: { p: Pt; code: AirportCode } | null = null;
    if (!inside(b)) {
      b = toEdge(a, b);
      abroad = { p: b, code: r.to };
    } else if (!inside(a)) {
      a = toEdge(b, a);
      abroad = { p: a, code: r.from };
    }
    return { r, d: arc(a, b), abroad, tone: tone(r) };
  });
  const animate = g.speed > 0 && !reduced;

  return (
    <div className="panel route-map">
      <div className="map-head">
        <h2>Mapa</h2>
        <button type="button" className="link" onClick={toggle} aria-expanded={shown}>
          {shown ? 'Ocultar mapa' : 'Mostrar mapa'}
        </button>
      </div>
      {shown && (
        <>
          <svg
            viewBox={`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`}
            role="img"
            aria-label={`Mapa das rotas: ${routes.length} ${routes.length === 1 ? 'rota' : 'rotas'}`}
          >
            <path d={OUTLINE_PATH} className="map-land" />
            {lines.map(({ r, d, tone }) => (
              <path
                key={r.id}
                d={d}
                className={`map-route t-${tone}${r.id === open || r.id === hover ? ' on' : ''}`}
                style={{ strokeWidth: 1.2 + Math.min(routeFreq(r), 6) * 0.35 }}
              />
            ))}
            {animate &&
              lines
                .filter(({ r }) => r.last?.flying)
                .slice(0, MAX_PLANES)
                .map(({ r, d }) => (
                  <circle key={'p' + r.id} r={2.4} className="map-plane">
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
              const p = point(c);
              const hub = g.hubs.includes(c);
              return (
                <g key={c} className={hub ? 'map-ap hub' : 'map-ap'}>
                  <circle cx={p.x} cy={p.y} r={hub ? 4.2 : 2.4} />
                  {labeled.has(c) && (
                    <text x={p.x + 5} y={p.y - 4}>
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
                  <circle cx={abroad!.p.x} cy={abroad!.p.y} r={3} />
                  <text
                    x={abroad!.p.x}
                    // perto da borda de cima, o rótulo vai para baixo do ponto
                    y={abroad!.p.y < 24 ? abroad!.p.y + 13 : abroad!.p.y - 6}
                    textAnchor={abroad!.p.x > W - 30 ? 'end' : abroad!.p.x < 30 ? 'start' : 'middle'}
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
