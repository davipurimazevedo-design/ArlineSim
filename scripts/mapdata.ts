// Gera src/ui/map/world.ts a partir do countries-110m.json do pacote world-atlas
// (Natural Earth, domínio público; world-atlas sob licença ISC).
//   npx tsx scripts/mapdata.ts <caminho do countries-110m.json>
// Decodifica o TopoJSON, simplifica os contornos (Douglas-Peucker) e grava coordenadas
// com uma casa decimal. Sem dependências.
import { readFileSync, writeFileSync } from 'node:fs';

type Pos = [number, number];
interface Topology {
  transform: { scale: Pos; translate: Pos };
  arcs: Pos[][];
  objects: {
    countries: {
      geometries: {
        type: string;
        id?: string;
        arcs: number[][] | number[][][];
        properties: { name: string };
      }[];
    };
  };
}

const file = process.argv[2];
if (!file) throw new Error('Informe o caminho do countries-110m.json');
const topo = JSON.parse(readFileSync(file, 'utf8')) as Topology;
const { scale, translate } = topo.transform;

/** arcos quantizados e com deltas → coordenadas absolutas */
const arcs: Pos[][] = topo.arcs.map((arc) => {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]] as Pos;
  });
});

function arcCoords(i: number): Pos[] {
  const a = i >= 0 ? arcs[i]! : [...arcs[~i]!].reverse();
  return a;
}

function ring(indices: number[]): Pos[] {
  const out: Pos[] = [];
  for (const i of indices) {
    const pts = arcCoords(i);
    out.push(...(out.length ? pts.slice(1) : pts));
  }
  return out;
}

/** Douglas-Peucker: remove pontos a menos de `tol` graus da reta entre os vizinhos mantidos */
function simplify(pts: Pos[], tol: number): Pos[] {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = pts[a]!;
    const [bx, by] = pts[b]!;
    const len = Math.hypot(bx - ax, by - ay);
    let best = -1;
    let far = 0;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i]!;
      // anel fechado (primeiro = último): mede a distância ao ponto, não a um segmento nulo
      const d =
        len < 1e-9
          ? Math.hypot(px - ax, py - ay)
          : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (d > far) {
        far = d;
        best = i;
      }
    }
    if (far > tol && best > 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

const BRAZIL_ID = '076';
const round = (v: number) => Math.round(v * 10) / 10;

interface Country {
  br: boolean;
  rings: number[][];
}
const countries: Country[] = [];
let points = 0;
for (const g of topo.objects.countries.geometries) {
  if (g.properties.name === 'Antarctica') continue; // fora do mapa do jogo
  const polys = (g.type === 'Polygon' ? [g.arcs] : g.arcs) as number[][][];
  const br = g.id === BRAZIL_ID;
  const rings: number[][] = [];
  for (const poly of polys) {
    // só o contorno externo de cada polígono (lagos e buracos não aparecem nesta escala)
    const outer = simplify(ring(poly[0]!), br ? 0.08 : 0.25);
    if (outer.length < 4) continue;
    const flat = outer.flatMap(([x, y]) => [round(x), round(y)]);
    rings.push(flat);
    points += outer.length;
  }
  if (rings.length) countries.push({ br, rings });
}
// o Brasil por último: desenhado por cima dos vizinhos
countries.sort((a, b) => Number(a.br) - Number(b.br));

const body = countries
  .map((c) => `  { br: ${c.br}, rings: [${c.rings.map((r) => `[${r.join(',')}]`).join(',')}] },`)
  .join('\n');
writeFileSync(
  'src/ui/map/world.ts',
  `// Gerado por scripts/mapdata.ts a partir do world-atlas (countries-110m, Natural Earth, domínio público).
// Contornos simplificados, em [lon, lat, lon, lat, ...] com uma casa decimal. Não editar à mão.
// prettier-ignore
export const COUNTRIES: { br: boolean; rings: number[][] }[] = [
${body}
];
`,
);
console.log(`${countries.length} países, ${points} pontos`);
