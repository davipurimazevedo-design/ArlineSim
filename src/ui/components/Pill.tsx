import type { ReactNode } from 'react';

export function Pill({ tone, children }: { tone: 'ok' | 'bad' | 'warn'; children: ReactNode }) {
  return <span className={'pill ' + tone}>{children}</span>;
}
