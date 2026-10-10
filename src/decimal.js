// Exact decimal arithmetic for monetary amounts (no binary floating point).
// A decimal is { n: BigInt, s: number } meaning n / 10^s.

export function D(v) {
  if (v && typeof v === 'object' && 'n' in v) return v;
  let str = String(v ?? '').trim();
  if (str === '') return { n: 0n, s: 0 };
  // accept a German decimal comma ("1.234,56") as well as a decimal point ("1234.56")
  if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(str)) str = str.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d+,\d+$/.test(str)) str = str.replace(',', '.');
  else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(str)) str = str.replace(/,/g, '');
  const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(str);
  if (!m || (m[2] === '' && (m[3] ?? '') === '')) return null;
  const frac = (m[3] ?? '').replace(/0+$/, '');
  const n = BigInt((m[2] || '0') + frac);
  return { n: m[1] === '-' ? -n : n, s: frac.length };
}
export const isDec = v => D(v) !== null;
const pow10 = k => 10n ** BigInt(k);
function align(a, b) { const s = Math.max(a.s, b.s); return [a.n * pow10(s - a.s), b.n * pow10(s - b.s), s]; }
export function add(a, b) { a = D(a); b = D(b); const [x, y, s] = align(a, b); return norm({ n: x + y, s }); }
export function sub(a, b) { a = D(a); b = D(b); const [x, y, s] = align(a, b); return norm({ n: x - y, s }); }
export function mul(a, b) { a = D(a); b = D(b); return norm({ n: a.n * b.n, s: a.s + b.s }); }
// division rounded half away from zero to `places` fraction digits
export function div(a, b, places = 10) {
  a = D(a); b = D(b);
  if (b.n === 0n) return null;
  const num = a.n * pow10(places + b.s + 1), den = b.n * pow10(a.s);
  let q = num / den; // one guard digit
  const neg = q < 0n; if (neg) q = -q;
  q = (q + 5n) / 10n;
  return norm({ n: neg ? -q : q, s: places });
}
export function round(a, places = 2) {
  a = D(a);
  if (a.s <= places) return a;
  const f = pow10(a.s - places);
  const neg = a.n < 0n; let n = neg ? -a.n : a.n;
  n = (n + f / 2n) / f;
  return norm({ n: neg ? -n : n, s: places });
}
function norm(d) { let { n, s } = d; while (s > 0 && n % 10n === 0n) { n /= 10n; s--; } return { n, s }; }
export function cmp(a, b) { a = D(a); b = D(b); const [x, y] = align(a, b); return x < y ? -1 : x > y ? 1 : 0; }
export const isZero = a => D(a).n === 0n;
// plain decimal string; `places` pads/rounds to a fixed number of fraction digits
export function str(a, places) {
  a = D(a);
  if (places !== undefined) a = round(a, places);
  const neg = a.n < 0n; let digits = (neg ? -a.n : a.n).toString();
  let s = a.s;
  if (places !== undefined && s < places) { digits += '0'.repeat(places - s); s = places; }
  if (s > 0) { digits = digits.padStart(s + 1, '0'); digits = digits.slice(0, -s) + '.' + digits.slice(-s); }
  return (neg && a.n !== 0n ? '-' : '') + digits;
}
export const sum = list => list.reduce((acc, x) => add(acc, x), D('0'));
