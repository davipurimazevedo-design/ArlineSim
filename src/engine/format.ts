// Formatação independente de ICU: o mesmo resultado no Node e em qualquer navegador.

const MINUS = '−';

/** Inteiro com separador de milhar brasileiro: 1500 → "1.500". */
export function fmtInt(v: number): string {
  const n = Math.round(v);
  const s = Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return n < 0 ? MINUS + s : s;
}

export function fmtMoney(v: number): string {
  const a = Math.abs(v);
  const sg = v < 0 ? MINUS : '';
  if (a >= 1e9) return `${sg}R$ ${(a / 1e9).toFixed(2).replace('.', ',')} bi`;
  if (a >= 1e6) return `${sg}R$ ${(a / 1e6).toFixed(1).replace('.', ',')} mi`;
  if (a >= 1e3) return `${sg}R$ ${Math.round(a / 1e3)} mil`;
  return `${sg}R$ ${Math.round(a)}`;
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Dia de jogo → data. O dia 1 é 1º de janeiro de 2026. Ex.: "01 de jan de 2026". */
export function fmtDate(day: number): string {
  const d = new Date(Date.UTC(2026, 0, day));
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${dd} de ${MONTHS[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

/** Decimal com vírgula: 1.5 → "1,5". */
export function fmtDec(v: number, digits = 1): string {
  return v.toFixed(digits).replace('.', ',').replace('-', MINUS);
}

/** Texto normalizado para busca: minúsculas e sem acentos ("São Luís" → "sao luis"). */
export function searchKey(t: string): string {
  return t
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase();
}
