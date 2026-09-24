import type { Overlap } from '../../../engine';

/** "BSB → VCP e BSB → CGH" */
export function overlapNames(list: Overlap[]): string {
  return list.map((o) => `${o.route.from} → ${o.route.to}`).join(', ');
}
