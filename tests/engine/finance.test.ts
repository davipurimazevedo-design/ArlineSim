import { describe, expect, it } from 'vitest';
import * as actions from '../../src/engine/actions';
import { MODELS } from '../../src/engine/data/aircraft';
import {
  FINANCE_BASE_LIMIT,
  FINANCE_RATE,
  financedBalance,
  financeLimit,
  financeQuote,
  installment,
  payInstallment,
} from '../../src/engine/finance';
import { creditLimit, planeValue } from '../../src/engine/formulas';
import { tick } from '../../src/engine/tick';
import { migrate } from '../../src/store/migrate';
import { addTestPlane, makeGame } from './helpers';

describe('financiamento', () => {
  it('parcela da tabela Price quita o principal no prazo', () => {
    const pay = installment(1e6, 100);
    let b = 1e6;
    for (let i = 0; i < 100; i++) b = b * (1 + FINANCE_RATE) - pay;
    expect(Math.abs(b)).toBeLessThan(1);
  });

  it('cotação: 20% de entrada e parcela maior que o leasing em 5 anos', () => {
    const q = financeQuote('AT7', 1825);
    expect(q.down).toBe(11e6);
    expect(q.principal).toBe(44e6);
    expect(q.payment).toBeGreaterThan(MODELS.AT7.lease);
    expect(q.total).toBeGreaterThan(q.principal);
  });

  it('financiar: paga a entrada, avião próprio com contrato', () => {
    const s = makeGame();
    expect(actions.finance(s, 'AT7', 1825)).toBeNull();
    const p = s.fleet[0]!;
    expect(s.cash).toBe(12e6 - 11e6);
    expect(p.owned).toBe(true);
    expect(p.loan).toMatchObject({ balance: 44e6, left: 1825 });
    expect(financedBalance(s)).toBe(44e6);
  });

  it('recusa prazo inválido, caixa curto e limite estourado', () => {
    const s = makeGame();
    expect(actions.finance(s, 'AT7', 1000 as never)).toBe('Prazo inválido.');
    s.cash = 1e6;
    expect(actions.finance(s, 'AT7', 1825)).toMatch(/entrada/);
    s.cash = 100e6;
    s.license = 1;
    // A20N: principal de R$ 116 mi, acima do limite-base de R$ 50 mi
    expect(actions.finance(s, 'A20N', 1825)).toMatch(/Limite de financiamento/);
    expect(s.fleet).toHaveLength(0);
  });

  it('limite cresce com o lucro médio recente', () => {
    const s = makeGame();
    expect(financeLimit(s)).toBe(FINANCE_BASE_LIMIT);
    s.history = Array.from({ length: 30 }, (_, i) => ({ day: i, cash: 0, profit: 100_000, rep: 50 }));
    expect(financeLimit(s)).toBe(FINANCE_BASE_LIMIT + 36.5e6 + 0.5e6); // arredondado ao milhão
  });

  it('o tick cobra a parcela e amortiza o saldo', () => {
    const s = makeGame();
    actions.finance(s, 'AT7', 1095);
    const p = s.fleet[0]!;
    const before = p.loan!.balance;
    tick(s, { noEvents: true });
    expect(s.lastDay!.loans).toBe(p.loan!.payment);
    expect(s.lastDay!.lease).toBe(0);
    expect(p.loan!.balance).toBeLessThan(before);
    expect(p.loan!.left).toBe(1094);
  });

  it('a última parcela encerra o contrato', () => {
    const p = addTestPlane(makeGame(), 'AT7', {
      owned: true,
      loan: { balance: 1000, payment: 1000, left: 1 },
    });
    expect(payInstallment(p)).toBeCloseTo(1000 * (1 + FINANCE_RATE));
    expect(p.loan).toBeUndefined();
  });

  it('quitar antecipado desconta o saldo do caixa', () => {
    const s = makeGame();
    actions.finance(s, 'AT7', 1825);
    s.cash = 50e6;
    expect(actions.payoffLoan(s, s.fleet[0]!.id)).toBeNull();
    expect(s.cash).toBe(6e6);
    expect(s.fleet[0]!.loan).toBeUndefined();
  });

  it('vender avião financiado quita o saldo com o valor de venda', () => {
    const s = makeGame();
    actions.finance(s, 'AT7', 1825);
    const p = s.fleet[0]!;
    p.loan!.balance = 20e6; // já amortizado: vale R$ 33 mi, deve R$ 20 mi
    const cash = s.cash;
    const net = planeValue(p) - p.loan!.balance;
    expect(net).toBe(13e6);
    expect(actions.release(s, p.id)).toBeNull();
    expect(s.cash).toBeCloseTo(cash + net);
    expect(s.fleet).toHaveLength(0);
  });

  it('venda que não cobre o saldo exige caixa', () => {
    const s = makeGame();
    actions.finance(s, 'AT7', 1825);
    const p = s.fleet[0]!;
    p.condition = 0; // vale 30% do preço, abaixo do saldo
    s.cash = 0;
    expect(actions.release(s, p.id)).toMatch(/não cobre/);
    expect(s.fleet).toHaveLength(1);
  });

  it('o limite de crédito só conta a parte paga', () => {
    const s = makeGame();
    const base = creditLimit(s);
    actions.finance(s, 'AT7', 1825);
    // valor de R$ 33 mi, saldo de R$ 44 mi: nada entra no limite
    expect(creditLimit(s)).toBe(base);
    s.fleet[0]!.loan!.balance = 13e6;
    expect(creditLimit(s)).toBe(base + 10e6);
  });

  it('save v7 ganha o campo de parcelas no relatório do dia', () => {
    const s = makeGame();
    tick(s, { noEvents: true });
    const raw = JSON.parse(JSON.stringify({ ...s, v: 7 }));
    delete raw.lastDay.loans;
    expect(migrate(raw)!.lastDay!.loans).toBe(0);
  });
});
