import type { EventIcon } from '../../engine';

// Paths 24×24 próprios (mesmos do protótipo).
const PATHS: Record<IconName, string> = {
  plane: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z',
  fuel: 'M4 21V5a2 2 0 012-2h6a2 2 0 012 2v16M3 21h12M4 11h10M14 8l3 2v8a2 2 0 004 0V9l-3-3',
  strike: 'M3 10v4h3l7 4V6L6 10H3zM16 9a4 4 0 010 6M18.5 6.5a7.5 7.5 0 010 11',
  ash: 'M7 17a4 4 0 01-.6-8A6 6 0 0118 10.5 3.3 3.3 0 0117.5 17zM8 20h.01M12 21h.01M16 20h.01',
  phone: 'M8 2h8a1 1 0 011 1v18a1 1 0 01-1 1H8a1 1 0 01-1-1V3a1 1 0 011-1zM11 18h2',
  sun: 'M12 7a5 5 0 100 10 5 5 0 000-10zM12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  clip: 'M9 2h6v3H9zM7 3.5H5V22h14V3.5h-2M8 11h8M8 15h6',
  tag: 'M3 12V3h9l9 9-9 9zM7.5 7.5h.01',
  bird: 'M2 13c4-1.5 6.5.5 8.5 3 1-4.5 5-8.5 11.5-9-3 2.2-4 5-5 8-1.8 4.3-7.3 6.2-12.5 3',
  star: 'M12 2.5l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.4l-6.1 3.5 1.5-6.8-5.2-4.6 6.9-.7z',
  bug: 'M3 4h18v12H3zM8 20h8M12 16v4M12 7v4M12 13.5h.01',
  ball: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 7l4.5 3.3-1.7 5.2H9.2l-1.7-5.2z',
  key: 'M14.5 3a6.5 6.5 0 00-6.2 8.6L2 18v4h4v-2h2v-2h2l1.9-1.9A6.5 6.5 0 1014.5 3zM16.5 7.5h.01',
  wrench: 'M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  cash: 'M2 6h20v12H2zM12 9a3 3 0 100 6 3 3 0 000-6zM6 12h.01M18 12h.01',
  rep: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z',
  ops: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2',
  moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
  gear: 'M12 9a3 3 0 100 6 3 3 0 000-6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  upload: 'M12 21V9M7 14l5-5 5 5M4 3h16',
  grid: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z',
  route:
    'M5 19a2 2 0 100-4 2 2 0 000 4zM19 9a2 2 0 100-4 2 2 0 000 4zM5 15V9a4 4 0 014-4h4M19 9v6a4 4 0 01-4 4h-4',
  store: 'M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6',
  chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  // eventos da Fase 2
  mask: 'M3 8c3-2 6-2 9 0 3-2 6-2 9 0v3c0 3-2 5-4.5 5S13 14 12 12c-1 2-2 4-4.5 4S3 14 3 11zM7 10h2M15 10h2',
  family:
    'M8 7a2 2 0 100-4 2 2 0 000 4zM16 9a1.6 1.6 0 100-3.2A1.6 1.6 0 0016 9zM5 21v-8a3 3 0 016 0v8M13.5 21v-6a2.5 2.5 0 015 0v6',
  gift: 'M3 9h18v4H3zM5 13v8h14v-8M12 9v12M12 9C10 5 6 5 6 8s6 1 6 1zm0 0c2-4 6-4 6-1s-6 1-6 1z',
  handshake: 'M2 12l4-4 4 2 3-2 3 1 6 3M2 12l6 6 2-1 2 2 2-1 2 1 6-6M9 14l2 2M12 13l2 2',
  trophy: 'M8 4h8v5a4 4 0 01-8 0zM8 6H4a3 3 0 003 4M16 6h4a3 3 0 01-3 4M12 13v4M9 17h6v4H9z',
  siren: 'M6 18v-6a6 6 0 0112 0v6M4 18h16v3H4zM12 3V1M4.2 6.2L2.8 4.8M19.8 6.2l1.4-1.4',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 018 0v4M12 15v2',
  search: 'M10 17a7 7 0 100-14 7 7 0 000 14zM15 15l6 6',
  gavel: 'M13 4l7 7M10 7l7 7M11.5 5.5l-5 5 7 7 5-5M9 13l-6 6M3 21h8',
  wave: 'M2 8c3-3 5 3 8 0s5 3 8 0 3-1 4 0M2 14c3-3 5 3 8 0s5 3 8 0 3-1 4 0M2 20c3-3 5 3 8 0s5 3 8 0 3-1 4 0',
  app: 'M7 2h10v20H7zM10 12l2 2 4-4M11 18h2',
  cone: 'M10 3h4l5 16H5zM7.5 11h9M6.3 15h11.4M3 21h18',
  tower: 'M9 21l1-10h4l1 10M7 11h10M8 7h8l-1 4H9zM12 3v4',
  engine: 'M4 12a8 5 0 1016 0 8 5 0 10-16 0M12 7v10M4 12h16M20 12h2',
  pilot: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0M8 6h8',
  dollar:
    'M12 2v20M17 6.5C16 5 14.3 4.5 12 4.5c-3 0-5 1.3-5 3.5 0 5 10 2.5 10 7.5 0 2.2-2 3.5-5 3.5-2.4 0-4.2-.7-5-2.3',
  arrival: 'M2 20h20M3 15l16-5c1.5-.5 2.5.8 1.5 1.8L17 14l-9 3-5-2zM6 11l2 1',
  rain: 'M7 15a4 4 0 01-.6-8A6 6 0 0118 8.5 3.3 3.3 0 0117.5 15zM8 18l-1 3M12 18l-1 3M16 18l-1 3',
};

// prettier-ignore
export type IconName =
  | EventIcon
  | 'plane' | 'wrench' | 'cash' | 'rep' | 'ops' | 'moon' | 'grid' | 'route' | 'store' | 'chart'
  | 'gear' | 'download' | 'upload';

const FILLED = new Set<IconName>(['plane']);

interface Props {
  n: IconName;
  size?: number;
  className?: string;
}

export function Icon({ n, size = 18, className = '' }: Props) {
  const filled = FILLED.has(n);
  return (
    <svg
      className={'ic ' + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[n]} />
    </svg>
  );
}
