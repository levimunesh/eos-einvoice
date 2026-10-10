// Render a parsed e-invoice as a readable document ("paper").
import { h } from './dom.js';
import { money, num, dateHuman, TYPE_NAME, UNIT_LABEL, COUNTRY_NAME, PAYMENT_LABEL, VAT_CAT_LABEL } from '../model.js';
import { D, isZero } from '../decimal.js';

const L = 'en';
const m = v => (v === '' || v === null || v === undefined || !D(v) ? '' : money(v, L));
const unit = u => (UNIT_LABEL[u] ? UNIT_LABEL[u].en : u || '');

function partyBlock(title, p, extra = []) {
  if (!p) return null;
  const a = p.address || {};
  const cityLine = ['CA', 'US', 'AU', 'NZ'].includes(a.country) ? [a.city, a.subdivision, a.postcode] : [a.postcode, a.city, a.subdivision];
  const lines = [a.street, a.line2, a.line3, cityLine.filter(Boolean).join(' '), a.country ? (COUNTRY_NAME[a.country] || a.country) : ''].filter(Boolean);
  return h('div', { class: 'p-party' },
    h('div', { class: 'p-label', text: title }),
    h('div', { class: 'p-name', text: p.name || '—' }),
    p.tradingName && p.tradingName !== p.name ? h('div', { class: 'p-sub', text: p.tradingName }) : null,
    lines.map(l => h('div', { text: l })),
    extra.filter(e => e[1]).map(([k, v]) => h('div', { class: 'p-kv' }, h('span', { text: k }), h('span', { text: v }))));
}

export function renderPaper(data, opts = {}) {
  const cur = data.currency || 'EUR';
  const typeName = (TYPE_NAME[data.typeCode] || { en: 'Invoice' }).en;
  const meta = [
    ['Number', data.number], ['Date', dateHuman(data.issueDate, L)], ['Due', dateHuman(data.dueDate, L)],
    [data.periodStart || data.periodEnd ? 'Service period' : 'Delivery date', data.periodStart || data.periodEnd ? [dateHuman(data.periodStart, L), dateHuman(data.periodEnd, L)].filter(Boolean).join(' to ') : dateHuman(data.deliveryDate, L)],
    ['Buyer reference', data.buyerReference], ['Order', data.orderReference], ['Contract', data.contractReference], ['Project', data.projectReference],
    ['Refers to', (data.precedingInvoices || []).map(p => p.number + (p.date ? ` (${dateHuman(p.date, L)})` : '')).join(', ')],
  ].filter(r => r[1]);
  const s = data.seller || {}, b = data.buyer || {};
  // what the main tax is called: GST in Australia, GST/HST in Canada, VAT elsewhere
  const taxWord = (data.breakdown || []).map(g => g.scheme).find(x => x && x !== 'VAT') ? (s.taxScheme === 'GST/HST' || (data.breakdown || []).some(g => ['HST', 'QST', 'PST'].includes(g.scheme)) ? 'GST/HST' : 'GST') : 'VAT';
  const regLabel = p => { const c = p.address && p.address.country; const v = String(p.legalRegistration || '').replace(/\s/g, ''); return c === 'FR' && /^\d{9}$/.test(v) ? 'SIREN' : c === 'AU' && /^\d{11}$/.test(v) ? 'ABN' : c === 'NZ' ? 'NZBN' : null; };
  const idLabel = s.taxScheme === 'GST/HST' ? 'GST/HST no.' : s.taxScheme === 'GST' ? 'ABN (GST registered)' : 'VAT ID';
  const sheet = h('article', { class: 'paper' + (opts.compact ? ' paper-compact' : '') });
  const stamp = opts.stamp ? h('div', { class: 'stamp stamp-' + opts.stamp.kind, 'aria-label': opts.stamp.text }, h('span', { text: opts.stamp.text }), opts.stamp.sub ? h('small', { text: opts.stamp.sub }) : null) : null;
  sheet.append(
    h('header', { class: 'p-head' },
      h('div', {}, h('div', { class: 'p-doctype', text: typeName }), h('div', { class: 'p-docno', text: data.number || '—' })),
      h('div', { class: 'p-headside' }, h('dl', { class: 'p-meta' }, meta.slice(1).map(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })])), stamp)),
    h('section', { class: 'p-parties' },
      partyBlock('From', s, [[idLabel, s.vatId], [s.taxNumberScheme === 'QST' ? 'QST no.' : 'Tax number', s.taxNumber], ['PST no.', s.pstNumber], [regLabel(s) || 'Register', s.taxScheme === 'GST' && s.legalRegistration === s.vatId ? '' : s.legalRegistration], ['Contact', [s.contact?.name, s.contact?.phone, s.contact?.email].filter(Boolean).join(' · ')], ['E-invoice address', s.email]]),
      partyBlock('To', b, [[b.taxScheme === 'GST/HST' ? 'GST/HST no.' : 'VAT ID', b.vatId], [regLabel(b) || 'Business no.', b.legalRegistration && b.legalRegistration !== b.vatId ? b.legalRegistration : ''], ['Customer no.', (b.ids || [])[0]], ['E-invoice address', b.email]]),
      data.deliverTo && (data.deliverTo.name || data.deliverTo.address) ? partyBlock('Deliver to', data.deliverTo) : null));

  // lines
  const table = h('div', { class: 'p-table', role: 'table' },
    h('div', { class: 'p-row p-row-head', role: 'row' }, ['No.', 'Item', 'Qty', 'Unit price', taxWord === 'VAT' ? 'VAT' : 'Tax', 'Amount'].map((t, i) => h('div', { class: 'c' + i, role: 'columnheader', text: t }))),
    (data.lines || []).map((l, i) => h('div', { class: 'p-row', role: 'row' },
      h('div', { class: 'c0', role: 'cell', text: String(i + 1) }),
      h('div', { class: 'c1', role: 'cell' }, h('div', { class: 'p-item', text: l.name || '—' }),
        [l.description, l.sellerItemId ? `Item no. ${l.sellerItemId}` : '', l.id && l.id !== String(i + 1) ? `Line ID ${l.id}` : '', l.note, (l.periodStart || l.periodEnd) ? `Period ${[dateHuman(l.periodStart, L), dateHuman(l.periodEnd, L)].filter(Boolean).join(' to ')}` : '',
          ...(l.attributes || []).map(a => `${a.name}: ${a.value}`), ...(l.allowances || []).map(a => `${a.charge ? 'Surcharge' : 'Discount'}${a.reason ? ' (' + a.reason + ')' : ''}: ${a.charge ? '' : '−'}${m(a.amount)}`)].filter(Boolean).map(t => h('div', { class: 'p-sub', text: t }))),
      h('div', { class: 'c2', role: 'cell', text: `${D(l.quantity) ? num(l.quantity, L) : l.quantity || ''} ${unit(l.unit)}`.trim() }),
      h('div', { class: 'c3', role: 'cell', text: D(l.unitPrice) ? (D(l.unitPrice).s > 2 ? num(l.unitPrice, L) : m(l.unitPrice)) : '' }),
      h('div', { class: 'c4', role: 'cell', text: (l.taxes || []).length > 1 ? l.taxes.map(t => `${num(t.rate || '0', L)}%`).join(' + ') : l.vatCategory === 'S' || (D(l.vatRate) && !isZero(l.vatRate)) ? `${num(l.vatRate || '0', L)}%` : (l.vatCategory || '') }),
      h('div', { class: 'c5', role: 'cell', text: m(l.netAmount) }))));
  sheet.append(table);

  // totals
  const t = data.totals || {};
  const rows = [['Sum of lines', m(t.lineTotal)]];
  for (const a of data.allowances || []) rows.push([`${a.charge ? 'Surcharge' : 'Discount'}${a.reason ? ': ' + a.reason : ''}`, (a.charge ? '' : '−') + m(a.amount)]);
  if ((data.allowances || []).length) rows.push([`Total without ${taxWord}`, m(t.taxBasis)]);
  for (const g of data.breakdown || []) {
    const label = g.category === 'S' || (D(g.rate) && !isZero(g.rate)) ? `${g.scheme && g.scheme !== 'VAT' ? g.scheme : 'VAT'} ${num(g.rate || '0', L)}% on ${m(g.basis)}` : `${(VAT_CAT_LABEL[g.category] || { en: g.category }).en.replace('VAT', taxWord)}: ${m(g.basis)}`;
    rows.push([label, m(g.tax)]);
  }
  const strong = [['Total', `${m(t.grandTotal)} ${cur}`]];
  if (t.prepaid && D(t.prepaid) && !isZero(t.prepaid)) strong.push(['Already paid', '−' + m(t.prepaid)]);
  if (t.rounding && D(t.rounding) && !isZero(t.rounding)) strong.push(['Rounding', m(t.rounding)]);
  if (strong.length > 1) strong.push(['Amount due', `${m(t.due)} ${cur}`]);
  sheet.append(h('section', { class: 'p-totals' },
    h('dl', {}, rows.filter(r => r[1] !== '').map(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })])),
    h('dl', { class: 'p-grand' }, strong.map(([k, v], i) => [h('dt', { class: i === 0 || i === strong.length - 1 ? 'strong' : '', text: k }), h('dd', { class: i === 0 || i === strong.length - 1 ? 'strong' : '', text: v })]))));

  // notes: VAT exemptions, payment, free text
  const notes = [];
  for (const g of data.breakdown || []) if (g.exemptionReason) notes.push(g.exemptionReason);
  const pay = data.payment || {};
  const payRows = [];
  if (pay.meansCode) payRows.push(['Method', (PAYMENT_LABEL[pay.meansCode] || { en: pay.meansText || `Code ${pay.meansCode}` }).en]);
  for (const a of pay.accounts || []) { const isIban = /^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(a.iban.replace(/\s/g, '')); payRows.push(isIban ? ['IBAN', a.iban.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim(), a.iban] : ['Account number', a.iban, a.iban]); if (a.bic) payRows.push([isIban || /^[A-Z]{6}/.test(a.bic) ? 'BIC' : 'Branch (BSB / transit)', a.bic]); if (a.accountName) payRows.push(['Account holder', a.accountName]); }
  if (pay.remittance) payRows.push(['Payment reference', pay.remittance, pay.remittance]);
  if (pay.mandateId) payRows.push(['Mandate', pay.mandateId]);
  if (pay.creditorId) payRows.push(['Creditor ID', pay.creditorId]);
  if (pay.debtorIban) payRows.push(['Debited IBAN', pay.debtorIban]);
  if (data.dueDate) payRows.push(['Due', dateHuman(data.dueDate, L)]);
  const foot = h('section', { class: 'p-foot' });
  if (payRows.length || pay.terms) foot.append(h('div', { class: 'p-pay' }, h('div', { class: 'p-label', text: 'Payment' }),
    h('dl', {}, payRows.map(([k, v, copy]) => [h('dt', { text: k }), h('dd', {}, h('span', { class: copy ? 'mono' : '', text: v }), copy && opts.onCopy ? h('button', { type: 'button', class: 'link', onclick: () => opts.onCopy(copy), text: 'Copy' }) : null)])),
    pay.terms ? h('p', { class: 'p-terms', text: pay.terms }) : null));
  const all = [...notes, ...(data.notes || []), ...(data.codedNotes || []).map(n => n.text).filter(Boolean)];
  if (all.length) foot.append(h('div', { class: 'p-notes' }, h('div', { class: 'p-label', text: 'Notes' }), all.map(n => h('p', { text: n }))));
  if ((data.attachments || []).length) foot.append(h('div', { class: 'p-notes' }, h('div', { class: 'p-label', text: 'Attachments' }), data.attachments.map(a => h('p', { text: [a.filename || a.id, a.description, a.mime, a.uri].filter(Boolean).join(' · ') }))));
  if (s.legalInfo) foot.append(h('div', { class: 'p-notes' }, h('div', { class: 'p-label', text: 'Seller details' }), h('p', { text: s.legalInfo })));
  if (foot.childNodes.length) sheet.append(foot);
  return sheet;
}
