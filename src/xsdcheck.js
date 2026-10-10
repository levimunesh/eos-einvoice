// XML Schema validation without a schema processor: checks a document against the content model that
// tools/xsd2model.py compiles from the official XSD (element order and occurrence, attributes, every simple-type facet),
// and explains each problem in plain English. Works on any standard DOM (browser, slimdom).
import { D, cmp } from './decimal.js';

const XSI = 'http://www.w3.org/2001/XMLSchema-instance';
const XMLNS = 'http://www.w3.org/2000/xmlns/';
const XML = 'http://www.w3.org/XML/1998/namespace';
// whiteSpace facet: 0 preserve, 1 replace, 2 collapse (only the four XML white space characters count)
const WS = [v => v, v => v.replace(/[\t\n\r]/g, ' '), v => v.replace(/[ \t\n\r]+/g, ' ').replace(/^ | $/g, '')];
const isEl = p => typeof p[0] === 'string';
const isLeaf = p => typeof p[0] === 'string' || p[0] === 0;
const occ = p => (isEl(p) ? [p[2], p[3]] : [p[1], p[2]]);
const show = v => `“${v.length > 40 ? v.slice(0, 40) + '…' : v}”`;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const orList = a => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' or ' + a[a.length - 1]);
const andList = a => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
const cpLen = v => { let n = 0; for (const _ of v) n++; return n; }; // eslint-disable-line no-unused-vars

function pathOf(node) {
  const segs = [];
  for (let n = node; n && n.nodeType === 1; n = n.parentNode) {
    let i = 1; for (let s = n.previousSibling; s; s = s.previousSibling) if (s.nodeType === 1 && s.nodeName === n.nodeName) i++;
    segs.unshift(`${n.nodeName}[${i}]`);
  }
  return '/' + segs.join('/');
}

// ---------- dates and times (real calendar checks, comparison as XML Schema defines it)
const TZ = '(Z|[+-]\\d\\d:\\d\\d)?$';
const RE_TIME = {
  date: new RegExp('^(-?\\d{4,})-(\\d\\d)-(\\d\\d)' + TZ), dateTime: new RegExp('^(-?\\d{4,})-(\\d\\d)-(\\d\\d)T(\\d\\d):(\\d\\d):(\\d\\d)(\\.\\d+)?' + TZ),
  time: new RegExp('^(\\d\\d):(\\d\\d):(\\d\\d)(\\.\\d+)?' + TZ), gYear: new RegExp('^(-?\\d{4,})' + TZ), gYearMonth: new RegExp('^(-?\\d{4,})-(\\d\\d)' + TZ),
  gMonth: new RegExp('^--(\\d\\d)' + TZ), gDay: new RegExp('^---(\\d\\d)' + TZ), gMonthDay: new RegExp('^--(\\d\\d)-(\\d\\d)' + TZ),
};
const leap = y => (y % 4n === 0n && y % 100n !== 0n) || y % 400n === 0n;
function daysFromCivil(y, m, d) {
  if (m <= 2) y -= 1n;
  const era = (y >= 0n ? y : y - 399n) / 400n, yoe = y - era * 400n, mp = BigInt((m + 9) % 12);
  return era * 146097n + yoe * 365n + yoe / 4n - yoe / 100n + (153n * mp + 2n) / 5n + BigInt(d) - 1n - 719468n;
}
// → { err: 'form' | 'real' } or { t: seconds (UTC when a time zone is given), f: fraction digits, tz: boolean }
function parseTime(kind, v) {
  const m = RE_TIME[kind].exec(v); if (!m) return { err: 'form' };
  let y = '2000', mo = '01', d = '01', h = '00', mi = '00', s = '00', f = '';
  if (kind === 'date') [, y, mo, d] = m; else if (kind === 'dateTime') [, y, mo, d, h, mi, s, f] = m; else if (kind === 'time') [, h, mi, s, f] = m;
  else if (kind === 'gYear') [, y] = m; else if (kind === 'gYearMonth') [, y, mo] = m; else if (kind === 'gMonth') [, mo] = m; else if (kind === 'gDay') [, d] = m; else [, mo, d] = m;
  const z = m[m.length - 1], digits = y.replace('-', '');
  if (digits.length > 4 && digits[0] === '0') return { err: 'form' };
  if (/^0+$/.test(digits)) return { err: 'real' };
  const Y = BigInt(y); mo = +mo; d = +d; h = +h; mi = +mi; s = +s; f = (f || '').slice(1).replace(/0+$/, '');
  const dim = [31, leap(Y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (mo < 1 || mo > 12 || d < 1 || d > dim[mo - 1] || mi > 59 || s > 59 || (h > 23 && !(h === 24 && mi === 0 && s === 0 && f === ''))) return { err: 'real' };
  let off = 0;
  if (z && z !== 'Z') { const zh = +z.slice(1, 3), zm = +z.slice(4, 6); if (zh > 14 || zm > 59 || (zh === 14 && zm)) return { err: 'real' }; off = (zh * 60 + zm) * 60 * (z[0] === '-' ? -1 : 1); }
  return { t: daysFromCivil(Y, mo, d) * 86400n + BigInt(h * 3600 + mi * 60 + s - off), f, tz: !!z };
}
function cmpInstant(at, af, bt, bf) {
  if (at !== bt) return at < bt ? -1 : 1;
  const n = Math.max(af.length, bf.length), x = af.padEnd(n, '0'), y = bf.padEnd(n, '0');
  return x < y ? -1 : x > y ? 1 : 0;
}
// -1, 0, 1, or 2 when the order cannot be decided (one value has a time zone, the other has none, and they are within 14 hours)
function cmpTime(a, b) {
  const H14 = 50400n;
  if (a.tz === b.tz) return cmpInstant(a.t, a.f, b.t, b.f);
  if (a.tz) return cmpInstant(a.t, a.f, b.t - H14, b.f) < 0 ? -1 : cmpInstant(a.t, a.f, b.t + H14, b.f) > 0 ? 1 : 2;
  return cmpInstant(a.t + H14, a.f, b.t, b.f) < 0 ? -1 : cmpInstant(a.t - H14, a.f, b.t, b.f) > 0 ? 1 : 2;
}

const RE_LEX = {
  boolean: /^(true|false|1|0)$/, decimal: /^[+-]?(\d+(\.\d*)?|\.\d+)$/, integer: /^[+-]?\d+$/,
  float: /^([+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?|-?INF|NaN)$/, hexBinary: /^([0-9a-fA-F]{2})*$/,
  base64Binary: /^(([A-Za-z0-9+/] ?){4})*(([A-Za-z0-9+/] ?){3}[A-Za-z0-9+/]|([A-Za-z0-9+/] ?){2}[AEIMQUYcgkosw048] ?=|[A-Za-z0-9+/] ?[AQgw] ?= ?=)?$/,
  duration: /^-?P(?=.)(\d+Y)?(\d+M)?(\d+D)?(T(?=.)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/,
  QName: /^([\p{L}_][\p{L}\p{N}\p{M}._-]*:)?[\p{L}_][\p{L}\p{N}\p{M}._-]*$/u,
};
RE_LEX.NOTATION = RE_LEX.QName;
const LEX_NEED = {
  boolean: 'true or false', decimal: 'a number written with digits and a decimal point, for example 1234.56', integer: 'a whole number',
  float: 'a number', hexBinary: 'hexadecimal digits', base64Binary: 'base64 data', duration: 'a duration such as P30D', QName: 'a name', NOTATION: 'a name',
  date: 'a date written as YYYY-MM-DD, for example 2026-01-31', dateTime: 'a date and time written like 2026-01-31T09:30:00Z', time: 'a time written like 09:30:00',
  gYear: 'a year written as YYYY', gYearMonth: 'a month written as YYYY-MM', gMonth: 'a month written as --MM', gDay: 'a day written as ---DD', gMonthDay: 'a day written as --MM-DD',
};
const NUMERIC = { decimal: 1, integer: 1 };

// ---------- pattern hints (see pattern_hint in tools/xsd2model.py)
function hintText(h, t) {
  if (!h) return '';
  if (h[0] === 'n') return `an amount written with digits and a decimal point, with at most ${plural(h[2], 'decimal place')} and no spaces or thousands separators (for example 1234.5)`;
  if (h[0] === '@') return 'an e-mail address such as name@example.com';
  if (t && RE_TIME[t.b]) return t.b === 'date' ? 'a plain date written as YYYY-MM-DD, without a time zone' : '';
  const [, kinds, lits, lens] = h;
  const len = !lens.length ? '' : lens[2] === 0 ? `${lens[0]} to ${lens[1]}` : (lens.length === 1 ? 'exactly ' : '') + lens.join(' or ');
  if (kinds === 'd' && !lits) return len ? `${len} digits` : 'digits only';
  const parts = [];
  if (kinds.includes('d')) parts.push('digits'); if (kinds.includes('U')) parts.push('capital letters'); if (kinds.includes('l')) parts.push('small letters');
  for (const c of lits) if (!((kinds.includes('U') && /[A-Z]/.test(c)) || (kinds.includes('l') && /[a-z]/.test(c)))) parts.push(`“${c}”`);
  return `${len ? len + ' characters' : 'a value'} made up of ${andList(parts)}${len && parts.length > 1 ? ' in the required arrangement' : ''}`;
}
// does the value already have the simple shape the hint describes? (then the hint alone would be misleading)
function fitsHint(h, v) {
  if (!h || h[0] !== 'c') return false;
  const [, kinds, lits, lens] = h, n = cpLen(v);
  if (lens.length && !(lens[2] === 0 ? n >= lens[0] && n <= lens[1] : lens.includes(n))) return false;
  for (const c of v) if (!((kinds.includes('d') && /\d/.test(c)) || (kinds.includes('U') && /[A-Z]/.test(c)) || (kinds.includes('l') && /[a-z]/.test(c)) || lits.includes(c))) return false;
  return true;
}

const PREP = new WeakMap();
function prep(model) {
  let c = PREP.get(model);
  if (!c) PREP.set(model, c = { ns: new Map(model.ns.map((u, i) => [u, i])), re: new Map(), info: new Map(), first: new Map(), key: new Map(), bound: new Map() });
  return c;
}

/**
 * Validate `doc` against a compiled schema model. Returns [{ code, node, location, message }]; an empty array means valid.
 * `label(localName)` may return a human name for an element, used in the messages instead of <localName>.
 */
export function checkXsd(doc, model, { limit = 60, label } = {}) {
  const out = [];
  const add = (code, node, message) => { if (out.length < limit) out.push({ code, node, location: pathOf(node), message }); };
  try { run(doc, model, add, label); } catch (e) {
    out.push({ code: 'internal', node: (doc && doc.documentElement) || null, location: '/', message: `The structure check could not be completed (${(e && e.message) || e}).` });
  }
  return out;
}

function run(doc, model, add, label) {
  const ctx = prep(model), T = model.t;
  const L = name => (label && label(name)) || `<${name}>`;
  const nm = el => (label && label(el.localName)) || `<${el.nodeName}>`;
  const nsIdx = uri => { const i = ctx.ns.get(uri || ''); return i === undefined ? -1 : i; };
  const keyOfNode = k => nsIdx(k.namespaceURI) + '|' + k.localName;
  const keyOf = p => { let k = ctx.key.get(p); if (k === undefined) ctx.key.set(p, k = ((p[4] && p[4].n) || 0) + '|' + p[0]); return k; };
  const regex = src => { let r = ctx.re.get(src); if (r === undefined) { try { r = new RegExp('^(?:' + src + ')$', 'u'); } catch { r = null; } ctx.re.set(src, r); } return r; };
  const wildOk = (spec, uri) => spec === 1 || (spec[0] === 0 ? !!uri && nsIdx(uri) !== spec[1] : spec.indexOf(nsIdx(uri), 1) > 0);

  const root = doc && doc.documentElement;
  if (!root) throw new Error('the document has no root element');
  const g = model.el[keyOfNode(root)];
  if (!g) {
    const want = Object.keys(model.el).map(k => { const [n, name] = k.split('|'); return `<${name}> in the namespace “${model.ns[n]}”`; });
    add('root', root, `The root element <${root.nodeName}>${root.namespaceURI ? ` (namespace “${root.namespaceURI}”)` : ''} is not what this format expects: it should be ${orList(want)}.`);
    return;
  }

  // ----- content model helpers (cached per model)
  const emptiable = p => (isLeaf(p) ? false : p[0] === 2 ? p[3].some(nullable) : p[3].every(nullable));
  const nullable = p => occ(p)[0] === 0 || emptiable(p);
  const first = p => {
    let f = ctx.first.get(p);
    if (!f) {
      f = [];
      if (isLeaf(p)) f.push(p);
      else for (const c of p[3]) { f.push(...first(c)); if (p[0] === 1 && !nullable(c)) break; }
      ctx.first.set(p, f);
    }
    return f;
  };
  const typeInfo = t => {
    let inf = ctx.info.get(t);
    if (!inf) {
      inf = { els: new Map(), order: new Map(), path: new Map(), wild: false }; let n = 0;
      const walk = (p, path) => {
        if (isLeaf(p)) { if (isEl(p)) { if (!inf.els.has(keyOf(p))) inf.els.set(keyOf(p), p); } else inf.wild = true; inf.order.set(p, n++); inf.path.set(p, path); } else p[3].forEach((c, i) => walk(c, [...path, [p, i]]));
      };
      if (t.c) walk(t.c, []);
      ctx.info.set(t, inf);
    }
    return inf;
  };
  // are a and b alternatives of one choice that can be taken only once?
  const exclusive = (inf, a, b) => {
    const pa = inf.path.get(a), pb = inf.path.get(b);
    for (let i = 0; i < pa.length && i < pb.length; i++) {
      if (pa[i][0] !== pb[i][0]) return false;
      if (pa[i][0][2] !== 1) return false;
      if (pa[i][1] !== pb[i][1]) return pa[i][0][0] === 2;
    }
    return false;
  };
  const repeated = (inf, p) => inf.path.get(p).some(s => s[0][2] !== 1);

  // ----- simple values
  const bound = (t, key) => { const k = t.b + '|' + t[key]; let b = ctx.bound.get(k); if (b === undefined) ctx.bound.set(k, b = RE_TIME[t.b] ? parseTime(t.b, t[key]) : t[key]); return b; };
  const valueOf = (t, v) => (RE_TIME[t.b] ? parseTime(t.b, v) : v);
  const same = (t, a, b) => {
    if (t.u || t.li !== undefined) return WS[2](a) === WS[2](b);
    const w = WS[t.w === undefined ? 2 : t.w]; a = w(a); b = w(b);
    if (NUMERIC[t.b]) return RE_LEX.decimal.test(b) && cmp(D(a), D(b)) === 0;
    if (t.b === 'float') return Number(a) === Number(b);
    if (t.b === 'boolean') return (a === 'true' || a === '1') === (b === 'true' || b === '1');
    if (RE_TIME[t.b]) { const x = parseTime(t.b, a), y = parseTime(t.b, b); return !x.err && !y.err && x.tz === y.tz && cmpTime(x, y) === 0; }
    return a === b;
  };
  const oneOf = (t, v) => {
    const e = t.e, near = e.find(x => x.toLowerCase().replace(/\s+/g, '') === v.toLowerCase().replace(/\s+/g, ''));
    if (near !== undefined && v !== '') return `must be written exactly as “${near}”`;
    if (e.length === 1) return `must be ${NUMERIC[t.b] ? e[0] : `“${e[0]}”`}`;
    return e.length > 16 ? `must be one of the allowed codes, such as ${e.slice(0, 5).join(', ')}, …` : `must be one of: ${e.join(', ')}`;
  };
  // what an empty value is missing
  const need = t => {
    if (t.u) return 'it needs a value';
    if (t.e) return 'it ' + oneOf(t, '');
    if (LEX_NEED[t.b]) return 'it needs ' + LEX_NEED[t.b];
    const h = t.h && t.h.find(Boolean), ht = hintText(h, t);
    if (ht) return 'it needs ' + ht;
    if (t.l) return `it needs exactly ${plural(t.l, 'character')}`;
    return t.nl ? `it needs at least ${plural(t.nl, 'character')}` : 'it needs a value';
  };
  // → null when valid, else a phrase that completes "<Element> …"
  function simple(t, raw) {
    if (t.u) {
      if (!t.u.some(m => !simple(T[m], raw))) {
        const hs = t.u.map(m => T[m].h && T[m].h.length === 1 && T[m].h[0]), v = WS[2](raw);
        if (v === '') return 'is empty; it needs a value';
        if (hs.every(h => h && h[0] === 'c' && h[1] === 'd' && !h[2] && h[3].length && h[3][2] !== 0)) return `must be ${orList([...new Set(hs.flatMap(h => h[3]))].map(String))} digits (it is ${show(v)})`;
        return `does not have the required form (it is ${show(v)})`;
      }
      return facets(t, WS[2](raw), false);
    }
    if (t.li !== undefined) {
      const items = WS[2](raw).split(' ').filter(Boolean);
      for (const it of items) { const p = simple(T[t.li], it); if (p) return `contains ${show(it)}, which ${p}`; }
      return lengths(t, items.length, 'item') || facets(t, items.join(' '), false);
    }
    const v = WS[t.w === undefined ? 2 : t.w](raw);
    const p = atomic(t, v);
    return p && v === '' ? 'is empty; ' + need(t) : p;
  }
  const lengths = (t, n, unit) => {
    if (t.l !== undefined && n !== t.l) return `must be exactly ${plural(t.l, unit)} long (it has ${n})`;
    if (t.nl !== undefined && n < t.nl) return `is too short: ${plural(n, unit)}, the minimum is ${t.nl}`;
    if (t.xl !== undefined && n > t.xl) return `is too long: ${plural(n, unit)}, the maximum is ${t.xl}`;
    return null;
  };
  function facets(t, v, withLength) {
    if (withLength) { const p = lengths(t, t.b === 'hexBinary' ? v.length / 2 : t.b === 'base64Binary' ? Math.floor(v.replace(/[ =]/g, '').length * 3 / 4) : cpLen(v), t.b === 'hexBinary' || t.b === 'base64Binary' ? 'byte' : 'character'); if (p) return p; }
    if (t.p) for (let i = 0; i < t.p.length; i++) {
      if (t.p[i].some(src => { const r = regex(src); return !r || r.test(v); })) continue;
      const h = t.h && t.h[i], ht = hintText(h, t);
      if (!ht) return `does not have the required form (it is ${show(v)})`;
      return fitsHint(h, v) ? `does not have the required form (${ht}, but not every combination is allowed; it is ${show(v)})` : `must be ${ht} (it is ${show(v)})`;
    }
    if (t.e && !t.e.some(e => (t.b === 'string' || !t.b ? e === v : same(t, v, e)))) return `${oneOf(t, v)} (it is ${show(v)})`;
    return null;
  }
  function atomic(t, v) {
    const kind = t.b; let val = null;
    if (RE_TIME[kind]) {
      val = parseTime(kind, v);
      if (val.err === 'form') return `must be ${LEX_NEED[kind]} (it is ${show(v)})`;
      if (val.err) return `is not a real ${kind === 'date' ? 'calendar date' : kind === 'dateTime' ? 'date and time' : 'value'} (${show(v)})`;
    } else if (RE_LEX[kind] && !RE_LEX[kind].test(v)) return `must be ${LEX_NEED[kind]} (it is ${show(v)})`;
    const stringy = !RE_TIME[kind] && !NUMERIC[kind] && kind !== 'boolean' && kind !== 'float' && kind !== 'duration';
    const p = facets(t, v, stringy);
    if (p) return p;
    if (NUMERIC[kind]) {
      const m = /^[+-]?0*(\d*?)(?:\.(\d*?)0*)?$/.exec(v), id = m[1].length, fd = (m[2] || '').length;
      if (t.fd !== undefined && fd > t.fd) return t.fd === 0 ? `must be a whole number (it is ${show(v)})` : `can have at most ${plural(t.fd, 'decimal place')} (it is ${show(v)})`;
      if (t.td !== undefined && Math.max(1, id + fd) > t.td) return `has too many digits: at most ${t.td} are allowed (it is ${show(v)})`;
    }
    if (NUMERIC[kind] || kind === 'float' || RE_TIME[kind]) {
      const time = !!RE_TIME[kind];
      const c = key => { const b = bound(t, key); return time ? (b.err ? 0 : cmpTime(val, b)) : kind === 'float' ? Math.sign(Number(v.replace('INF', 'Infinity')) - Number(b)) : cmp(D(v), D(b)); };
      const tzNote = 'needs a time zone (for example a “Z” at the end) so that it can be compared with the allowed range';
      let r;
      if (t.mi !== undefined && (r = c('mi')) !== 0 && r !== 1) return r === 2 ? tzNote : `${time ? 'must not be earlier than' : 'must be at least'} ${t.mi} (it is ${show(v)})`;
      if (t.me !== undefined && (r = c('me')) !== 1) return r === 2 ? tzNote : `${time ? 'must be later than' : 'must be greater than'} ${t.me} (it is ${show(v)})`;
      if (t.ma !== undefined && (r = c('ma')) !== 0 && r !== -1) return r === 2 ? tzNote : `${time ? 'must not be later than' : 'must be at most'} ${t.ma} (it is ${show(v)})`;
      if (t.xe !== undefined && (r = c('xe')) !== -1) return r === 2 ? tzNote : `${time ? 'must be earlier than' : 'must be less than'} ${t.xe} (it is ${show(v)})`;
    }
    return null;
  }

  // ----- xsi:type
  const derives = (a, b) => {
    for (let x = a, n = 0; x !== undefined && n < 200; x = T[x].d, n++) if (x === b) return true;
    return !!(T[b].u && T[b].u.some(m => derives(a, m)));
  };
  const lookupNs = (el, prefix) => {
    if (prefix === 'xml') return XML;
    const name = prefix ? 'xmlns:' + prefix : 'xmlns';
    for (let n = el; n && n.nodeType === 1; n = n.parentNode) if (n.hasAttribute ? n.hasAttribute(name) : n.getAttribute(name) !== null) return n.getAttribute(name) || '';
    return prefix ? null : '';
  };

  // ----- element content
  function content(el, t, kids) {
    const inf = typeInfo(t), P = t.c, used = new Map(), count = new Map();
    let known = kids;
    if (!inf.wild) {
      known = [];
      for (const k of kids) {
        if (inf.els.has(keyOfNode(k))) { known.push(k); continue; }
        const twin = [...inf.els.values()].find(p => p[0] === k.localName);
        add('unexpected', k, `${nm(k)} is not allowed inside ${nm(el)}${twin ? ` here: it is in the wrong XML namespace (“${k.namespaceURI || ''}” instead of “${model.ns[(twin[4] && twin[4].n) || 0]}”)` : ''}.`);
      }
    }
    if (!P) { for (const k of known) add('unexpected', k, `${nm(k)} is not allowed inside ${nm(el)}.`); return used; }
    const keys = known.map(keyOfNode);
    let i = 0;
    const hit = (l, j) => (isEl(l) ? keyOf(l) === keys[j] : wildOk(l[3], known[j].namespaceURI));
    const accepts = (p, j) => { const f = first(p); for (let x = 0; x < f.length; x++) if (hit(f[x], j)) return true; return false; };
    const take = p => { used.set(known[i], p); count.set(p, (count.get(p) || 0) + 1); i++; };
    const describe = p => {
      if (isEl(p)) return `the required element ${L(p[0])}`;
      if (p[0] === 0) return 'a required element';
      const names = [...new Set(first(p).filter(isEl).map(l => L(l[0])))];
      return names.length === 1 ? `the required element ${names[0]}` : `a required element: one of ${names.slice(0, 8).join(', ')}${names.length > 8 ? ', …' : ''}`;
    };
    // explain why the element at position i cannot be here; false when there is no better explanation than "something is missing"
    const diagnose = k => {
      const q = inf.els.get(keyOfNode(k)); if (!q) return false;
      const max = q[3];
      if (max >= 0 && (count.get(q) || 0) >= max && !repeated(inf, q)) { add('too-many', k, `${nm(k)} may appear at most ${max === 1 ? 'once' : max + ' times'} inside ${nm(el)}.`); return true; }
      for (let j = 0; j < i; j++) { const o = used.get(known[j]); if (o && o !== q && exclusive(inf, o, q)) { add('choice', k, `${nm(k)} cannot be used together with ${nm(known[j])} inside ${nm(el)}: only one of them is allowed.`); return true; } }
      const pos = inf.order.get(q);
      for (let j = 0; j < i; j++) { const o = used.get(known[j]); if (o && inf.order.get(o) > pos) { add('order', k, `${nm(k)} is in the wrong position inside ${nm(el)}: it must come before ${nm(known[j])}.`); return true; } }
      return false;
    };
    const fail = (p, n) => {
      const k = known[i];
      if (!k) add('missing', el, n ? `${nm(el)} needs at least ${occ(p)[0]} ${L(p[0])} elements, but has only ${n}.` : `${nm(el)} is missing ${describe(p)}.`);
      else if (!diagnose(k)) {
        let later = false;
        if (isLeaf(p)) for (let j = i + 1; j < known.length && !later; j++) later = hit(p, j);
        if (later) add('order', k, `${nm(k)} is in the wrong position inside ${nm(el)}: ${L(p[0])} must come before it.`);
        else add('missing', el, `${nm(el)} is missing ${describe(p)} (expected before ${nm(k)}).`);
      }
      return false;
    };
    function many(p) {
      const [min, max] = occ(p); let n = 0;
      if (isLeaf(p)) {
        while (i < known.length && (max < 0 || n < max) && hit(p, i)) { take(p); n++; }
        return n >= min || fail(p, n);
      }
      while (max < 0 || n < max) {
        const start = i;
        if (!(i < known.length && accepts(p, i))) {
          if (n >= min || emptiable(p)) break;
          return once(p); // a required part is missing; this reports which
        }
        if (!once(p)) return false;
        if (i === start) break;
        n++;
      }
      return true;
    }
    function once(p) {
      const ch = p[3];
      if (p[0] === 1) { for (const c of ch) if (!many(c)) return false; return true; }
      if (p[0] === 2) {
        const br = i < known.length && ch.find(c => accepts(c, i));
        if (br) return many(br);
        return ch.some(nullable) || fail(p, 0);
      }
      const seen = new Set(); // xs:all
      for (;;) { const c = i < known.length && ch.find(x => hit(x, i)); if (!c || seen.has(c)) break; seen.add(c); take(c); }
      for (const c of ch) if (occ(c)[0] > 0 && !seen.has(c)) return fail(c, 0);
      return true;
    }
    if (many(P) && i < known.length && !diagnose(known[i])) add('order', known[i], `${nm(known[i])} is not expected at this position inside ${nm(el)}.`);
    return used;
  }

  function visit(el, tid, opts, depth) {
    let t = T[tid], nil = false;
    if (depth > 500) { add('too-deep', el, `${nm(el)} is nested too deeply to be checked.`); return; }
    const attrs = [];
    if (el.attributes) for (let i = 0; i < el.attributes.length; i++) {
      const a = el.attributes[i], local = a.localName || a.name;
      if (a.namespaceURI === XMLNS || a.name === 'xmlns' || a.name.startsWith('xmlns:')) continue;
      if (a.namespaceURI === XSI && (local === 'schemaLocation' || local === 'noNamespaceSchemaLocation')) continue;
      if (a.namespaceURI === XSI && local === 'nil') {
        const v = WS[2](a.value);
        if (!opts.nil) add('nil', el, `${nm(el)} cannot be marked as empty with the attribute “${a.name}”.`);
        else if (!RE_LEX.boolean.test(v)) add('nil', el, `The attribute “${a.name}” on ${nm(el)} must be true or false.`);
        else nil = v === 'true' || v === '1';
        continue;
      }
      if (a.namespaceURI === XSI && local === 'type') {
        const v = WS[2](a.value), c = v.indexOf(':'), uri = lookupNs(el, c < 0 ? '' : v.slice(0, c));
        const id = uri === null || !RE_LEX.QName.test(v) ? undefined : model.tn[nsIdx(uri) + '|' + v.slice(c + 1)];
        if (id === undefined) { add('xsi-type', el, `The attribute “${a.name}” on ${nm(el)} names a type (${show(v)}) that does not exist in this format.`); return; }
        if (!derives(id, tid)) { add('xsi-type', el, `The attribute “${a.name}” on ${nm(el)} names a type (${show(v)}) that cannot be used for this element.`); return; }
        t = T[id];
        continue;
      }
      attrs.push(a);
    }
    if (t.x === 4) return; // anything goes
    const decls = t.a || {}, seen = new Set();
    for (const a of attrs) {
      const local = a.localName || a.name, key = a.namespaceURI ? `{${nsIdx(a.namespaceURI)}}${local}` : local, spec = decls[key];
      if (!spec) { if (!(t.aa && wildOk(t.aa[0], a.namespaceURI))) add('attr-unknown', el, `The attribute “${a.name}” is not allowed on ${nm(el)}.`); continue; }
      seen.add(key);
      const p = simple(T[spec[0]], a.value);
      if (p) add('attr-value', el, `The attribute “${a.name}” on ${nm(el)} ${p}.`);
      else if (spec.length > 2 && !same(T[spec[0]], a.value, spec[2])) add('attr-fixed', el, `The attribute “${a.name}” on ${nm(el)} must be “${spec[2]}” (it is ${show(a.value)}).`);
    }
    for (const key of Object.keys(decls)) if (decls[key][1] && !seen.has(key)) add('attr-missing', el, `${nm(el)} needs the attribute “${key.replace(/^\{\d+\}/, '')}”${decls[key].length > 2 ? ` with the value “${decls[key][2]}”` : ''}.`);

    const kids = []; let text = '';
    for (let n = el.firstChild; n; n = n.nextSibling) { if (n.nodeType === 1) kids.push(n); else if (n.nodeType === 3 || n.nodeType === 4) text += n.nodeValue; }
    if (nil) { if (kids.length || text !== '') add('nil', el, `${nm(el)} is marked as empty (xsi:nil) but has content.`); return; }
    const st = t.x === undefined ? t : t.x === 3 ? T[t.s] : null;
    if (st) {
      if (kids.length) { add('leaf-children', el, `${nm(el)} must contain a value only, but it contains the element ${nm(kids[0])}.`); return; }
      if (text === '' && opts.df) return; // an empty element takes the default value
      const v = text === '' && opts.f !== undefined ? opts.f : text, p = simple(st, v);
      if (p) add('value', el, `${nm(el)} ${p}.`);
      else if (opts.f !== undefined && !same(st, v, opts.f)) add('fixed', el, `${nm(el)} must be “${opts.f}” (it is ${show(WS[2](v))}).`);
      return;
    }
    if (t.x === 0) {
      if (kids.length) add('unexpected', kids[0], `${nm(kids[0])} is not allowed inside ${nm(el)}, which must stay empty.`);
      else if (text !== '') add('text', el, `${nm(el)} must stay empty, but it contains text.`);
      return;
    }
    if (t.x === 1 && /[^ \t\n\r]/.test(text)) add('text', el, `${nm(el)} contains text (${show(WS[2](text))}) where only elements are allowed.`);
    const used = content(el, t, kids), inf = typeInfo(t);
    for (const k of kids) {
      const p = used.get(k) || inf.els.get(keyOfNode(k));
      if (!p) continue;
      if (isEl(p)) visit(k, p[1], p[4] || {}, depth + 1);
      else if (p[4] !== 'skip') { // wildcard: validate against a global declaration when there is one
        const d = model.el[keyOfNode(k)];
        if (d) visit(k, d[0], d[1] || {}, depth + 1); else if (p[4] === 'strict') add('unexpected', k, `${nm(k)} is not a known element.`);
      }
    }
  }
  visit(root, g[0], g[1] || {}, 0);
}
