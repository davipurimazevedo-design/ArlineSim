// Gera os ícones do PWA a partir da marca do topo: quadrado azul girado 45° com o avião branco.
//   npx tsx scripts/icons.ts   → public/icons/*.png e public/favicon.svg
// Sem dependências: rasteriza com supersampling e grava PNG com o zlib do Node.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BLUE = [0x00, 0x5b, 0x96] as const;
const WHITE = [0xff, 0xff, 0xff] as const;
const BG = [0xf4, 0xf4, 0xf6] as const;

/** Silhueta do avião (a mesma do ícone "plane", em 24×24, com o nariz arredondado em segmentos). */
const PLANE: [number, number][] = [
  [21, 16],
  [21, 14],
  [13, 9],
  [13, 3.5],
  [12.8, 2.7],
  [12.3, 2.15],
  [11.5, 2],
  [10.7, 2.15],
  [10.2, 2.7],
  [10, 3.5],
  [10, 9],
  [2, 14],
  [2, 16],
  [10, 13.5],
  [10, 19],
  [8, 20.5],
  [8, 22],
  [11.5, 21],
  [15, 22],
  [15, 20.5],
  [13, 19],
  [13, 13.5],
];

function inPolygon(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Quadrado de lado `side` com cantos de raio `r`, centrado na origem. */
function inRoundedSquare(x: number, y: number, side: number, r: number): boolean {
  const h = side / 2;
  const dx = Math.max(Math.abs(x) - (h - r), 0);
  const dy = Math.max(Math.abs(y) - (h - r), 0);
  return Math.abs(x) <= h && Math.abs(y) <= h && dx * dx + dy * dy <= r * r;
}

interface Spec {
  size: number;
  /** fundo opaco (Apple não aceita transparência; maskable ocupa a área toda) */
  background: readonly number[] | null;
  /** lado do losango em fração do ícone (0 = sem losango, avião direto sobre o fundo) */
  diamond: number;
  /** lado do avião em fração do ícone */
  plane: number;
}

type Color = readonly number[] | null;

function sample(spec: Spec, u: number, v: number): Color {
  // u, v em [−0,5, 0,5] com origem no centro
  const planeScale = spec.plane;
  const px = (u / planeScale + 0.5) * 24;
  const py = (v / planeScale + 0.5) * 24;
  if (px >= 0 && px <= 24 && py >= 0 && py <= 24 && inPolygon(px, py, PLANE)) return WHITE;
  if (spec.diamond > 0) {
    const c = Math.SQRT1_2;
    const ru = c * u + c * v;
    const rv = -c * u + c * v;
    if (inRoundedSquare(ru, rv, spec.diamond, spec.diamond * 0.22)) return BLUE;
  }
  return spec.background;
}

function render(spec: Spec): Buffer {
  const { size } = spec;
  const S = 4; // 4×4 amostras por pixel
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const u = (x + (sx + 0.5) / S) / size - 0.5;
          const v = (y + (sy + 0.5) / S) / size - 0.5;
          const c = sample(spec, u, v);
          if (!c) continue;
          r += c[0]!;
          g += c[1]!;
          b += c[2]!;
          a += 1;
        }
      }
      const i = (y * size + x) * 4;
      if (a) {
        rgba[i] = Math.round(r / a);
        rgba[i + 1] = Math.round(g / a);
        rgba[i + 2] = Math.round(b / a);
      }
      rgba[i + 3] = Math.round((a / (S * S)) * 255);
    }
  }
  return png(size, rgba);
}

// ---------------------------------------------------------------- PNG

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size: number, rgba: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- saída

const OUT = 'public/icons';
mkdirSync(OUT, { recursive: true });
const files: [string, Spec][] = [
  ['icon-192.png', { size: 192, background: null, diamond: 0.7, plane: 0.52 }],
  ['icon-512.png', { size: 512, background: null, diamond: 0.7, plane: 0.52 }],
  // maskable: o Android recorta até 20% das bordas, então o avião fica no centro sobre fundo azul
  ['maskable-512.png', { size: 512, background: BLUE, diamond: 0, plane: 0.5 }],
  ['apple-touch-icon.png', { size: 180, background: BG, diamond: 0.7, plane: 0.52 }],
];
for (const [name, spec] of files) {
  writeFileSync(`${OUT}/${name}`, render(spec));
  console.log(`${OUT}/${name}`);
}

// favicon vetorial: o mesmo desenho em SVG
const poly = PLANE.map(([x, y]) => `${x},${y}`).join(' ');
writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="6.2" y="6.2" width="19.6" height="19.6" rx="4.3" transform="rotate(45 16 16)" fill="#005B96"/><polygon points="${poly}" fill="#fff" transform="translate(9.8 9.8) scale(.517)"/></svg>\n`,
);
console.log('public/favicon.svg');
