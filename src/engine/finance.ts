// Financiamento de aeronaves (Fase 3): entrada à vista e parcelas diárias fixas (tabela Price).
import { MODELS } from './data/aircraft';
import type { GameState, ModelKey, Plane } from './types';

/** entrada paga à vista, fração do preço */
export const FINANCE_DOWN = 0.2;
/** juros ao dia (~11,6% ao ano); metade da linha de crédito, porque o avião é a garantia */
export const FINANCE_RATE = 0.0003;
/** prazos oferecidos, em dias (3, 5 e 8 anos) */
export const FINANCE_TERMS = [1095, 1825, 2920] as const;
export type FinanceTerm = (typeof FINANCE_TERMS)[number];
/** saldo financiado que qualquer companhia consegue, antes de mostrar resultado */
export const FINANCE_BASE_LIMIT = 50e6;
/** dias de lucro médio usados na média do limite */
export const FINANCE_PROFIT_WINDOW = 30;

export interface FinanceQuote {
  down: number;
  principal: number;
  /** parcela diária */
  payment: number;
  /** soma das parcelas */
  total: number;
  days: FinanceTerm;
}

/** Parcela fixa que quita `principal` em `days` dias à taxa diária `rate`. */
export function installment(principal: number, days: number, rate = FINANCE_RATE): number {
  if (principal <= 0 || days <= 0) return 0;
  return (principal * rate) / (1 - (1 + rate) ** -days);
}

export function financeQuote(model: ModelKey, days: FinanceTerm): FinanceQuote {
  return financeQuoteFor(MODELS[model].price, days);
}

/** Cotação para um preço qualquer (aviões usados). */
export function financeQuoteFor(price: number, days: FinanceTerm): FinanceQuote {
  const down = Math.round(price * FINANCE_DOWN);
  const principal = price - down;
  const payment = Math.round(installment(principal, days));
  return { down, principal, payment, total: payment * days, days };
}

/** Saldo devedor de todos os financiamentos. */
export function financedBalance(s: GameState): number {
  return s.fleet.reduce((a, p) => a + (p.loan?.balance ?? 0), 0);
}

/** Parcelas diárias somadas. */
export function financePayments(s: GameState): number {
  return s.fleet.reduce((a, p) => a + (p.loan?.payment ?? 0), 0);
}

/** Saldo máximo financiado: base + um ano do lucro médio recente. */
export function financeLimit(s: GameState): number {
  const recent = s.history.slice(-FINANCE_PROFIT_WINDOW);
  const avg = recent.length ? recent.reduce((a, h) => a + h.profit, 0) / recent.length : 0;
  return Math.round((FINANCE_BASE_LIMIT + Math.max(0, avg) * 365) / 1e6) * 1e6;
}

/**
 * Paga a parcela do dia de um avião financiado: juros sobre o saldo e o resto amortiza.
 * Devolve o valor pago. Quita o contrato na última parcela.
 */
export function payInstallment(p: Plane): number {
  const l = p.loan;
  if (!l) return 0;
  const interest = l.balance * FINANCE_RATE;
  // a última parcela acerta a sobra do arredondamento
  const pay = l.left <= 1 ? l.balance + interest : Math.min(l.payment, l.balance + interest);
  l.balance = Math.max(0, l.balance + interest - pay);
  l.left--;
  if (l.left <= 0 || l.balance < 1) delete p.loan;
  return pay;
}
