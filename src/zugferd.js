// Build a ZUGFeRD / Factur-X PDF: a readable invoice (PDF/A-3 structure) with the EN 16931 XML embedded.
import { PDFDocument, PDFName, PDFString, PDFHexString, AFRelationship, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { FONT_REGULAR, FONT_SEMIBOLD, SRGB_ICC, b64ToBytes } from './assets.gen.js';
import { computeTotals, money, num, dateHuman, TYPE_NAME, UNIT_LABEL, COUNTRY_NAME, PAYMENT_LABEL } from './model.js';
import { exemptionFor } from './cii.js';
import { localModel, ublExemption } from './ubl.js';
import { cfg } from './countries.js';
import { D, isZero, str } from './decimal.js';

export const PRODUCER = 'eos e-invoice';
const MM = 2.834645669;
const A4 = [595.28, 841.89];
const INK = rgb(0.10, 0.11, 0.13), MUTED = rgb(0.36, 0.39, 0.43), RULE = rgb(0.78, 0.80, 0.83), BAND = rgb(0.955, 0.96, 0.968);

const L = {
  de: { pos: 'Pos.', desc: 'Bezeichnung', qty: 'Menge', unit: 'Einheit', price: 'Einzelpreis', vat: 'USt', amount: 'Betrag', number: 'Rechnungsnummer', date: 'Rechnungsdatum', due: 'Fällig am', delivery: 'Leistungsdatum', period: 'Leistungszeitraum', customer: 'Kundennummer', buyerRef: 'Ihre Referenz', order: 'Bestellnummer', contract: 'Vertragsnummer', yourVat: 'Ihre USt-IdNr.', ref: 'Bezug auf Rechnung', net: 'Summe netto', allowance: 'Abzug', charge: 'Zuschlag', basis: 'Nettobetrag', vatOn: (r, b) => `zzgl. ${r} % USt auf ${b}`, total: 'Gesamtbetrag', prepaid: 'Bereits gezahlt', payable: 'Zahlbetrag', bank: 'Bankverbindung', holder: 'Kontoinhaber', purpose: 'Verwendungszweck', debit: 'Der Betrag wird per SEPA-Lastschrift eingezogen.', mandate: 'Mandatsreferenz', creditor: 'Gläubiger-ID', page: (a, b) => `Seite ${a} von ${b}`, vatId: 'USt-IdNr.', taxNo: 'Steuernummer', tel: 'Tel.', hybrid: 'Diese PDF-Datei enthält die Rechnung zusätzlich als strukturierte E-Rechnung (ZUGFeRD / Factur-X, Profil EN 16931).', itemNo: 'Art.-Nr.', cur: 'Alle Beträge in' },
  en: { pos: 'No.', desc: 'Description', qty: 'Qty', unit: 'Unit', price: 'Unit price', vat: 'VAT', amount: 'Amount', number: 'Invoice number', date: 'Invoice date', due: 'Due date', delivery: 'Delivery date', period: 'Service period', customer: 'Customer number', buyerRef: 'Your reference', order: 'Order number', contract: 'Contract number', yourVat: 'Your VAT ID', ref: 'Refers to invoice', net: 'Net total', allowance: 'Discount', charge: 'Surcharge', basis: 'Net amount', vatOn: (r, b) => `plus ${r}% VAT on ${b}`, total: 'Total', prepaid: 'Already paid', payable: 'Amount due', bank: 'Bank details', holder: 'Account holder', purpose: 'Payment reference', debit: 'The amount will be collected by SEPA direct debit.', mandate: 'Mandate reference', creditor: 'Creditor ID', page: (a, b) => `Page ${a} of ${b}`, vatId: 'VAT ID', taxNo: 'Tax number', tel: 'Tel.', hybrid: 'This PDF also contains the invoice as a structured e-invoice (ZUGFeRD / Factur-X, EN 16931 profile).', itemNo: 'Item no.', cur: 'All amounts in' },
  fr: { pos: 'N°', desc: 'Désignation', qty: 'Qté', unit: 'Unité', price: 'Prix unitaire HT', vat: 'TVA', amount: 'Montant HT', number: 'Numéro de facture', date: 'Date de facture', due: 'Échéance', delivery: 'Date de livraison', period: 'Période', customer: 'N° client', buyerRef: 'Votre référence', order: 'N° de commande', contract: 'N° de contrat', yourVat: 'Votre n° de TVA', ref: 'Facture d’origine', net: 'Total HT des lignes', allowance: 'Remise', charge: 'Frais', basis: 'Total HT', vatOn: (r, b) => `TVA ${r} % sur ${b}`, total: 'Total TTC', prepaid: 'Déjà payé', payable: 'Net à payer', bank: 'Coordonnées bancaires', holder: 'Titulaire', purpose: 'Référence de paiement', debit: 'Le montant sera prélevé par prélèvement SEPA.', mandate: 'Référence du mandat', creditor: 'Identifiant créancier', page: (a, b) => `Page ${a} sur ${b}`, vatId: 'N° TVA', taxNo: 'N° fiscal', tel: 'Tél.', hybrid: 'Ce PDF contient aussi la facture sous forme de facture électronique structurée (Factur-X, profil EN 16931).', itemNo: 'Réf.', cur: 'Montants en', buyerSiren: 'SIREN client', nature: 'Nature de l’opération', from: 'de' },
};

// French wording for code lists (the model keeps German and English only)
const FR = {
  type: { 380: 'Facture', 381: 'Avoir', 384: 'Facture rectificative', 326: 'Facture partielle', 389: 'Autofacture', 386: 'Facture d’acompte', 875: 'Facture de situation', 876: 'Facture de situation finale', 877: 'Facture finale' },
  unit: { C62: 'u', H87: 'u', HUR: 'h', DAY: 'j', MIN: 'min', WEE: 'sem.', MON: 'mois', ANN: 'an', LS: 'forfait', KGM: 'kg', GRM: 'g', TNE: 't', MTR: 'm', CMT: 'cm', KMT: 'km', MTK: 'm²', MTQ: 'm³', LTR: 'l', KWH: 'kWh', SET: 'lot', XPK: 'colis', XBX: 'caisse', XPX: 'palette', P1: '%' },
  pay: { 58: 'Paiement par virement SEPA', 30: 'Paiement par virement', 59: 'Prélèvement SEPA', 48: 'Paiement par carte bancaire', 10: 'Paiement en espèces' },
  nature: { B: 'Livraison de biens', S: 'Prestation de services', M: 'Biens et services' },
};
// Canada: tax names in both languages, and the registration numbers that go in the footer
const CA = {
  tax: { en: { GST: 'GST', HST: 'HST', QST: 'QST', PST: 'PST' }, fr: { GST: 'TPS', HST: 'TVH', QST: 'TVQ', PST: 'TVP' } },
  reg: { en: ['GST/HST no.', 'QST no.', 'PST no.'], fr: ['N° TPS/TVH', 'N° TVQ', 'N° TVP'] },
  hybrid: { en: 'This PDF also contains the invoice as a UBL 2.1 data file.', fr: 'Ce PDF contient aussi la facture sous forme de fichier de données UBL 2.1.' },
  bank: { en: ['Transit / institution', 'Account'], fr: ['Transit / institution', 'Compte'] },
};
const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pad = n => String(n).padStart(2, '0');
const isoUtc = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+00:00`;

function xmp({ title, author, subject, date, level, facturx = true }) {
  const urn = 'urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#';
  const prop = (name, desc) => `<rdf:li rdf:parseType="Resource"><pdfaProperty:name>${name}</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>${desc}</pdfaProperty:description></rdf:li>`;
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"><pdfaid:part>3</pdfaid:part><pdfaid:conformance>B</pdfaid:conformance></rdf:Description>
  <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:format>application/pdf</dc:format><dc:title><rdf:Alt><rdf:li xml:lang="x-default">${xmlEsc(title)}</rdf:li></rdf:Alt></dc:title><dc:creator><rdf:Seq><rdf:li>${xmlEsc(author)}</rdf:li></rdf:Seq></dc:creator><dc:description><rdf:Alt><rdf:li xml:lang="x-default">${xmlEsc(subject)}</rdf:li></rdf:Alt></dc:description></rdf:Description>
  <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/"><pdf:Producer>${PRODUCER}</pdf:Producer></rdf:Description>
  <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/"><xmp:CreatorTool>${PRODUCER}</xmp:CreatorTool><xmp:CreateDate>${date}</xmp:CreateDate><xmp:ModifyDate>${date}</xmp:ModifyDate><xmp:MetadataDate>${date}</xmp:MetadataDate></rdf:Description>
${facturx ? `  <rdf:Description rdf:about="" xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/" xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#" xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
   <pdfaExtension:schemas><rdf:Bag><rdf:li rdf:parseType="Resource"><pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema><pdfaSchema:namespaceURI>${urn}</pdfaSchema:namespaceURI><pdfaSchema:prefix>fx</pdfaSchema:prefix><pdfaSchema:property><rdf:Seq>${prop('DocumentFileName', 'The name of the embedded XML document')}${prop('DocumentType', 'The type of the hybrid document in capital letters, e.g. INVOICE or ORDER')}${prop('Version', 'The actual version of the standard applying to the embedded XML document')}${prop('ConformanceLevel', 'The conformance level of the embedded XML document')}</rdf:Seq></pdfaSchema:property></rdf:li></rdf:Bag></pdfaExtension:schemas>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:fx="${urn}"><fx:DocumentType>INVOICE</fx:DocumentType><fx:DocumentFileName>factur-x.xml</fx:DocumentFileName><fx:Version>1.0</fx:Version><fx:ConformanceLevel>${level}</fx:ConformanceLevel></rdf:Description>` : ''}
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

const REPLACE = { '→': '->', '←': '<-', '≤': '<=', '≥': '>=', '≠': '!=', '­': '', '​': '', ' ': ' ', ' ': ' ', ' ': ' ', '\t': ' ' };

export async function buildZugferdPdf(inv, xml, opts = {}) {
  const lang = ['de', 'en', 'fr'].includes(opts.lang) ? opts.lang : 'de';
  const fr = inv.country === 'FR'; const frNotes = fr ? cfg('FR').notes : null;
  const ca = inv.country === 'CA'; const local = ca || inv.country === 'AU';
  const t = ca ? { ...L[lang], vat: lang === 'fr' ? 'Taxes' : 'Tax', yourVat: CA.reg[lang][0], vatId: CA.reg[lang][0], taxNo: CA.reg[lang][1], hybrid: CA.hybrid[lang], price: lang === 'fr' ? 'Prix unitaire' : 'Unit price', amount: lang === 'fr' ? 'Montant' : 'Amount', net: lang === 'fr' ? 'Sous-total' : 'Subtotal', basis: lang === 'fr' ? 'Total avant taxes' : 'Total before tax', total: 'Total' } : L[lang];
  const now = opts.now ? new Date(opts.now) : new Date(); now.setUTCMilliseconds(0);
  const T = computeTotals(local ? localModel(inv) : inv);
  const reasonFor = cat => (local ? ublExemption(inv, cat) : (exemptionFor(inv, cat) || {}).reason);
  const cur = inv.currency || cfg(inv.country).currency;
  const typeName = lang === 'fr' ? (FR.type[inv.typeCode] || FR.type[380]) : (TYPE_NAME[inv.typeCode] || TYPE_NAME['380'])[lang];
  const title = `${typeName} ${inv.number || ''}`.trim();
  const m = v => money(v, lang);

  // Canada writes city, province, postal code; the European countries postcode then city
  const cityLine = p => (ca ? [p.city, p.state, p.postcode] : [p.postcode, p.city]).filter(Boolean).join(' ');
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fReg = await pdf.embedFont(b64ToBytes(FONT_REGULAR), { subset: false });
  const fBold = await pdf.embedFont(b64ToBytes(FONT_SEMIBOLD), { subset: false });
  const charset = new Set(fReg.getCharacterSet());
  // keep to glyphs the embedded font really has (PDF/A forbids missing glyphs)
  const clean = s => { let o = ''; for (const ch of String(s ?? '').normalize('NFC')) { if (ch in REPLACE) { o += REPLACE[ch]; continue; } const cp = ch.codePointAt(0); o += charset.has(cp) ? ch : (cp < 32 ? ' ' : '?'); } return o; };
  const width = (s, size, f = fReg) => f.widthOfTextAtSize(s, size);
  function wrap(text, size, maxW, f = fReg) {
    const out = [];
    for (const para of clean(text).split(/\r?\n/)) {
      let line = '';
      for (let word of para.split(/ +/)) {
        while (width(word, size, f) > maxW && word.length > 1) { // break a very long word
          let i = word.length - 1; while (i > 1 && width((line ? line + ' ' : '') + word.slice(0, i), size, f) > maxW) i--;
          out.push((line ? line + ' ' : '') + word.slice(0, i)); line = ''; word = word.slice(i);
        }
        const test = line ? line + ' ' + word : word;
        if (width(test, size, f) <= maxW) line = test; else { if (line) out.push(line); line = word; }
      }
      out.push(line);
    }
    return out;
  }

  const left = 25 * MM, right = A4[0] - 20 * MM, contentW = right - left, bottom = 34 * MM;
  let page, y;
  const pages = [];
  // pdf-lib registers a new font resource every time a font is passed to drawText, so switch fonts explicitly
  const current = new Map();
  const use = f => { if (current.get(page) !== f) { page.setFont(f); current.set(page, f); } };
  const text = (s, x, yy, size = 9.5, f = fReg, color = INK) => { const c = clean(s); if (!c) return; use(f); page.drawText(c, { x, y: yy, size, color }); };
  const textR = (s, xr, yy, size = 9.5, f = fReg, color = INK) => { const c = clean(s); if (!c) return; use(f); page.drawText(c, { x: xr - width(c, size, f), y: yy, size, color }); };
  const rule = (x1, x2, yy, thickness = 0.5, color = RULE) => page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness, color });
  const newPage = () => { page = pdf.addPage(A4); pages.push(page); y = A4[1] - 20 * MM; };

  // ---------- first page head (DIN 5008 form B positions)
  newPage();
  const s = inv.seller, b = inv.buyer;
  text(s.name, left, A4[1] - 20 * MM, 13, fBold);
  const sellerLine = [s.street, cityLine(s)].filter(Boolean).join(' · ');
  text(sellerLine, left, A4[1] - 20 * MM - 13, 8, fReg, MUTED);
  // return address line + recipient block (address window)
  let ay = A4[1] - 48 * MM;
  text([s.name, s.street, cityLine(s)].filter(Boolean).join(' · '), left, ay, 6.5, fReg, MUTED);
  rule(left, left + 80 * MM, ay - 3, 0.4);
  ay -= 16;
  const country = c => (c && c !== (s.country || 'DE') ? (COUNTRY_NAME[c] || c).toUpperCase() : '');
  for (const ln of [b.name, b.street, cityLine(b), country(b.country)].filter(Boolean)) {
    for (const w of wrap(ln, 10.5, 80 * MM)) { text(w, left, ay, 10.5); ay -= 14; }
  }
  // info block on the right
  const ix = 125 * MM; let iy = A4[1] - 50 * MM;
  const info = (label, value) => { if (!value) return; text(label, ix, iy, 8, fReg, MUTED); textR(value, right, iy, 9.5); iy -= 13.5; };
  info(t.number, inv.number); info(t.date, dateHuman(inv.issueDate, lang));
  if (inv.periodStart || inv.periodEnd) info(t.period, [dateHuman(inv.periodStart, lang), dateHuman(inv.periodEnd, lang)].filter(Boolean).join(' – '));
  else info(t.delivery, dateHuman(inv.deliveryDate, lang));
  info(t.due, dateHuman(inv.dueDate, lang)); info(t.customer, b.id); info(t.buyerRef, inv.buyerReference); info(t.order, inv.orderReference); info(t.contract, inv.contractReference); info(t.yourVat, b.vatId);
  if (fr) { const k = ((inv.fr && inv.fr.cadre) || 'S1')[0]; info(lang === 'fr' ? t.buyerSiren : 'Customer SIREN', b.nationalId); info(lang === 'fr' ? t.nature : 'Type of sale', (lang === 'fr' ? FR.nature : { B: 'Goods', S: 'Services', M: 'Goods and services' })[k]); }
  if (inv.precedingNumber) info(t.ref, inv.precedingNumber + (inv.precedingDate ? ` (${dateHuman(inv.precedingDate, lang)})` : ''));

  y = Math.min(ay, iy) - 18; y = Math.min(y, A4[1] - 103 * MM);
  text(title, left, y, 17, fBold); y -= 24;

  // ---------- line table
  const shift = ca ? 22 : 0; // Canada needs room for two tax names in the tax column
  const col = { pos: left, desc: left + 26, qty: right - 205 - shift, unit: right - 197 - shift, price: right - 105 - shift, vat: right - 62, amt: right };
  const taxParts = ca ? cfg('CA').taxParts : null;
  const descW = col.qty - 44 - col.desc;
  const tableHead = () => {
    page.drawRectangle({ x: left, y: y - 6, width: contentW, height: 18, color: BAND });
    const hy = y - 0.5;
    text(t.pos, col.pos + 4, hy, 7.5, fBold, MUTED); text(t.desc, col.desc, hy, 7.5, fBold, MUTED); textR(t.qty, col.qty, hy, 7.5, fBold, MUTED); text(t.unit, col.unit, hy, 7.5, fBold, MUTED);
    textR(t.price, col.price, hy, 7.5, fBold, MUTED); textR(t.vat, col.vat, hy, 7.5, fBold, MUTED); textR(t.amount, col.amt - 4, hy, 7.5, fBold, MUTED);
    y -= 22;
  };
  const need = h => { if (y - h < bottom) { newPage(); y -= 6; return true; } return false; };
  tableHead();
  T.lines.forEach((l, i) => {
    const nameLines = wrap(l.name || '', 9.5, descW, fReg);
    const sub = [l.itemId ? `${t.itemNo} ${l.itemId}` : '', l.description].filter(Boolean).join(' · ');
    const subLines = sub ? wrap(sub, 8, descW) : [];
    const h = nameLines.length * 12.5 + subLines.length * 10.5 + 7;
    if (need(h)) tableHead();
    const top = y;
    text(String(l.id || i + 1), col.pos + 4, top, 9.5, fReg, MUTED);
    nameLines.forEach((ln, k) => text(ln, col.desc, top - k * 12.5, 9.5));
    subLines.forEach((ln, k) => text(ln, col.desc, top - nameLines.length * 12.5 - k * 10.5 + 1, 8, fReg, MUTED));
    textR(D(l.quantity) ? num(l.quantity, lang) : '', col.qty, top);
    text(lang === 'fr' ? (FR.unit[l.unit] || l.unit) : lang === 'en' ? ((UNIT_LABEL[l.unit] || {}).en || l.unit) : ((UNIT_LABEL[l.unit] || { short: l.unit }).short || l.unit), col.unit, top);
    textR(D(l.unitPrice) ? (D(l.unitPrice).s > 2 ? num(l.unitPrice, lang) : m(l.unitPrice)) : '', col.price, top);
    const split = taxParts && l.vatCategory === 'S' && taxParts[str(D(l.vatRate) ?? D('0'))];
    textR(split && split.length > 1 ? split.map(p => CA.tax[lang === 'fr' ? 'fr' : 'en'][p[0]] || p[0]).join(' + ') : l.vatCategory === 'S' ? num(l.vatRate, lang) + ' %' : (l.vatCategory === 'O' ? '–' : '0 %'), col.vat, top, split && split.length > 1 ? 8.5 : 9.5);
    textR(l.net ? m(l.net) : '', col.amt - 4, top);
    y -= h; rule(left, right, y + 11, 0.4);
  });

  // ---------- totals
  const rows = [];
  rows.push([t.net, m(T.lineTotal)]);
  for (const a of T.allowances) if (a.amt) rows.push([(a.reason || (a.charge ? t.charge : t.allowance)), (a.charge ? '' : '-') + m(a.amt)]);
  if (T.allowances.some(a => a.amt)) rows.push([t.basis, m(T.taxBasis)]);
  for (const g of T.breakdown) {
    if (g.parts) for (const p of g.parts) rows.push([`${CA.tax[lang === 'fr' ? 'fr' : 'en'][p.scheme] || p.scheme} ${num(p.rate, lang)} % ${lang === 'fr' ? 'sur' : 'on'} ${m(g.basis)}`, m(p.tax)]);
    else if (g.category === 'S' || !isZero(g.tax)) rows.push([t.vatOn(num(g.rate, lang), m(g.basis)), m(g.tax)]);
  }
  const totalRows = [[t.total, m(T.grandTotal) + ' ' + cur, true]];
  if (T.prepaid) { totalRows.push([t.prepaid, '-' + m(T.prepaid)]); totalRows.push([t.payable, m(T.due) + ' ' + cur, true]); }
  need(rows.length * 14 + totalRows.length * 18 + 24);
  y -= 6;
  const tx = right - 250;
  for (const [label, val] of rows) { text(label, tx, y, 9.5, fReg, MUTED); textR(val, right - 4, y); y -= 14; }
  y -= 2; rule(tx, right, y + 9, 0.8, INK);
  for (const [label, val, strong] of totalRows) { y -= 4; text(label, tx, y, strong ? 11 : 9.5, strong ? fBold : fReg, strong ? INK : MUTED); textR(val, right - 4, y, strong ? 11 : 9.5, strong ? fBold : fReg); y -= 14; }
  y -= 12;

  // ---------- legal notes, payment, free text
  const para = (str_, size = 9.5, f = fReg, color = INK, gap = 6) => { const ls = wrap(str_, size, contentW, f); need(ls.length * (size + 3.5) + gap); for (const ln of ls) { text(ln, left, y, size, f, color); y -= size + 3.5; } y -= gap; };
  const seen = new Set();
  for (const g of T.breakdown) { const why = g.category === 'S' ? '' : reasonFor(g.category); if (why && !seen.has(why)) { seen.add(why); para(why); } }
  if (inv.paymentTerms) para(inv.paymentTerms);
  const pay = inv.payment;
  if (pay.meansCode === '59') {
    para([t.debit, pay.mandateId ? `${t.mandate}: ${pay.mandateId}` : '', pay.creditorId ? `${t.creditor}: ${pay.creditorId}` : '', pay.debtorIban ? `IBAN: ${fmtIban(pay.debtorIban)}` : ''].filter(Boolean).join('  ·  '));
  } else if (pay.account && ['30', '58'].includes(pay.meansCode)) { // Canada: branch transit and account number
    need(48);
    text(t.bank, left, y, 7.5, fBold, MUTED); y -= 13;
    text([pay.bsb ? `${CA.bank[lang === 'fr' ? 'fr' : 'en'][0]}  ${pay.bsb}` : '', `${CA.bank[lang === 'fr' ? 'fr' : 'en'][1]}  ${pay.account}`].filter(Boolean).join('     '), left, y, 10, fBold); y -= 13;
    const extra = [pay.accountName ? `${t.holder}: ${pay.accountName}` : '', pay.remittance ? `${t.purpose}: ${pay.remittance}` : ''].filter(Boolean).join('  ·  ');
    if (extra) { for (const ln of wrap(extra, 9, contentW)) { text(ln, left, y, 9, fReg, MUTED); y -= 12; } }
    y -= 8;
  } else if (pay.iban) {
    need(48);
    text(t.bank, left, y, 7.5, fBold, MUTED); y -= 13;
    text(`IBAN  ${fmtIban(pay.iban)}` + (pay.bic ? `     BIC  ${pay.bic}` : ''), left, y, 10, fBold); y -= 13;
    const extra = [pay.accountName ? `${t.holder}: ${pay.accountName}` : '', pay.remittance ? `${t.purpose}: ${pay.remittance}` : ''].filter(Boolean).join('  ·  ');
    if (extra) { for (const ln of wrap(extra, 9, contentW)) { text(ln, left, y, 9, fReg, MUTED); y -= 12; } }
    y -= 8;
  } else if (PAYMENT_LABEL[pay.meansCode] && pay.meansCode !== '1') para(lang === 'fr' ? (FR.pay[pay.meansCode] || '') : PAYMENT_LABEL[pay.meansCode][lang]);
  if (inv.note) para(inv.note);
  // France: the three legal mentions every invoice carries (recovery fee, late-payment penalties, early-payment discount)
  if (fr) { const f = inv.fr || {}; for (const [k, v] of [['PMT', f.pmt], ['PMD', f.pmd], ['AAB', f.aab]]) para(v || frNotes[k], 8, fReg, MUTED, 2); }

  // ---------- footer on every page
  const footCols = [
    [s.name, s.street, cityLine(s), country(s.country) ? COUNTRY_NAME[s.country] : ''],
    [s.contactName, s.contactPhone ? `${t.tel} ${s.contactPhone}` : '', s.contactEmail || s.email],
    [s.vatId ? `${t.vatId} ${s.vatId}` : '', s.taxNumber ? `${t.taxNo} ${s.taxNumber}` : '', fr && s.siteId ? `SIRET ${s.siteId}` : fr && s.nationalId ? `SIREN ${s.nationalId}` : ca && s.siteId ? `${CA.reg[lang === 'fr' ? 'fr' : 'en'][2]} ${s.siteId}` : '', fr || ca ? '' : s.legalRegistration, ...(s.legalInfo ? wrap(s.legalInfo, 7, contentW / 3 - 8) : [])],
  ].map(c => c.filter(Boolean));
  pages.forEach((pg, idx) => {
    page = pg;
    const fy = 26 * MM; rule(left, right, fy + 10, 0.4);
    footCols.forEach((c, ci) => c.slice(0, 5).forEach((ln, k) => text(wrap(ln, 7, contentW / 3 - 8)[0], left + ci * (contentW / 3), fy - k * 9, 7, fReg, MUTED)));
    text(t.hybrid, left, 9.5 * MM, 6.5, fReg, MUTED);
    textR(t.page(idx + 1, pages.length), right, 9.5 * MM, 6.5, fReg, MUTED);
  });

  // ---------- document metadata (Info dictionary and XMP must agree)
  const subject = `${typeName} ${inv.number || ''} ${lang === 'de' ? 'von' : lang === 'fr' ? 'de' : 'from'} ${s.name || ''}`.trim();
  const author = clean(s.name || PRODUCER);
  pdf.setTitle(clean(title), { showInWindowTitleBar: true }); pdf.setAuthor(author); pdf.setSubject(clean(subject)); pdf.setCreator(PRODUCER); pdf.setProducer(PRODUCER);
  pdf.setCreationDate(now); pdf.setModificationDate(now); pdf.setLanguage(lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : 'en');
  const xmpBytes = new TextEncoder().encode(xmp({ title: clean(title), author, subject: clean(subject), date: isoUtc(now), level: 'EN 16931', facturx: !ca }));
  const meta = pdf.context.stream(xmpBytes, { Type: 'Metadata', Subtype: 'XML' });
  pdf.catalog.set(PDFName.of('Metadata'), pdf.context.register(meta));
  // output intent: sRGB, so every colour in the file is defined device-independently
  const icc = pdf.context.register(pdf.context.stream(b64ToBytes(SRGB_ICC), { N: 3 }));
  const intent = pdf.context.register(pdf.context.obj({ Type: 'OutputIntent', S: 'GTS_PDFA1', OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'), Info: PDFString.of('sRGB IEC61966-2.1'), DestOutputProfile: icc }));
  pdf.catalog.set(PDFName.of('OutputIntents'), pdf.context.obj([intent]));
  // the invoice data itself
  await pdf.attach(new TextEncoder().encode(xml), ca ? 'invoice-ubl.xml' : 'factur-x.xml', { mimeType: 'text/xml', description: ca ? 'Invoice data (UBL 2.1)' : 'Factur-X/ZUGFeRD invoice data (EN 16931)', creationDate: now, modificationDate: now, afRelationship: AFRelationship.Alternative });
  // file identifier
  const idHex = await sha256Hex(xml + isoUtc(now));
  pdf.context.trailerInfo.ID = pdf.context.obj([PDFHexString.of(idHex.slice(0, 32)), PDFHexString.of(idHex.slice(0, 32))]);
  return pdf.save({ useObjectStreams: false });
}

function fmtIban(v) { return String(v).replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim(); }

export async function sha256Hex(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}
