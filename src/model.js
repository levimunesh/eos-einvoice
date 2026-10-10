// Invoice data model, code lists and totals calculation (EN 16931 semantics).
import { D, add, sub, mul, div, round, str, sum, cmp, isZero } from './decimal.js';
import { cfg } from './countries.js';

export const SPEC = {
  en16931: 'urn:cen.eu:en16931:2017',
  xrechnung: 'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0',
};
export const PEPPOL_PROCESS = 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0';

export const TYPE_CODES = [
  ['380', 'Invoice', 'Rechnung'],
  ['381', 'Credit note', 'Gutschrift'],
  ['384', 'Corrected invoice', 'Rechnungskorrektur'],
  ['326', 'Partial invoice', 'Teilrechnung'],
  ['389', 'Self-billed invoice', 'Gutschrift (Selbstfakturierung)'],
  ['386', 'Prepayment invoice', 'Vorauszahlungsrechnung'],
  ['875', 'Partial construction invoice', 'Abschlagsrechnung (Bauleistung)'],
  ['876', 'Partial final construction invoice', 'Teilschlussrechnung (Bauleistung)'],
  ['877', 'Final construction invoice', 'Schlussrechnung (Bauleistung)'],
];
export const TYPE_NAME = Object.fromEntries(TYPE_CODES.map(([c, en, de]) => [c, { en, de }]));

// UN/ECE Recommendation 20 / 21 unit codes most used by small businesses
export const UNITS = [
  ['C62', 'piece', 'Stück', 'Stk.'], ['H87', 'piece', 'Stück', 'Stk.'], ['HUR', 'hour', 'Stunde', 'Std.'], ['DAY', 'day', 'Tag', 'Tag'],
  ['MIN', 'minute', 'Minute', 'Min.'], ['WEE', 'week', 'Woche', 'Wo.'], ['MON', 'month', 'Monat', 'Mon.'], ['ANN', 'year', 'Jahr', 'Jahr'],
  ['LS', 'lump sum', 'pauschal', 'psch.'], ['KGM', 'kilogram', 'Kilogramm', 'kg'], ['GRM', 'gram', 'Gramm', 'g'], ['TNE', 'tonne', 'Tonne', 't'],
  ['MTR', 'metre', 'Meter', 'm'], ['CMT', 'centimetre', 'Zentimeter', 'cm'], ['KMT', 'kilometre', 'Kilometer', 'km'], ['MTK', 'square metre', 'Quadratmeter', 'm²'],
  ['MTQ', 'cubic metre', 'Kubikmeter', 'm³'], ['LTR', 'litre', 'Liter', 'l'], ['KWH', 'kilowatt hour', 'Kilowattstunde', 'kWh'], ['SET', 'set', 'Set', 'Set'],
  ['XPK', 'package', 'Paket', 'Pkt.'], ['XBX', 'box', 'Kiste', 'Kiste'], ['XPX', 'pallet', 'Palette', 'Pal.'], ['P1', 'percent', 'Prozent', '%'],
];
export const UNIT_LABEL = Object.fromEntries(UNITS.map(([c, en, de, short]) => [c, { en, de, short }]));
Object.assign(UNIT_LABEL, { XPP: { en: 'piece', de: 'Stück', short: 'Stk.' }, EA: { en: 'each', de: 'Stück', short: 'Stk.' }, NAR: { en: 'item', de: 'Artikel', short: 'Art.' }, PCE: { en: 'piece', de: 'Stück', short: 'Stk.' }, HAR: { en: 'hectare', de: 'Hektar', short: 'ha' }, KTM: { en: 'kilometre', de: 'Kilometer', short: 'km' }, MTR: { en: 'metre', de: 'Meter', short: 'm' } });

export const VAT_CATEGORIES = [
  ['S', 'Standard or reduced rate', 'Regel- oder ermäßigter Steuersatz'],
  ['Z', 'Zero rated', 'Nullsteuersatz (0 %)'],
  ['E', 'Exempt from VAT', 'Steuerbefreit'],
  ['AE', 'Reverse charge', 'Steuerschuldnerschaft des Leistungsempfängers'],
  ['K', 'Intra-EU supply', 'Innergemeinschaftliche Lieferung'],
  ['G', 'Export outside the EU', 'Ausfuhrlieferung'],
  ['O', 'Outside the scope of VAT', 'Nicht steuerbar'],
];
export const VAT_CAT_LABEL = Object.fromEntries(VAT_CATEGORIES.map(([c, en, de]) => [c, { en, de }]));
// default exemption wording (BT-120) and code (BT-121) per category
export const EXEMPTION_DEFAULT = {
  AE: { code: 'VATEX-EU-AE', de: 'Steuerschuldnerschaft des Leistungsempfängers (Reverse Charge)', en: 'Reverse charge' },
  K: { code: 'VATEX-EU-IC', de: 'Steuerfreie innergemeinschaftliche Lieferung', en: 'Intra-Community supply' },
  G: { code: 'VATEX-EU-G', de: 'Steuerfreie Ausfuhrlieferung', en: 'Export outside the EU' },
  O: { code: 'VATEX-EU-O', de: 'Nicht steuerbarer Umsatz', en: 'Not subject to VAT' },
  E: { code: '', de: 'Steuerbefreit', en: 'Exempt from VAT' },
};
export const KLEINUNTERNEHMER_REASON = 'Kein Ausweis von Umsatzsteuer, da Kleinunternehmer gemäß § 19 UStG';

export const PAYMENT_MEANS = [
  ['58', 'SEPA credit transfer', 'SEPA-Überweisung'],
  ['30', 'Bank transfer', 'Überweisung'],
  ['59', 'SEPA direct debit', 'SEPA-Lastschrift'],
  ['48', 'Card payment', 'Kartenzahlung'],
  ['10', 'Cash', 'Barzahlung'],
  ['1', 'Not defined', 'Nicht festgelegt'],
];
export const PAYMENT_LABEL = Object.fromEntries(PAYMENT_MEANS.map(([c, en, de]) => [c, { en, de }]));

export const COUNTRIES = [
  ['DE', 'Germany'], ['AT', 'Austria'], ['CH', 'Switzerland'], ['FR', 'France'], ['NL', 'Netherlands'], ['BE', 'Belgium'], ['LU', 'Luxembourg'],
  ['PL', 'Poland'], ['CZ', 'Czechia'], ['DK', 'Denmark'], ['IT', 'Italy'], ['ES', 'Spain'], ['PT', 'Portugal'], ['IE', 'Ireland'], ['SE', 'Sweden'],
  ['FI', 'Finland'], ['NO', 'Norway'], ['HU', 'Hungary'], ['SK', 'Slovakia'], ['SI', 'Slovenia'], ['HR', 'Croatia'], ['RO', 'Romania'], ['BG', 'Bulgaria'],
  ['GR', 'Greece'], ['EE', 'Estonia'], ['LV', 'Latvia'], ['LT', 'Lithuania'], ['CY', 'Cyprus'], ['MT', 'Malta'], ['GB', 'United Kingdom'], ['US', 'United States'],
  ['TR', 'Türkiye'], ['AE', 'United Arab Emirates'], ['OM', 'Oman'], ['CN', 'China'], ['IN', 'India'], ['JP', 'Japan'], ['CA', 'Canada'], ['AU', 'Australia'],
];
export const COUNTRY_NAME = Object.fromEntries(COUNTRIES);

export function emptyInvoice() {
  return {
    country: 'DE', profile: 'en16931', typeCode: '380', number: '', issueDate: '', dueDate: '', currency: 'EUR',
    buyerReference: '', orderReference: '', contractReference: '', precedingNumber: '', precedingDate: '',
    deliveryDate: '', periodStart: '', periodEnd: '', note: '', paymentTerms: '',
    smallBusiness: false, exemptionReason: '',
    fr: { cadre: 'S1', pmt: '', pmd: '', aab: '' },
    pl: { exemptionBasis: '', splitPayment: false, precedingKsef: '' },
    seller: { name: '', id: '', nationalId: '', siteId: '', street: '', postcode: '', city: '', state: '', country: 'DE', vatId: '', taxNumber: '', legalRegistration: '', legalInfo: '', email: '', contactName: '', contactPhone: '', contactEmail: '' },
    buyer: { name: '', nationalId: '', siteId: '', street: '', postcode: '', city: '', state: '', country: 'DE', vatId: '', email: '', id: '' },
    payment: { meansCode: '58', iban: '', bic: '', accountName: '', remittance: '', mandateId: '', creditorId: '', debtorIban: '', bsb: '', account: '' },
    lines: [emptyLine(1)],
    allowances: [],
    prepaid: '',
  };
}
export const emptyLine = n => ({ id: String(n), name: '', description: '', itemId: '', quantity: '1', unit: 'C62', unitPrice: '', vatCategory: 'S', vatRate: '19' });

const ZERO_RATE_CATS = new Set(['Z', 'E', 'AE', 'K', 'G', 'O']);
export const rateFor = (cat, rate) => (ZERO_RATE_CATS.has(cat) ? '0' : (rate === '' || rate == null ? '0' : rate));

// Calculate line amounts, the VAT breakdown and document totals exactly as EN 16931 defines them.
export function computeTotals(inv) {
  const lines = inv.lines.map(l => {
    const q = D(l.quantity), p = D(l.unitPrice);
    const net = q && p ? round(mul(q, p), 2) : null;
    const cat = inv.smallBusiness ? 'E' : l.vatCategory;
    return { ...l, vatCategory: cat, vatRate: rateFor(cat, l.vatRate), net };
  });
  const ac = (inv.allowances || []).map(a => {
    const cat = inv.smallBusiness ? 'E' : a.vatCategory;
    return { ...a, vatCategory: cat, vatRate: rateFor(cat, a.vatRate), amt: D(a.amount) ? round(D(a.amount), 2) : null };
  });
  const groups = new Map();
  const g = (cat, rate) => {
    const key = cat + '|' + str(D(rate) ?? D('0'));
    if (!groups.has(key)) groups.set(key, { category: cat, rate: str(D(rate) ?? D('0')), basis: D('0') });
    return groups.get(key);
  };
  for (const l of lines) if (l.net) { const x = g(l.vatCategory, l.vatRate); x.basis = add(x.basis, l.net); }
  for (const a of ac) if (a.amt) { const x = g(a.vatCategory, a.vatRate); x.basis = a.charge ? add(x.basis, a.amt) : sub(x.basis, a.amt); }
  // Canada: one line can carry two taxes (GST plus a provincial tax); each is calculated and shown on its own
  const parts = inv.country === 'CA' ? cfg('CA').taxParts : null;
  const breakdown = [...groups.values()].map(x => {
    const split = parts && x.category === 'S' && parts[x.rate];
    if (!split) return { ...x, tax: round(div(mul(x.basis, x.rate), '100', 6), 2) };
    const ps = split.map(([scheme, rate]) => ({ scheme, rate, tax: round(div(mul(x.basis, rate), '100', 6), 2) }));
    return { ...x, parts: ps, tax: sum(ps.map(p => p.tax)) };
  })
    .sort((a, b) => (a.category === b.category ? cmp(b.rate, a.rate) : a.category.localeCompare(b.category)));
  const lineTotal = sum(lines.filter(l => l.net).map(l => l.net));
  const allowanceTotal = sum(ac.filter(a => a.amt && !a.charge).map(a => a.amt));
  const chargeTotal = sum(ac.filter(a => a.amt && a.charge).map(a => a.amt));
  const taxBasis = add(sub(lineTotal, allowanceTotal), chargeTotal);
  const taxTotal = sum(breakdown.map(b => b.tax));
  const grandTotal = add(taxBasis, taxTotal);
  // France: the billing frameworks B2, S2 and M2 mean “already paid”, so the paid amount equals the total
  const paidInFull = inv.country === 'FR' && /2$/.test((inv.fr && inv.fr.cadre) || '');
  const prepaid = paidInFull ? grandTotal : D(inv.prepaid) && !isZero(D(inv.prepaid)) ? round(D(inv.prepaid), 2) : null;
  const due = prepaid ? sub(grandTotal, prepaid) : grandTotal;
  return { lines, allowances: ac, breakdown, lineTotal, allowanceTotal, chargeTotal, taxBasis, taxTotal, grandTotal, prepaid, due };
}

export const fmt2 = d => str(d, 2);

// Money for people: 1.234,56 (de), 1 234,56 (fr) or 1,234.56 (en)
export function money(d, lang = 'de') {
  const s = str(D(d) ?? D('0'), 2); const neg = s.startsWith('-'); const [i, f] = (neg ? s.slice(1) : s).split('.');
  const grouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'de' ? '.' : lang === 'fr' ? ' ' : ',');
  return (neg ? '-' : '') + grouped + (lang === 'de' || lang === 'fr' ? ',' : '.') + f;
}
export function num(d, lang = 'de') { const s = str(D(d) ?? D('0')); return lang === 'de' || lang === 'fr' ? s.replace('.', ',') : s; }
export function dateHuman(iso, lang = 'de') {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return iso || '';
  if (lang === 'fr') return `${m[3]}/${m[2]}/${m[1]}`;
  return lang === 'de' ? `${m[3]}.${m[2]}.${m[1]}` : `${Number(m[3])} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m[2]) - 1] || m[2]} ${m[1]}`;
}
