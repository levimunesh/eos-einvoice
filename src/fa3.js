// Poland: the KSeF structured invoice FA(3) — write it from the form model, read it for display, and cross-check it.
// Element names and their order follow the official schema schemat_FA(3)_v1-0E.xsd (see build/rules/fa3.json).
import { emptyInvoice, emptyLine } from './model.js';
import { D, add, sub, mul, div, round, cmp, isZero, str, sum } from './decimal.js';

export const FA3_NS = 'http://crd.gov.pl/wzor/2025/06/25/13775/';
const FA_OLD = { 'http://crd.gov.pl/wzor/2023/06/29/12648/': 2, 'http://crd.gov.pl/wzor/2021/11/29/11089/': 1 };

export function isFA(doc) {
  const r = doc && doc.documentElement;
  if (!r || r.localName !== 'Faktura') return { fa: false };
  if (r.namespaceURI === FA3_NS) return { fa: true, version: 3 };
  return FA_OLD[r.namespaceURI] ? { fa: true, version: FA_OLD[r.namespaceURI] } : { fa: false };
}

// ---------- code lists
// VAT rate codes of the schema (TStawkaPodatku) → the summary field P_13_x they are totalled in
const BUCKET = { 23: '1', 22: '1', 8: '2', 7: '2', 5: '3', 4: '4', 3: '4', '0 KR': '6_1', '0 WDT': '6_2', '0 EX': '6_3', zw: '7', 'np I': '8', 'np II': '9', oo: '10' };
const TAXED = ['1', '2', '3', '4'], UNTAXED = ['6_1', '6_2', '6_3', '7', '8', '9', '10'];
const BUCKET_RATES = { 1: ['23', '22'], 2: ['8', '7'], 3: ['5'], 4: ['4', '3'] };
// rate code → EN 16931 category for the shared display and form model
const CODE_CAT = { '0 KR': 'Z', '0 WDT': 'K', '0 EX': 'G', zw: 'E', oo: 'AE', 'np I': 'O' };
const EU_VAT_PREFIX = ['AT', 'BE', 'BG', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'EL', 'HR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'XI'];
const EU_COUNTRY = new Set(EU_VAT_PREFIX.map(c => (c === 'EL' ? 'GR' : c)).filter(c => c !== 'XI'));
// UN/ECE unit codes → the unit as it is written on Polish invoices
export const PL_UNIT = {
  C62: 'szt.', H87: 'szt.', EA: 'szt.', XPP: 'szt.', NAR: 'szt.', PCE: 'szt.', HUR: 'godz.', DAY: 'dzień', WEE: 'tydz.', MON: 'mies.', ANN: 'rok', MIN: 'min',
  KGM: 'kg', GRM: 'g', TNE: 't', MTR: 'm', CMT: 'cm', KMT: 'km', MTK: 'm²', MTQ: 'm³', LTR: 'l', KWH: 'kWh', LS: 'ryczałt', SET: 'kpl.', XPK: 'opak.', XBX: 'karton', XPX: 'paleta', P1: '%',
};
const UNIT_CODE = { 'szt.': 'C62', szt: 'C62', 'godz.': 'HUR', godz: 'HUR', h: 'HUR', dzień: 'DAY', 'tydz.': 'WEE', 'mies.': 'MON', rok: 'ANN', min: 'MIN', kg: 'KGM', g: 'GRM', t: 'TNE', m: 'MTR', cm: 'CMT', km: 'KMT', 'm²': 'MTK', m2: 'MTK', 'm³': 'MTQ', m3: 'MTQ', l: 'LTR', kWh: 'KWH', ryczałt: 'LS', 'kpl.': 'SET', kpl: 'SET', 'opak.': 'XPK', karton: 'XBX', paleta: 'XPX', '%': 'P1' };
const FORMA = { 58: '6', 30: '6', 59: '6', 10: '1', 48: '2' };
const FORMA_BACK = { 1: ['10', 'Gotówka (cash)'], 2: ['48', 'Karta (card)'], 3: ['1', 'Bon (voucher)'], 4: ['1', 'Czek (cheque)'], 5: ['1', 'Kredyt (credit)'], 6: ['30', 'Przelew (bank transfer)'], 7: ['1', 'Płatność mobilna (mobile payment)'] };
const KEY_REMITTANCE = 'Tytuł płatności', KEY_BUYER_REF = 'Numer referencyjny nabywcy', TERMS_PREFIX = 'Warunki płatności: ';

// ---------- text helpers
// characters XML 1.0 forbids, plus the ones KSeF's own client library rejects (U+007F–0084, 0086–009F, FDD0–FDEF, U+xFFFE/xFFFF)
const BAD_CHAR = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u0084\u0086-\u009F﷐-﷯￾￿]|[\uD83F\uD87F\uD8BF\uD8FF\uD93F\uD97F\uD9BF\uD9FF\uDA3F\uDA7F\uDABF\uDAFF\uDB3F\uDB7F\uDBBF\uDBFF][\uDFFE\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cut = (v, max) => { const a = Array.from(v); return a.length > max ? a.slice(0, max).join('').trimEnd() : v; };
const tok = (v, max = 256) => cut(String(v ?? '').replace(BAD_CHAR, '').replace(/\s+/g, ' ').trim(), max); // single-line values (xs:token)
const text = v => String(v ?? '').replace(BAD_CHAR, '').replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ').replace(/ ?\n ?/g, '\n').trim(); // keeps line breaks
const digits = v => String(v ?? '').replace(/\D/g, '');
const E = (tag, v) => (v === '' || v == null ? '' : `<${tag}>${esc(v)}</${tag}>`); // optional element
const R = (tag, v) => `<${tag}>${esc(v ?? '')}</${tag}>`; // required element
const G = (tag, inner) => (inner ? `<${tag}>${inner}</${tag}>` : ''); // optional group
const dec = v => (v === '' || v == null ? null : D(v));
const amt = d => str(d, 2);

export function nipValid(nip) {
  if (!/^\d{10}$/.test(nip)) return false;
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7]; let s = 0;
  for (let i = 0; i < 9; i++) s += w[i] * Number(nip[i]);
  return s % 11 !== 10 && s % 11 === Number(nip[9]);
}

function euVat(v) {
  const s = String(v ?? '').toUpperCase().replace(/[\s.\-]/g, ''); let code = s.slice(0, 2);
  if (code === 'GR') code = 'EL';
  return EU_VAT_PREFIX.includes(code) && /^[0-9A-Z+*]{1,12}$/.test(s.slice(2)) ? { code, nr: s.slice(2) } : null;
}
// How the buyer is identified in Podmiot2: NIP, EU VAT number, another tax ID, or none
function buyerIdent(b) {
  const nat = digits(b.nationalId), vat = String(b.vatId ?? '').toUpperCase().replace(/[\s.\-]/g, '');
  if (nat) return { kind: 'NIP', nip: nat };
  if (/^PL\d{10}$/.test(vat)) return { kind: 'NIP', nip: vat.slice(2) };
  if (b.country === 'PL' && /^\d{10}$/.test(vat)) return { kind: 'NIP', nip: vat };
  const eu = euVat(vat);
  if (eu && eu.code !== 'PL') return { kind: 'UE', ...eu };
  if (tok(b.vatId)) return { kind: 'ID', country: /^[A-Z]{2}$/.test(b.country || '') ? b.country : '', id: tok(b.vatId, 50) };
  return { kind: 'none' };
}
const isEuBuyer = (country, kind) => kind === 'UE' || (EU_COUNTRY.has(country) && country !== 'PL');

function rateCode(inv, l, euBuyer) {
  const cat = inv.smallBusiness ? 'E' : l.vatCategory || 'S', r = dec(l.vatRate);
  if (cat === 'AE') return euBuyer ? 'np II' : 'oo';
  if (cat === 'S') return r && !isZero(r) ? str(r) : '0 KR';
  return { Z: '0 KR', K: '0 WDT', G: '0 EX', E: 'zw', O: 'np I' }[cat] || (r ? str(r) : '0 KR');
}
const percent = code => (/^\d+(\.\d+)?$/.test(code) ? code : '0');
const utcStamp = now => { const d = now ? new Date(now) : new Date(); return Number.isNaN(d.getTime()) ? String(now) : d.toISOString().slice(0, 19) + 'Z'; };

// ---------- write
/**
 * Build the FA(3) XML for an invoice from the form model (inv.country === 'PL').
 * Not supported for Poland: document-level allowances / charges and prepaid amounts (ignored), and the VAT amounts
 * converted to PLN (P_14_xW) that the law asks for when the invoice currency is not PLN (no exchange rate in the model).
 */
export function generateFA3(inv, { now } = {}) {
  const s = inv.seller || {}, b = inv.buyer || {}, pay = inv.payment || {}, pl = inv.pl || {};
  const kor = inv.typeCode === '381' || inv.typeCode === '384', sign = kor ? '-1' : '1';
  const ident = buyerIdent(b), euBuyer = isEuBuyer(b.country, ident.kind);
  const lines = (inv.lines || []).map((l, i) => {
    const q = dec(l.quantity), p = dec(l.unitPrice), net = q && p ? round(mul(q, p), 2) : null;
    return { l, n: i + 1, q: q && mul(q, sign), p, net: net && mul(net, sign), code: rateCode(inv, l, euBuyer) };
  });
  // totals per rate, then per summary field; a correction carries the (negative) differences
  const byCode = new Map();
  for (const x of lines) if (x.net) byCode.set(x.code, add(byCode.get(x.code) || '0', x.net));
  const bucket = {}; let total = D('0');
  for (const [code, basis] of byCode) {
    const k = BUCKET[code] || '1', g = bucket[k] || (bucket[k] = { basis: D('0'), vat: D('0') });
    const vat = TAXED.includes(k) ? round(div(mul(basis, percent(code)), '100', 6), 2) : D('0');
    g.basis = add(g.basis, basis); g.vat = add(g.vat, vat); total = add(total, add(basis, vat));
  }
  const has = code => lines.some(x => x.code === code);
  const sellerNip = digits(s.nationalId) || digits(String(s.vatId ?? '').replace(/^\s*PL/i, ''));
  const cityLine = a => tok([a.postcode, a.city].filter(Boolean).join(' '), 512);
  const address = a => R('KodKraju', tok(a.country, 2)) + R('AdresL1', tok(a.street, 512) || cityLine(a)) + (tok(a.street) ? E('AdresL2', cityLine(a)) : '');
  const email = v => { const e = tok(v, 255); return /^.+@.+$/.test(e) ? e : ''; };
  const phone = v => { let p = tok(v); if (p.length > 16) p = p.replace(/[\s\-()./]/g, ''); return p.length <= 16 ? p : ''; };

  const note = text(inv.note).split('\n');
  const reason = kor ? tok(note[0]) || 'Korekta' : '';
  const reg = tok(s.legalRegistration), krs = /^(?:KRS\b[\s:.]*)?(\d{10})$/i.exec(reg), regon = /^REGON\b[\s:.]*(\d{9}|\d{14})$/i.exec(reg);
  // free text goes to the invoice footer: at most 3 blocks of 3,500 characters
  const body = [(kor ? note.slice(1) : note).join('\n').trim(), text(s.legalInfo), krs || regon ? '' : reg].filter(Boolean).join('\n');
  const terms = text(inv.paymentTerms) ? TERMS_PREFIX + text(inv.paymentTerms) : '';
  const blocks = []; for (let a = Array.from(body); a.length && blocks.length < (terms ? 2 : 3); a = a.slice(3500)) blocks.push(a.slice(0, 3500).join('').trim());
  if (terms) blocks.push(cut(terms, 3500));

  const iban = String(pay.iban ?? '').replace(/\s+/g, '').toUpperCase().replace(BAD_CHAR, ''), bic = String(pay.bic ?? '').replace(/\s+/g, '').toUpperCase();
  const payment = G('TerminPlatnosci', E('Termin', tok(inv.dueDate))) + E('FormaPlatnosci', FORMA[pay.meansCode])
    + (iban.length >= 10 && iban.length <= 34 ? G('RachunekBankowy', R('NrRB', iban) + E('SWIFT', /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic) ? bic : '')) : '');
  const extra = (k, v) => (tok(v) ? G('DodatkowyOpis', R('Klucz', k) + R('Wartosc', tok(v))) : '');
  const exempt = has('zw');

  return '<?xml version="1.0" encoding="UTF-8"?>' + `<Faktura xmlns="${FA3_NS}">`
    + G('Naglowek', '<KodFormularza kodSystemowy="FA (3)" wersjaSchemy="1-0E">FA</KodFormularza>' + R('WariantFormularza', '3') + R('DataWytworzeniaFa', utcStamp(now)) + R('SystemInfo', 'eos e-invoice'))
    + G('Podmiot1', (has('0 WDT') || has('np II') ? R('PrefiksPodatnika', 'PL') : '') + G('DaneIdentyfikacyjne', R('NIP', sellerNip) + R('Nazwa', tok(s.name, 512))) + G('Adres', address(s))
      + G('DaneKontaktowe', E('Email', email(s.contactEmail)) + E('Telefon', phone(s.contactPhone))))
    + G('Podmiot2', G('DaneIdentyfikacyjne', (ident.kind === 'NIP' ? R('NIP', ident.nip) : ident.kind === 'UE' ? R('KodUE', ident.code) + R('NrVatUE', ident.nr) : ident.kind === 'ID' ? E('KodKraju', ident.country) + R('NrID', ident.id) : R('BrakID', '1')) + E('Nazwa', tok(b.name, 512)))
      + (tok(b.street) ? G('Adres', address(b)) : '') + G('DaneKontaktowe', E('Email', email(b.email))) + E('NrKlienta', tok(b.id)) + R('JST', '2') + R('GV', '2'))
    + G('Fa', R('KodWaluty', tok(inv.currency || 'PLN', 3)) + R('P_1', tok(inv.issueDate)) + R('P_2', tok(inv.number))
      + (tok(inv.deliveryDate) ? R('P_6', tok(inv.deliveryDate)) : tok(inv.periodStart) || tok(inv.periodEnd) ? G('OkresFa', R('P_6_Od', tok(inv.periodStart) || tok(inv.periodEnd)) + R('P_6_Do', tok(inv.periodEnd) || tok(inv.periodStart))) : '')
      + TAXED.map(k => (bucket[k] ? R('P_13_' + k, amt(bucket[k].basis)) + R('P_14_' + k, amt(bucket[k].vat)) : '')).join('')
      + UNTAXED.map(k => (bucket[k] ? R('P_13_' + k, amt(bucket[k].basis)) : '')).join('')
      + R('P_15', amt(total))
      + G('Adnotacje', R('P_16', '2') + R('P_17', '2') + R('P_18', has('oo') || has('np II') ? '1' : '2') + R('P_18A', pl.splitPayment ? '1' : '2')
        + G('Zwolnienie', exempt ? R('P_19', '1') + R('P_19A', tok(pl.exemptionBasis) || tok(inv.exemptionReason) || (inv.smallBusiness ? 'art. 113 ust. 1 ustawy o VAT' : 'art. 43 ust. 1 ustawy o VAT')) : R('P_19N', '1'))
        + G('NoweSrodkiTransportu', R('P_22N', '1')) + R('P_23', '2') + G('PMarzy', R('P_PMarzyN', '1')))
      + R('RodzajFaktury', kor ? 'KOR' : 'VAT')
      + (kor ? R('PrzyczynaKorekty', reason) + G('DaneFaKorygowanej', R('DataWystFaKorygowanej', tok(inv.precedingDate)) + R('NrFaKorygowanej', tok(inv.precedingNumber))
        + (tok(pl.precedingKsef) ? R('NrKSeF', '1') + R('NrKSeFFaKorygowanej', tok(pl.precedingKsef)) : R('NrKSeFN', '1'))) : '')
      + extra(KEY_BUYER_REF, inv.buyerReference) + extra(KEY_REMITTANCE, pay.remittance)
      + lines.map(x => G('FaWiersz', R('NrWierszaFa', x.n) + E('P_7', tok([x.l.name, x.l.description].map(v => tok(v, 512)).filter(Boolean).join(' – '), 512)) + E('Indeks', tok(x.l.itemId, 50))
        + E('P_8A', tok(PL_UNIT[x.l.unit] || x.l.unit)) + E('P_8B', x.q && str(round(x.q, 6))) + E('P_9A', x.p && (x.p.s <= 2 ? str(x.p, 2) : str(round(x.p, 8)))) + E('P_11', x.net && amt(x.net)) + R('P_12', x.code))).join('')
      + G('Platnosc', payment)
      + G('WarunkiTransakcji', G('Umowy', E('NrUmowy', tok(inv.contractReference))) + G('Zamowienia', E('NrZamowienia', tok(inv.orderReference)))))
    + G('Stopka', blocks.map(t => G('Informacje', E('StopkaFaktury', t))).join('') + G('Rejestry', E('KRS', krs && krs[1]) + E('REGON', regon && regon[1])))
    + '</Faktura>';
}

// ---------- read
const kids = (el, name) => { const out = []; if (!el) return out; for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && (!name || n.localName === name)) out.push(n); return out; };
const kid = (el, name) => { if (!el) return null; for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && n.localName === name) return n; return null; };
const path = (el, p) => { let cur = el; for (const seg of p.split('/')) { cur = kid(cur, seg); if (!cur) return null; } return cur; };
const txt = (el, p) => { const n = p ? path(el, p) : el; return n ? (n.textContent || '').replace(/\s+/g, ' ').trim() : ''; };
const raw = (el, p) => { const n = p ? path(el, p) : el; return n ? (n.textContent || '').trim() : ''; };
const num = (el, p) => { const v = txt(el, p); return /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(v) ? D(v) : null; };
const KSEF_NUMBER = /\b(?:[1-9]\d{9}|M\d{9}|[A-Z]{3}\d{7})-20\d{6}-[0-9A-F]{6}-?[0-9A-F]{6}-[0-9A-F]{2}\b/;

// "00-950 Warszawa" → ['00-950', 'Warszawa']; leading parts that look like a postcode are split off
function splitCityLine(v) {
  const parts = v.split(' '), code = [];
  while (parts.length > 1 && (/\d/.test(parts[0]) || (code.length && /^[A-Z]{1,3}$/.test(parts[0]))) && code.length < 2) code.push(parts.shift());
  return [code.join(' '), parts.join(' ')];
}
function party(p, seller, regs) {
  if (!p) return null;
  const di = kid(p, 'DaneIdentyfikacyjne'), a = kid(p, 'Adres'), dk = kid(p, 'DaneKontaktowe');
  const nip = txt(di, 'NIP'), ue = txt(di, 'KodUE'), nrUe = txt(di, 'NrVatUE'), nrId = txt(di, 'NrID'), prefix = txt(p, 'PrefiksPodatnika');
  const [postcode, city] = splitCityLine(txt(a, 'AdresL2'));
  const mail = txt(dk, 'Email'), tel = txt(dk, 'Telefon');
  return {
    name: txt(di, 'Nazwa'), ids: seller ? [] : [txt(p, 'NrKlienta')].filter(Boolean),
    vatId: seller ? (prefix && nip ? prefix + nip : '') : nip || (ue || nrUe ? ue + nrUe : nrId), taxNumber: nip,
    legalRegistration: seller ? regs : '', legalInfo: '',
    address: a ? { street: txt(a, 'AdresL1'), line2: '', postcode, city, country: txt(a, 'KodKraju') } : null,
    email: seller ? '' : mail, contact: mail || tel ? { name: '', phone: tel, email: mail } : null,
  };
}

/** Read an FA(3) document into the same display object that parseCII / parseUBL in parse.js produce, plus `pl` extras. */
export function parseFA3(doc) {
  const root = doc.documentElement, hd = kid(root, 'Naglowek'), p1 = kid(root, 'Podmiot1'), p2 = kid(root, 'Podmiot2'), fa = kid(root, 'Fa'), st = kid(root, 'Stopka');
  const adn = kid(fa, 'Adnotacje'), zw = kid(adn, 'Zwolnienie'), plat = kid(fa, 'Platnosc'), wt = kid(fa, 'WarunkiTransakcji'), roz = kid(fa, 'Rozliczenie');
  const kind = txt(fa, 'RodzajFaktury'), kor = /^KOR/.test(kind);
  const exemption = txt(zw, 'P_19A') || txt(zw, 'P_19B') || txt(zw, 'P_19C');
  const di2 = kid(p2, 'DaneIdentyfikacyjne');
  const buyerIdKind = kid(di2, 'NIP') ? 'NIP' : kid(di2, 'KodUE') || kid(di2, 'NrVatUE') ? 'UE' : kid(di2, 'NrID') ? 'ID' : 'none';
  const buyerCountry = txt(p2, 'Adres/KodKraju') || (buyerIdKind === 'NIP' ? 'PL' : buyerIdKind === 'UE' ? txt(di2, 'KodUE').replace('EL', 'GR') : txt(di2, 'KodKraju'));
  const euBuyer = isEuBuyer(buyerCountry, buyerIdKind);
  const catOf = w => {
    const code = txt(w, 'P_12'), oss = txt(w, 'P_12_XII');
    if (oss) return ['S', oss];
    if (code === 'np II') return [euBuyer ? 'AE' : 'O', '0'];
    return CODE_CAT[code] ? [CODE_CAT[code], '0'] : [code ? 'S' : '', code];
  };
  const rows = kids(fa, 'FaWiersz');
  const lines = rows.map(w => {
    const [vatCategory, vatRate] = catOf(w);
    const attributes = [['GTIN', 'GTIN'], ['PKWiU', 'PKWiU'], ['CN', 'CN'], ['PKOB', 'PKOB'], ['GTU', 'GTU'], ['Procedura', 'Procedure'], ['P_6A', 'Date'], ['P_10', 'Discount'], ['P_9B', 'Gross unit price'], ['P_11A', 'Gross amount']]
      .map(([tag, name]) => ({ name, value: txt(w, tag) })).filter(a => a.value);
    if (txt(w, 'StanPrzed') === '1') attributes.push({ name: 'Correction', value: 'state before the correction' });
    return { id: txt(w, 'NrWierszaFa'), name: txt(w, 'P_7'), description: '', sellerItemId: txt(w, 'Indeks'), quantity: txt(w, 'P_8B'), unit: txt(w, 'P_8A'), unitPrice: txt(w, 'P_9A'), netAmount: txt(w, 'P_11'), vatCategory, vatRate, allowances: [], attributes };
  });
  // VAT summary from the P_13_x / P_14_x fields
  const bk = (k, category, rate, reason = '') => { const basis = num(fa, 'P_13_' + k); return basis ? [{ category, rate, basis: amt(basis), tax: amt(num(fa, 'P_14_' + k) || '0'), exemptionReason: reason, exemptionCode: '' }] : []; };
  const rateIn = k => { const used = [...new Set(rows.filter(w => (txt(w, 'P_12_XII') ? '5' : BUCKET[txt(w, 'P_12')]) === k).map(w => txt(w, 'P_12_XII') || txt(w, 'P_12')))]; return used.length === 1 ? used[0] : k === '5' ? '' : BUCKET_RATES[k][0]; };
  const breakdown = [...TAXED.flatMap(k => bk(k, 'S', rateIn(k))), ...bk('5', 'S', rateIn('5'), 'Procedura szczególna OSS (One Stop Shop)'), ...bk('6_1', 'Z', '0'), ...bk('6_2', 'K', '0'), ...bk('6_3', 'G', '0'),
    ...bk('7', 'E', '0', exemption), ...bk('8', 'O', '0'), ...bk('9', euBuyer ? 'AE' : 'O', '0', euBuyer ? 'Odwrotne obciążenie (reverse charge)' : ''), ...bk('10', 'AE', '0', 'Odwrotne obciążenie (reverse charge)'), ...bk('11', 'E', '0', 'Procedura marży (margin scheme)')];
  const basisAll = sum(breakdown.map(g => g.basis)), taxAll = sum(breakdown.map(g => g.tax));
  const lineNets = lines.map(l => l.netAmount).filter(v => /^-?\d+(\.\d+)?$/.test(v));
  const grand = num(fa, 'P_15'), toPay = num(roz, 'DoZaplaty');

  // free text: footer blocks, additional descriptions, the reason for a correction
  const footer = kids(st, 'Informacje').map(n => raw(n, 'StopkaFaktury')).filter(Boolean);
  const extras = kids(fa, 'DodatkowyOpis').map(n => [txt(n, 'Klucz'), txt(n, 'Wartosc')]);
  const terms = [...footer.filter(t => t.startsWith(TERMS_PREFIX)).map(t => t.slice(TERMS_PREFIX.length)),
    ...kids(plat, 'TerminPlatnosci').map(n => [txt(n, 'TerminOpis/Ilosc'), txt(n, 'TerminOpis/Jednostka'), txt(n, 'TerminOpis/ZdarzeniePoczatkowe')].filter(Boolean).join(' ')).filter(Boolean),
    kid(plat, 'Skonto') ? `Skonto: ${txt(plat, 'Skonto/WarunkiSkonta')} – ${txt(plat, 'Skonto/WysokoscSkonta')}` : '', txt(plat, 'Zaplacono') === '1' ? `Paid on ${txt(plat, 'DataZaplaty')}` : ''].filter(Boolean);
  const forma = txt(plat, 'FormaPlatnosci'), other = txt(plat, 'OpisPlatnosci');
  const regs = [...kids(st, 'Rejestry').flatMap(n => [txt(n, 'KRS') && 'KRS ' + txt(n, 'KRS'), txt(n, 'REGON') && 'REGON ' + txt(n, 'REGON'), txt(n, 'BDO') && 'BDO ' + txt(n, 'BDO')])].filter(Boolean).join(', ');
  const flag = (el, name) => txt(el, name) === '1';
  const margin = kid(adn, 'PMarzy');
  const annotations = [flag(adn, 'P_16') && 'Cash accounting (metoda kasowa)', flag(adn, 'P_17') && 'Self-billing (samofakturowanie)', flag(adn, 'P_18') && 'Reverse charge (odwrotne obciążenie)',
    flag(adn, 'P_18A') && 'Split payment (mechanizm podzielonej płatności)', flag(zw, 'P_19') && `Exempt from VAT${exemption ? ': ' + exemption : ''}`, flag(kid(adn, 'NoweSrodkiTransportu'), 'P_22') && 'Intra-EU supply of new means of transport',
    flag(adn, 'P_23') && 'Simplified triangular transaction (procedura uproszczona)', flag(margin, 'P_PMarzy') && 'Margin scheme (procedura marży)', flag(fa, 'FP') && 'Invoice issued for a cash-register receipt (FP)', flag(fa, 'TP') && 'Seller and buyer are related parties (TP)'].filter(Boolean);
  let ksefNumber = '';
  for (let n = doc.firstChild; n && !ksefNumber; n = n.nextSibling) if (n.nodeType === 8 || n.nodeType === 7) ksefNumber = (KSEF_NUMBER.exec(n.nodeValue || '') || [''])[0];
  if (!ksefNumber && root.attributes) for (let i = 0; i < root.attributes.length && !ksefNumber; i++) ksefNumber = (KSEF_NUMBER.exec(root.attributes[i].value || '') || [''])[0];

  return {
    specId: 'FA(3)', businessProcess: '',
    number: txt(fa, 'P_2'), typeCode: kor ? '381' : '380', issueDate: txt(fa, 'P_1'), dueDate: kids(plat, 'TerminPlatnosci').map(n => txt(n, 'Termin')).find(Boolean) || '', currency: txt(fa, 'KodWaluty'),
    notes: [txt(fa, 'PrzyczynaKorekty'), ...footer.filter(t => !t.startsWith(TERMS_PREFIX)), ...extras.filter(([k]) => k !== KEY_REMITTANCE && k !== KEY_BUYER_REF).map(([k, v]) => `${k}: ${v}`)].filter(Boolean),
    buyerReference: (extras.find(([k]) => k === KEY_BUYER_REF) || [])[1] || '', orderReference: kids(wt, 'Zamowienia').map(n => txt(n, 'NrZamowienia')).find(Boolean) || '',
    contractReference: kids(wt, 'Umowy').map(n => txt(n, 'NrUmowy')).find(Boolean) || '',
    precedingInvoices: kids(fa, 'DaneFaKorygowanej').map(n => ({ number: txt(n, 'NrFaKorygowanej'), date: txt(n, 'DataWystFaKorygowanej'), ksefNumber: txt(n, 'NrKSeFFaKorygowanej') })),
    deliveryDate: txt(fa, 'P_6'), periodStart: txt(fa, 'OkresFa/P_6_Od'), periodEnd: txt(fa, 'OkresFa/P_6_Do'),
    seller: party(p1, true, regs), buyer: party(p2, false, ''),
    payment: {
      meansCode: forma ? (FORMA_BACK[forma] || ['1'])[0] : other ? '1' : '', meansText: forma ? (FORMA_BACK[forma] || ['', ''])[1] : other,
      remittance: (extras.find(([k]) => k === KEY_REMITTANCE) || [])[1] || '',
      accounts: kids(plat, 'RachunekBankowy').map(n => ({ iban: txt(n, 'NrRB'), bic: txt(n, 'SWIFT'), accountName: '' })).filter(a => a.iban), terms: terms.join('\n'),
    },
    allowances: [], breakdown,
    totals: { lineTotal: amt(lineNets.length && lineNets.length === lines.length ? sum(lineNets) : basisAll), allowanceTotal: '', chargeTotal: '', taxBasis: amt(basisAll), taxTotal: amt(taxAll), grandTotal: grand ? amt(grand) : '', prepaid: '', rounding: '', due: toPay ? amt(toPay) : grand ? amt(grand) : '' },
    attachments: [], lines,
    pl: {
      invoiceKind: kind, ksefNumber, splitPayment: flag(adn, 'P_18A'), annotations, exemptionBasis: exemption, correctionReason: txt(fa, 'PrzyczynaKorekty'), precedingKsef: txt(fa, 'DaneFaKorygowanej/NrKSeFFaKorygowanej'),
      buyerIdKind, buyerCountry, placeOfIssue: txt(fa, 'P_1M'), createdAt: txt(hd, 'DataWytworzeniaFa'), systemInfo: txt(hd, 'SystemInfo'),
      settlement: roz ? { charges: kids(roz, 'Obciazenia').map(n => ({ amount: txt(n, 'Kwota'), reason: txt(n, 'Powod') })), deductions: kids(roz, 'Odliczenia').map(n => ({ amount: txt(n, 'Kwota'), reason: txt(n, 'Powod') })), toPay: txt(roz, 'DoZaplaty'), toSettle: txt(roz, 'DoRozliczenia') } : null,
    },
  };
}

/** Map a parsed FA(3) invoice (parseFA3) onto the editable form model. A correction gets positive quantities again. */
export function fa3ToFormModel(data) {
  const inv = emptyInvoice(), pl = data.pl || {}, kor = data.typeCode === '381';
  const flip = v => (kor && /^-?\d+(\.\d+)?$/.test(v || '') ? str(mul(D(v), '-1')) : v || '');
  const addr = p => { const a = (p && p.address) || {}; return { street: [a.street, a.line2].filter(Boolean).join(', '), postcode: a.postcode || '', city: a.city || '', country: a.country || '' }; };
  const s = data.seller || {}, b = data.buyer || {}, prev = (data.precedingInvoices || [])[0] || {};
  Object.assign(inv, {
    country: 'PL', typeCode: kor ? '381' : '380', number: data.number || '', issueDate: data.issueDate || '', dueDate: data.dueDate || '', currency: data.currency || 'PLN',
    buyerReference: data.buyerReference || '', orderReference: data.orderReference || '', contractReference: data.contractReference || '', precedingNumber: prev.number || '', precedingDate: prev.date || '',
    deliveryDate: data.deliveryDate || '', periodStart: data.periodStart || '', periodEnd: data.periodEnd || '', note: (data.notes || []).join('\n'), paymentTerms: (data.payment && data.payment.terms) || '',
  });
  inv.pl = { ...inv.pl, exemptionBasis: pl.exemptionBasis || '', splitPayment: !!pl.splitPayment, precedingKsef: pl.precedingKsef || '' };
  Object.assign(inv.seller, { name: s.name || '', nationalId: s.taxNumber || '', vatId: s.vatId || '', legalRegistration: s.legalRegistration || '', ...addr(s), contactPhone: (s.contact && s.contact.phone) || '', contactEmail: (s.contact && s.contact.email) || '' });
  inv.seller.country = inv.seller.country || 'PL';
  Object.assign(inv.buyer, { name: b.name || '', nationalId: pl.buyerIdKind === 'NIP' ? b.taxNumber || '' : '', vatId: pl.buyerIdKind === 'NIP' ? '' : b.vatId || '', ...addr(b), email: b.email || '', id: (b.ids || [])[0] || '' });
  inv.buyer.country = inv.buyer.country || pl.buyerCountry || (pl.buyerIdKind === 'none' ? '' : 'PL');
  const pay = data.payment || {}, acct = (pay.accounts || [])[0] || {};
  Object.assign(inv.payment, { meansCode: pay.meansCode || '1', iban: acct.iban || '', bic: acct.bic || '', accountName: '', remittance: pay.remittance || '' });
  inv.lines = (data.lines || []).map((l, i) => ({ ...emptyLine(i + 1), id: l.id || String(i + 1), name: l.name || '', description: l.description || '', itemId: l.sellerItemId || '', quantity: flip(l.quantity), unit: UNIT_CODE[l.unit] || l.unit || 'C62', unitPrice: l.unitPrice || '', vatCategory: l.vatCategory || 'S', vatRate: l.vatCategory === 'S' ? l.vatRate || '0' : '0' }));
  if (!inv.lines.length) inv.lines = [emptyLine(1)];
  inv.smallBusiness = inv.lines.length > 0 && (data.lines || []).length > 0 && data.lines.every(l => l.vatCategory === 'E') && /art\.?\s*113/i.test(pl.exemptionBasis || '');
  return inv;
}

// ---------- our own cross-checks (not official KSeF rules)
const near = (a, b, tol) => { const d = sub(a, b); return cmp(d.n < 0n ? mul(d, '-1') : d, tol) <= 0; };
const locate = node => { const segs = []; for (let n = node; n && n.nodeType === 1; n = n.parentNode) { let i = 1; for (let p = n.previousSibling; p; p = p.previousSibling) if (p.nodeType === 1 && p.nodeName === n.nodeName) i++; segs.unshift(`${n.nodeName}[${i}]`); } return '/' + segs.join('/'); };

/**
 * Additional plausibility checks on an FA(3) document. These are this app's own checks, NOT rules published by KSeF:
 * KSeF itself validates the file against the schema and a few business rules, but does not recalculate the amounts.
 * `today` (YYYY-MM-DD) is only used for the "date in the future" check.
 */
export function fa3Checks(doc, { today } = {}) {
  const out = [];
  const root = doc && doc.documentElement;
  if (!root || root.localName !== 'Faktura') return out;
  const push = (id, severity, node, field, title, fix) => out.push({ id, severity, title, fix, field, location: locate(node || root), node: node || root });
  const fa = kid(root, 'Fa'), adn = kid(fa, 'Adnotacje'), kind = txt(fa, 'RodzajFaktury');
  const rows = kids(fa, 'FaWiersz'), cur = txt(fa, 'KodWaluty');

  // tax IDs
  const sn = path(root, 'Podmiot1/DaneIdentyfikacyjne/NIP'), bn = path(root, 'Podmiot2/DaneIdentyfikacyjne/NIP');
  if (sn && /^\d{10}$/.test(txt(sn)) && !nipValid(txt(sn))) push('PL-NIP-01', 'error', sn, 'seller.nationalId', `The seller’s tax ID (NIP) ${txt(sn)} is not a valid number`, 'Compare the 10 digits with your tax registration: at least one digit is mistyped (the last digit is a check digit that does not match).');
  if (bn && /^\d{10}$/.test(txt(bn)) && !nipValid(txt(bn))) push('PL-NIP-02', 'warning', bn, 'buyer.nationalId', `The buyer’s tax ID (NIP) ${txt(bn)} is not a valid number`, 'Ask your customer for their NIP again: at least one digit is mistyped. With a wrong NIP the customer will not see this invoice in KSeF.');

  // characters that KSeF's own client library refuses before sending
  const bad = (function find(el) {
    if (el.attributes) for (let i = 0; i < el.attributes.length; i++) { BAD_CHAR.lastIndex = 0; const m = BAD_CHAR.exec(el.attributes[i].value || ''); if (m) return [el, m[0]]; }
    for (let n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 || n.nodeType === 4) { BAD_CHAR.lastIndex = 0; const m = BAD_CHAR.exec(n.nodeValue || ''); if (m) return [el, m[0]]; } else if (n.nodeType === 1) { const r = find(n); if (r) return r; }
    }
    return null;
  }(root));
  if (bad) push('PL-CHR-01', 'error', bad[0], null, `The text contains a control character (U+${bad[1].codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}) that KSeF does not accept`, 'Delete the invisible character and type the text again; it usually arrives with text pasted from another program.');

  // invoice lines: net amount = quantity × unit price − discount
  let shown = 0;
  rows.forEach((w, i) => {
    const q = num(w, 'P_8B'), p = num(w, 'P_9A'), net = num(w, 'P_11'), disc = num(w, 'P_10') || D('0');
    if (!q || !p || !net) return;
    // P_10 is used both as a discount for the whole line and as a discount per unit; accept either reading
    if (near(net, sub(mul(q, p), disc), '0.01') || near(net, mul(q, sub(p, disc)), '0.01')) return;
    if (shown++ < 10) push('PL-LINE-01', 'warning', kid(w, 'P_11'), `lines.${i}.unitPrice`, `Line ${txt(w, 'NrWierszaFa') || i + 1}: the net amount ${txt(w, 'P_11')} is not quantity × unit price (${str(round(sub(mul(q, p), disc), 2), 2)})`, 'Check the quantity, the unit price, any discount and the net amount of this line.');
  });

  // summary fields
  const present = k => kid(fa, 'P_13_' + k), val = name => num(fa, name) || D('0');
  const ALL = [...TAXED, '5', ...UNTAXED, '11'];
  const bucketOf = w => (txt(w, 'P_12_XII') ? '5' : BUCKET[txt(w, 'P_12')]);
  const usable = rows.length > 0 && (kind === 'VAT' || kind === 'KOR' || kind === 'UPR') && txt(adn, 'PMarzy/P_PMarzy') !== '1' && rows.every(w => num(w, 'P_11') && bucketOf(w));
  if (usable) {
    for (const k of ALL) {
      const mine = rows.filter(w => bucketOf(w) === k); if (!mine.length && !present(k)) continue;
      const lineSum = sum(mine.map(w => (txt(w, 'StanPrzed') === '1' ? mul(num(w, 'P_11'), '-1') : num(w, 'P_11'))));
      if (!near(lineSum, val('P_13_' + k), '0.01')) push('PL-SUM-01', 'warning', present(k) || fa, null, `The net total P_13_${k} (${present(k) ? txt(present(k)) : 'missing'}) does not match the invoice lines at this VAT rate (${amt(lineSum)})`, 'Add up the net amounts of the lines with this VAT rate and correct the total, or correct the lines.');
    }
  }
  for (const k of TAXED) {
    if (!present(k) || !num(fa, 'P_14_' + k)) continue;
    const basis = val('P_13_' + k), vat = val('P_14_' + k), mine = rows.filter(w => bucketOf(w) === k);
    const tol = str(mul('0.01', String(Math.max(1, mine.length))));
    const expected = [];
    if (usable && mine.length) expected.push(sum([...new Set(mine.map(w => txt(w, 'P_12')))].map(r => round(div(mul(sum(mine.filter(w => txt(w, 'P_12') === r).map(w => (txt(w, 'StanPrzed') === '1' ? mul(num(w, 'P_11'), '-1') : num(w, 'P_11')))), r), '100', 6), 2))));
    else for (const r of BUCKET_RATES[k]) expected.push(round(div(mul(basis, r), '100', 6), 2));
    if (!expected.some(e => near(vat, e, tol))) push('PL-VAT-01', 'warning', kid(fa, 'P_14_' + k), null, `The VAT amount P_14_${k} (${txt(fa, 'P_14_' + k)}) does not match ${BUCKET_RATES[k].join('% or ')}% of the net total ${txt(fa, 'P_13_' + k)} (${amt(expected[0])})`, 'Recalculate the VAT for this rate: net total × VAT rate, rounded to two decimal places.');
  }
  const p15 = kid(fa, 'P_15');
  if (p15 && num(fa, 'P_15')) {
    const expected = sum([...ALL.map(k => val('P_13_' + k)), ...[...TAXED, '5'].map(k => val('P_14_' + k))]);
    if (!near(num(fa, 'P_15'), expected, '0.01')) push('PL-SUM-02', 'warning', p15, null, `The total amount due P_15 (${txt(p15)}) is not the sum of the net totals and VAT amounts (${amt(expected)})`, 'The total must equal all net totals (P_13_…) plus all VAT amounts (P_14_…). Correct the total or the summary fields.');
  }
  if (cur && cur !== 'PLN') for (const k of TAXED) {
    if (num(fa, 'P_14_' + k) && !isZero(num(fa, 'P_14_' + k)) && !kid(fa, `P_14_${k}W`)) { push('PL-CUR-01', 'warning', kid(fa, 'P_14_' + k), 'currency', `The invoice is in ${cur}, but the VAT amount is not also given in Polish złoty (P_14_${k}W)`, 'Polish law asks for the VAT amount in PLN on invoices in a foreign currency. This app cannot convert it yet: issue the invoice in PLN, or add the PLN amount in your accounting software.'); break; }
  }

  // annotations that must go together
  const zwRow = rows.find(w => txt(w, 'P_12') === 'zw');
  if (zwRow && txt(adn, 'Zwolnienie/P_19') !== '1') push('PL-ZW-01', 'error', kid(zwRow, 'P_12'), 'pl.exemptionBasis', 'A line is exempt from VAT (“zw”), but the invoice does not say on which legal basis', 'State the exemption: set P_19 to 1 and give the legal basis (for example “art. 43 ust. 1 pkt 29 ustawy o VAT” or “art. 113 ust. 1 ustawy o VAT”).');
  if (/^KOR/.test(kind) && !kid(fa, 'DaneFaKorygowanej')) push('PL-KOR-01', 'error', kid(fa, 'RodzajFaktury'), 'precedingNumber', 'This is a correcting invoice, but it does not say which invoice it corrects', 'Add the number and the date of the original invoice (and its KSeF number, if it was sent through KSeF).');

  // dates
  const p1 = kid(fa, 'P_1'), now = /^\d{4}-\d{2}-\d{2}$/.test(today || '') ? today : new Date().toISOString().slice(0, 10);
  const limit = new Date(Date.UTC(+now.slice(0, 4), +now.slice(5, 7) - 1, +now.slice(8, 10) + 1)).toISOString().slice(0, 10);
  if (p1 && /^\d{4}-\d{2}-\d{2}$/.test(txt(p1)) && txt(p1) > limit) push('PL-DATE-01', 'warning', p1, 'issueDate', `The invoice date ${txt(p1)} is in the future`, 'Use the date on which you actually issue the invoice. KSeF records the day it receives the file.');
  return out;
}

// ---------- English names for the schema's element names (used in messages of the structure check)
export const PL_FIELD_LABEL = Object.fromEntries(Object.entries({
  Faktura: 'Invoice', Naglowek: 'File header', KodFormularza: 'Form code', WariantFormularza: 'Form version', DataWytworzeniaFa: 'File creation time', SystemInfo: 'Software name',
  Podmiot1: 'Seller', Podmiot2: 'Buyer', Podmiot3: 'Additional party', PodmiotUpowazniony: 'Authorised party', DaneIdentyfikacyjne: 'Identification', NIP: 'Tax ID', Nazwa: 'Name',
  PrefiksPodatnika: 'EU VAT prefix of the seller', NrEORI: 'EORI number', KodUE: 'EU country prefix', NrVatUE: 'EU VAT number', NrID: 'Foreign tax ID', BrakID: 'No tax ID marker', IDWew: 'Internal unit ID',
  Adres: 'Address', AdresKoresp: 'Postal address', KodKraju: 'Country code', AdresL1: 'Address line 1', AdresL2: 'Address line 2', GLN: 'Global location number',
  DaneKontaktowe: 'Contact details', Email: 'E-mail address', Telefon: 'Phone number', NrKlienta: 'Customer number', IDNabywcy: 'Buyer link key', JST: 'Local-government unit marker', GV: 'VAT group marker',
  Rola: 'Role of the party', Udzial: 'Share', StatusInfoPodatnika: 'Taxpayer status',
  Fa: 'Invoice details', KodWaluty: 'Currency', P_1: 'Invoice date', P_1M: 'Place of issue', P_2: 'Invoice number', WZ: 'Delivery note number', P_6: 'Delivery date', OkresFa: 'Invoice period', P_6_Od: 'Period start', P_6_Do: 'Period end',
  P_13_1: 'Net total at 23% or 22%', P_14_1: 'VAT at 23% or 22%', P_14_1W: 'VAT at 23% or 22% in PLN', P_13_2: 'Net total at 8% or 7%', P_14_2: 'VAT at 8% or 7%', P_14_2W: 'VAT at 8% or 7% in PLN',
  P_13_3: 'Net total at 5%', P_14_3: 'VAT at 5%', P_14_3W: 'VAT at 5% in PLN', P_13_4: 'Net total, taxi flat rate', P_14_4: 'VAT, taxi flat rate', P_14_4W: 'VAT, taxi flat rate, in PLN', P_13_5: 'Net total under the OSS procedure', P_14_5: 'VAT under the OSS procedure',
  P_13_6_1: 'Net total at 0% (domestic)', P_13_6_2: 'Net total at 0% (intra-EU supply)', P_13_6_3: 'Net total at 0% (export)', P_13_7: 'Total exempt from VAT', P_13_8: 'Total supplied outside Poland',
  P_13_9: 'Total of services for EU businesses', P_13_10: 'Total under domestic reverse charge', P_13_11: 'Total under the margin scheme', P_15: 'Total amount due', KursWalutyZ: 'Exchange rate',
  Adnotacje: 'Annotations', P_16: 'Cash accounting marker', P_17: 'Self-billing marker', P_18: 'Reverse charge marker', P_18A: 'Split payment marker', Zwolnienie: 'VAT exemption', P_19: 'Exempt supply marker',
  P_19A: 'Legal basis of the exemption (Polish law)', P_19B: 'Legal basis of the exemption (EU directive)', P_19C: 'Legal basis of the exemption (other)', P_19N: 'No exemption marker',
  NoweSrodkiTransportu: 'New means of transport', P_22: 'New means of transport marker', P_22N: 'No new means of transport marker', P_23: 'Simplified triangular procedure marker', PMarzy: 'Margin scheme', P_PMarzy: 'Margin scheme marker', P_PMarzyN: 'No margin scheme marker',
  RodzajFaktury: 'Invoice type', PrzyczynaKorekty: 'Reason for the correction', TypKorekty: 'Type of correction', DaneFaKorygowanej: 'Corrected invoice', DataWystFaKorygowanej: 'Date of the corrected invoice',
  NrFaKorygowanej: 'Number of the corrected invoice', NrKSeF: 'Corrected invoice has a KSeF number marker', NrKSeFFaKorygowanej: 'KSeF number of the corrected invoice', NrKSeFN: 'Corrected invoice issued outside KSeF marker',
  DodatkowyOpis: 'Additional description', Klucz: 'Description key', Wartosc: 'Description value', FaWiersz: 'Invoice line', NrWierszaFa: 'Line number', UU_ID: 'Line identifier', P_6A: 'Line date', P_7: 'Item name', Indeks: 'Item code',
  GTIN: 'GTIN', PKWiU: 'PKWiU code', CN: 'CN code', P_8A: 'Unit', P_8B: 'Quantity', P_9A: 'Net unit price', P_9B: 'Gross unit price', P_10: 'Discount', P_11: 'Line net amount', P_11A: 'Line gross amount', P_11Vat: 'Line VAT amount', P_12: 'VAT rate',
  P_12_XII: 'OSS VAT rate', GTU: 'GTU code', Procedura: 'Procedure code', KursWaluty: 'Exchange rate', StanPrzed: 'State before correction marker',
  Rozliczenie: 'Settlement', DoZaplaty: 'Amount to pay', DoRozliczenia: 'Amount to settle', Platnosc: 'Payment', Zaplacono: 'Paid marker', DataZaplaty: 'Payment date', TerminPlatnosci: 'Payment term', Termin: 'Due date',
  FormaPlatnosci: 'Payment method', RachunekBankowy: 'Bank account', NrRB: 'Bank account number', SWIFT: 'SWIFT / BIC code', NazwaBanku: 'Bank name', OpisRachunku: 'Account description',
  WarunkiTransakcji: 'Transaction terms', Umowy: 'Contract', NrUmowy: 'Contract number', DataUmowy: 'Contract date', Zamowienia: 'Order', NrZamowienia: 'Order number', DataZamowienia: 'Order date',
  Stopka: 'Footer', Informacje: 'Footer information', StopkaFaktury: 'Footer text', Rejestry: 'Registers', KRS: 'KRS number', REGON: 'REGON number', BDO: 'BDO number', Zalacznik: 'Attachment',
}).map(([k, v]) => [k, `${v} (${k})`]));
export const plLabel = name => PL_FIELD_LABEL[name];
