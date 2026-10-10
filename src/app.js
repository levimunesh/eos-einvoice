// eos e-invoice — application shell: Convert, Validate, Receive, Archive.
import { zipSync, strToU8 } from 'fflate';
import { h, clear, $, $$, toast, copyText, getPath, setPath, store, fmtBytes } from './ui/dom.js';
import { renderPaper } from './ui/paper.js';
import { emptyInvoice, emptyLine, computeTotals, money, TYPE_CODES, UNITS, COUNTRIES, PAYMENT_MEANS, dateHuman } from './model.js';
import { COUNTRY, COUNTRY_CODES, cfg } from './countries.js';
import { setRuleLoaders, validateDocument } from './validate.js';
import { fa3ToFormModel } from './fa3.js';
import { FIELD_LABEL } from './explain.js';
import { toFormModel } from './parse.js';
import { createArchive, createLocalArchive, metaFrom, sha256Hex } from './archive.js';
import { basicExtract, buildPrompt, normalizeAiResult, fileToText } from './extract.js';
import { D, str, cmp } from './decimal.js';
import { exampleInvoice, exampleSupplierInvoice, faultyExampleXml, generateXml } from './examples.js';

// ------------------------------------------------------------------ state
const S = {
  tab: 'convert', country: 'DE',
  inv: null, isExample: false, pdfLang: 'de', source: null, reading: null, step1Msg: null,
  xml: '', check: null, checking: false, busy: '',
  doc: null, docLoading: '', docError: null, pasteOpen: false,
  arch: { store: null, items: [], filter: 'all', q: '', open: null, openXml: null, openState: '', confirmDelete: false, error: null },
};
const caps = { downloads: null, sample: null, db: null, user: null, uid: null, done: false };
const use = name => { try { return window.claude && typeof window.claude.use === 'function' ? Promise.resolve(window.claude.use(name)).catch(() => null) : Promise.resolve(null); } catch { return Promise.resolve(null); } };
const capsReady = (async () => {
  const [dl, sm, db, us] = await Promise.all(['downloads', 'sample', 'db', 'user'].map(use));
  caps.downloads = dl; caps.sample = sm; caps.db = db; caps.user = us;
  try { caps.uid = us ? await us.id() : null; } catch { caps.uid = null; }
  caps.done = true;
})();
const rulesReady = import('./rules.js').then(m => { setRuleLoaders(m.default); });
const C = () => cfg(S.country);

const parseXml = xml => { const doc = new DOMParser().parseFromString(xml, 'application/xml'); const err = doc.getElementsByTagName('parsererror')[0]; if (err) { const t = err.textContent || ''; const m = /error on line (\d+) at column (\d+): ([^\n]*?)(?:Below is|\n|$)/.exec(t); throw new Error(m ? `Line ${m[1]}, column ${m[2]}: ${m[3].trim()}` : (t.split('\n')[0] || 'not well-formed').slice(0, 160)); } return doc; };
const safeName = s => (String(s || 'invoice').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'invoice');
const view = id => document.getElementById('view-' + id);

// ------------------------------------------------------------------ saving files
async function saveFile(filename, data) {
  await capsReady;
  if (caps.downloads) {
    try { await caps.downloads.save({ filename, data }); toast(`Saved ${filename}`); return true; }
    catch (e) {
      const code = e && e.code;
      if (code === 'declined') return false;
      if (code === 'rate_limited') { toast('A save is already waiting for your answer.', 'error'); return false; }
      if (code === 'too_large') { toast('This file is too large to save here.', 'error'); return false; }
    }
  }
  try { // direct download: works when the page is opened on its own
    const blob = data instanceof Blob ? data : new Blob([data]); const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: filename }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    if (window.claude) toast('If no download starts, use “Copy XML” instead.'); else toast(`Saved ${filename}`);
    return true;
  } catch { toast('Saving files is not available in this view. Use “Copy XML” instead.', 'error'); return false; }
}
// XML files are saved inside a ZIP when the host only accepts common file types
async function saveXml(baseName, xml) {
  await capsReady;
  if (caps.downloads) return saveFile(`${baseName}.zip`, zipSync({ [`${baseName}.xml`]: strToU8(xml) }));
  return saveFile(`${baseName}.xml`, new Blob([xml], { type: 'application/xml' }));
}
async function copyXml(xml) { if (!(await copyText(xml, 'XML copied'))) toast('Copying is blocked here. Select the XML text and copy it by hand.', 'error'); }

// ------------------------------------------------------------------ shared pieces
function seal(kind, text) { return h('div', { class: 'seal ' + kind, 'aria-hidden': 'true', text }); }
function verdictParts(res) {
  if (!res) return { kind: 'wait', seal: '…', title: 'Checking…', sub: '' };
  const c = res.counts;
  if (res.verdict === 'not-einvoice') return { kind: 'err', seal: 'No', title: 'Not accepted as an e-invoice', sub: res.verdictText || '' };
  if (res.verdict === 'invalid') return { kind: 'err', seal: 'Not valid', title: `${c.error} problem${c.error === 1 ? '' : 's'} to fix`, sub: c.warning ? `plus ${c.warning} warning${c.warning === 1 ? '' : 's'}` : res.spec && res.spec.key === 'ca-ubl' ? 'The invoice is missing information the Canada Revenue Agency requires.' : 'The file does not pass the official rules yet.' };
  if (res.verdict === 'warnings') return { kind: 'warn', seal: 'Valid', title: 'Valid, with warnings', sub: `${c.warning} point${c.warning === 1 ? '' : 's'} to look at. The invoice still passes.` };
  if (res.spec && res.spec.key === 'ca-ubl') return { kind: 'ok', seal: 'Valid', title: 'Complete invoice', sub: 'Carries everything the Canada Revenue Agency asks for, and the data file matches the UBL 2.1 schema.' };
  if (res.spec && res.spec.key === 'fa3') return { kind: 'ok', seal: 'Valid', title: 'Valid e-invoice', sub: 'Matches the official FA(3) schema that KSeF checks.' };
  return { kind: 'ok', seal: 'Valid', title: 'Valid e-invoice', sub: res.passText || `Passes every ${res.scenario.split(' (')[0]} rule.` };
}
function stampFor(res) {
  if (!res || !res.parsed.ok) return null;
  const std = res.spec.xrechnung ? 'XRechnung' : res.spec.key === 'fa3' ? 'KSeF FA(3)' : res.spec.key === 'pint-aunz' ? 'PINT A-NZ' : res.spec.key === 'ca-ubl' ? 'CRA details' : res.country === 'FR' ? 'EN 16931 + BR-FR' : 'EN 16931';
  if (res.verdict === 'valid') return { kind: 'ok', text: 'Valid', sub: std };
  if (res.verdict === 'warnings') return { kind: 'warn', text: 'Valid', sub: 'with warnings' };
  return { kind: 'err', text: 'Not valid', sub: res.verdict === 'not-einvoice' ? 'format not accepted' : std };
}

function renderFindings(res, opts = {}) {
  const box = h('div', { class: 'findings' });
  if (!res) return box;
  const items = []; const structural = [];
  for (const s of res.structure) structural.push({ severity: 'error', title: s.message, fix: res.syntax === 'FA' ? 'KSeF rejects a file that does not match the official FA(3) schema exactly.' : 'The file’s structure does not match the official schema. The program that created it needs to export it correctly.', id: 'Structure', text: '', locations: [s.location] });
  if (res.engineErrors.length) items.push({ severity: 'error', title: `${res.engineErrors.length} check${res.engineErrors.length === 1 ? '' : 's'} could not be run because a value in the file has the wrong format.`, fix: 'Fix the structure problems first, for example amounts written with a comma instead of a point.', id: 'Processing', text: res.engineErrors.slice(0, 3).map(e => `${e.id || 'rule context'}: ${e.message}`).join(' | '), locations: [] });
  const byKey = new Map();
  for (const f of res.findings) {
    const key = f.id + '|' + f.severity + '|' + f.title;
    if (!byKey.has(key)) { const it = { severity: f.severity, title: f.title, fix: f.fix, id: f.id, text: f.text, field: f.field, set: f.set, locations: [] }; byKey.set(key, it); items.push(it); }
    byKey.get(key).locations.push(f.location);
  }
  if (opts.structureLast) { if (!res.findings.some(f => f.severity === 'error')) items.push(...structural); } else items.unshift(...structural);
  const groups = [['error', 'Problems to fix'], ['warning', 'Warnings'], ['info', 'Notes']];
  for (const [sev, title] of groups) {
    const list = items.filter(i => i.severity === sev);
    if (!list.length || (sev === 'info' && opts.hideInfo)) continue;
    if (!opts.flat) box.append(h('div', { class: 'group-title', text: `${title} (${list.length})` }));
    for (const it of list.slice(0, opts.limit || 200)) {
      // the button names the field as the form of the current country labels it
      const lab = opts.onField && it.field ? ((document.querySelector(`label[for="f-${it.field.replace(/\./g, '-')}"]`)?.firstChild?.textContent) || (['lines', 'allowances'].includes(it.field) || document.getElementById('f-' + it.field.replace(/\./g, '-')) ? FIELD_LABEL[it.field] : '')) : '';
      const canJump = !!lab;
      box.append(h('div', { class: 'finding ' + sev },
        h('div', { class: 'finding-top' }, h('span', { class: 'finding-title', text: it.title }), it.locations.length > 1 ? h('span', { class: 'pill info', text: `${it.locations.length}×` }) : null, h('span', { class: 'pill ' + sev, text: sev === 'error' ? 'Error' : sev === 'warning' ? 'Warning' : 'Note' })),
        it.fix ? h('div', { class: 'finding-fix', text: it.fix }) : null,
        canJump ? h('div', {}, h('button', { type: 'button', class: 'link', style: 'margin-left:0', onclick: () => opts.onField(it.field), text: `Go to “${lab}”` })) : null,
        h('details', {}, h('summary', { text: `Rule ${it.id}` }),
          it.text ? h('div', { text: `Official wording: ${it.text}` }) : null,
          it.locations.filter(Boolean).slice(0, 5).map(l => h('div', { class: 'mono', text: l })),
          it.locations.length > 5 ? h('div', { text: `and ${it.locations.length - 5} more places` }) : null)));
    }
    if (list.length > (opts.limit || 200)) box.append(h('div', { class: 'muted small', text: `${list.length - (opts.limit || 200)} more…` }));
  }
  return box;
}

function dropZone({ id, title, hint, accept, onFile, extra }) {
  const input = h('input', { type: 'file', id: id + '-file', accept, hidden: true, onchange: e => { const f = e.target.files[0]; e.target.value = ''; if (f) onFile(f); } });
  const zone = h('div', { class: 'drop', id },
    h('div', { class: 'drop-text' }, h('b', { text: title }), h('span', { class: 'muted small', text: hint })),
    h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn primary', onclick: () => input.click(), text: 'Choose file' }), extra || null), input);
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('over'); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) onFile(f); });
  return zone;
}

// ------------------------------------------------------------------ tabs
function setTab(tab, push = true) {
  S.tab = tab;
  for (const t of ['convert', 'validate', 'receive', 'archive']) { document.getElementById('tab-' + t).setAttribute('aria-selected', String(t === tab)); view(t).hidden = t !== tab; }
  if (tab === 'validate' || tab === 'receive') {
    const want = tab === 'validate' ? 'faulty' : 'supplier';
    if ((!S.doc && !S.docLoading && !S.docError) || (S.doc && S.doc.auto && S.doc.auto !== want)) loadExampleDoc(want, true); else renderDocViews();
  }
  if (tab === 'archive') renderArchive();
  if (push) { try { history.replaceState(null, '', '#' + tab); } catch { /* ignore */ } }
}

// ================================================================== CONVERT
const DRAFT_KEY = 'eos.draft.v2', COUNTRY_KEY = 'eos.country.v1';
const sellerKey = (cc = S.country) => (cc === 'DE' ? 'eos.seller.v1' : 'eos.seller.v2.' + cc);
// Which fields the form shows depends on the country: identifiers, bank details and tax options differ.
function fieldsFor(cc) {
  const c = cfg(cc); const de = cc === 'DE', fr = cc === 'FR', pl = cc === 'PL', au = cc === 'AU', ca = cc === 'CA';
  const types = TYPE_CODES.filter(t => c.typeCodes.includes(t[0])).map(t => [t[0], (c.typeNames || {})[t[0]] || t[1]]);
  const means = PAYMENT_MEANS.filter(m => c.payMeans.includes(m[0])).sort((a, b) => c.payMeans.indexOf(a[0]) - c.payMeans.indexOf(b[0])).map(m => [m[0], (c.payNames || {})[m[0]] || m[1]]);
  const nat = c.natId;
  const doc = [
    ['typeCode', 'Document type', { type: 'select', options: types }], ['number', 'Invoice number', { req: 1, ph: c.numberPh }], ['issueDate', 'Invoice date', { type: 'date', req: 1 }],
    fr ? ['fr.cadre', 'What you are invoicing', { type: 'select', options: c.cadres }] : null,
    ['deliveryDate', 'Delivery or service date', { type: 'date' }], ['dueDate', 'Due date', { type: 'date' }], ['currency', 'Currency', { type: 'select', options: c.currencies.map(x => [x, x]) }],
    ['periodStart', 'Service period from', { type: 'date' }], ['periodEnd', 'Service period to', { type: 'date' }],
    pl ? null : ['buyerReference', de ? 'Buyer reference / Leitweg-ID' : 'Buyer reference', { req: de ? 'xr' : 0, ph: 'Given by the customer' }],
    ['orderReference', 'Customer’s order number'], ['contractReference', 'Contract number'], ['precedingNumber', 'Original invoice number', { when: 'correction' }], ['precedingDate', 'Original invoice date', { type: 'date', when: 'correction' }],
    pl ? ['pl.precedingKsef', 'KSeF number of the original invoice', { when: 'correction', w: 'w3', ph: 'If it was issued in KSeF' }] : null,
  ];
  const seller = [
    ['seller.name', 'Business name', { req: 1, w: 'w3' }], ['seller.street', 'Street and number', { req: 1, w: 'w3' }], ['seller.postcode', 'Postcode', { req: 1 }], ['seller.city', 'City', { req: 1 }],
    au ? ['seller.state', 'State', { ph: 'NSW' }] : ca ? ['seller.state', 'Province', { ph: 'ON' }] : null, ['seller.country', 'Country', { type: 'select', options: COUNTRIES, req: 1 }],
    nat ? ['seller.nationalId', nat.label, { req: 1, ph: nat.ph, cls: 'mono' }] : null,
    fr ? ['seller.siteId', 'SIRET', { ph: '14 digits', cls: 'mono' }] : null,
    de ? ['seller.vatId', 'VAT ID (USt-IdNr.)', { ph: 'DE123456789' }] : fr ? ['seller.vatId', 'VAT number (n° TVA)', { ph: 'FR12345678901' }] : ca ? ['seller.vatId', 'GST/HST number', { ph: '123456789 RT0001', cls: 'mono', w: 'w2' }] : null,
    ca ? ['seller.taxNumber', 'QST number (Quebec)', { ph: '1234567890 TQ0001', cls: 'mono', w: 'w2' }] : null, ca ? ['seller.siteId', 'PST number', { ph: 'If you charge PST', cls: 'mono', w: 'w2' }] : null,
    de ? ['seller.taxNumber', 'Tax number (Steuernummer)', { ph: '12/345/67890' }] : null,
    de ? ['seller.legalRegistration', 'Commercial register no.', { ph: 'HRB 12345' }] : pl ? ['seller.legalRegistration', 'KRS number', { ph: '10 digits, if registered' }] : null,
    de ? ['seller.id', 'Seller ID', { ph: 'Only if you have no VAT ID' }] : null,
    de ? ['seller.email', 'Email for e-invoices', { type: 'email', req: 'xr' }] : fr ? ['seller.email', 'Electronic invoicing address', { ph: 'Leave empty to use your SIREN' }] : null,
    pl ? null : ['seller.contactName', 'Contact person', { req: 'xr' }],
    ['seller.contactPhone', 'Contact phone', { type: 'tel', req: 'xr' }], ['seller.contactEmail', 'Contact email', { type: 'email', req: 'xr' }],
    de || fr ? ['seller.legalInfo', 'Legal details for the footer', { w: 'w6', ph: de ? 'e.g. Managing director, register court' : 'e.g. SARL au capital de 10 000 € – RCS Lyon 123 456 782' }] : null,
  ];
  const buyer = [
    ['buyer.name', 'Customer name', { req: 1, w: 'w3' }], ['buyer.street', 'Street and number', { w: 'w3' }], ['buyer.postcode', 'Postcode', { req: 'xr' }], ['buyer.city', 'City', { req: 'xr' }],
    au ? ['buyer.state', 'State', { ph: 'VIC' }] : ca ? ['buyer.state', 'Province or state', { ph: 'ON' }] : null, ['buyer.country', 'Country', { type: 'select', options: COUNTRIES, req: 1 }],
    nat ? ['buyer.nationalId', nat.buyerLabel, { req: au ? 1 : 0, ph: nat.buyerPh, cls: 'mono' }] : null,
    fr ? ['buyer.siteId', 'Customer SIRET', { ph: '14 digits, optional', cls: 'mono' }] : null,
    au ? null : ['buyer.vatId', pl ? 'Customer VAT ID (other countries)' : ca ? 'Customer GST/HST number' : 'Customer VAT ID', pl ? { ph: 'e.g. DE123456789' } : ca ? { ph: 'Optional', cls: 'mono' } : {}], ['buyer.id', 'Customer number'],
    de ? ['buyer.email', 'Customer’s email for e-invoices', { type: 'email', req: 'xr' }] : fr ? ['buyer.email', 'Customer’s electronic invoicing address', { ph: 'Leave empty to use their SIREN' }] : pl ? ['buyer.email', 'Customer email', { type: 'email' }] : null,
  ];
  const pay = [
    ['payment.meansCode', 'Payment method', { type: 'select', options: means }],
    ...(au || ca ? [['payment.bsb', ca ? 'Transit and institution no.' : 'BSB', { when: 'transfer', ph: ca ? '00000-000' : '000-000', cls: 'mono', w: ca ? 'w2' : '' }], ['payment.account', 'Account number', { when: 'transfer', w: 'w2', cls: 'mono' }]]
      : [['payment.iban', pl ? 'Bank account (IBAN)' : 'IBAN', { when: 'transfer', w: 'w3', ph: `${cc}00 0000 0000 0000 0000 00`, cls: 'mono' }], ['payment.bic', 'BIC', { when: 'transfer', w: 'w1' }]]),
    pl ? null : ['payment.accountName', 'Account holder', { when: 'transfer', w: 'w3' }], pl ? null : ['payment.remittance', 'Payment reference', { w: 'w3', ph: 'Usually the invoice number' }],
    ...(de || fr ? [['payment.mandateId', 'Mandate reference', { when: 'debit' }], ['payment.creditorId', 'Your creditor ID', { when: 'debit' }], ['payment.debtorIban', 'Customer IBAN', { when: 'debit', cls: 'mono' }]] : []),
    ['paymentTerms', 'Payment terms', { w: 'w6', type: 'textarea', ph: c.termsPh }], ['note', 'Note on the invoice', { w: 'w6', type: 'textarea' }],
  ];
  const f = l => l.filter(Boolean);
  return { doc: f(doc), seller: f(seller), buyer: f(buyer), pay: f(pay) };
}
const fid = k => 'f-' + k.replace(/\./g, '-');
function field([key, label, o = {}]) {
  const id = fid(key); const val = getPath(S.inv, key) ?? '';
  let control;
  if (o.type === 'select') { control = h('select', { id, dataset: { k: key } }, o.options.map(([v, t]) => h('option', { value: v, text: t }))); if (!o.options.some(([v]) => v === val) && val) control.append(h('option', { value: val, text: val })); control.value = val; }
  else if (o.type === 'textarea') control = h('textarea', { id, dataset: { k: key }, placeholder: o.ph || null, rows: 2, value: val });
  else control = h('input', { id, dataset: { k: key }, type: o.type || 'text', placeholder: o.ph || null, value: val, class: o.cls || null, autocomplete: 'off' });
  return h('div', { class: 'f ' + (o.w || ''), dataset: { when: o.when || '', req: o.req ? String(o.req) : '' } }, h('label', { for: id }, label, h('span', { class: 'req', hidden: true, text: '*', title: 'Required' })), control);
}
const vatOpts = () => cfg(S.inv.country).vatOptions;
const vatKey = l => { const o = vatOpts(); if (l.vatCategory === 'S') { const k = `S|${str(D(l.vatRate) ?? D('0'))}`; return o.some(x => x[0] === k) ? k : o.some(x => x[0] === 'S|other') ? 'S|other' : o[0][0]; } const k = `${l.vatCategory}|0`; return o.some(x => x[0] === k) ? k : (o.find(x => x[0].startsWith('G|') && ['K', 'AE'].includes(l.vatCategory)) || o.find(x => x[0].startsWith('E|')) || o[0])[0]; };

function renderConvert() {
  const v = clear(view('convert'));
  v.append(
    h('div', { class: 'view-head' }, h('h2', { text: 'Turn the invoice you already make into an e-invoice' }),
      h('p', { class: 'muted', text: C().lead }), h('p', { class: 'muted small', id: 'law-note', text: C().law })),
    h('div', { class: 'card', id: 'step1' }),
    h('div', { class: 'convert-grid' },
      h('div', { class: 'card', id: 'formcard' }),
      h('aside', { class: 'side', id: 'side' })),
    h('div', { class: 'card', id: 'previewcard' }));
  renderStep1(); renderForm(); renderSide(); renderPreview();
}

function renderStep1() {
  const c = clear($('#step1'));
  c.append(h('div', { class: 'card-head' }, h('span', { class: 'step', text: '1' }), h('h3', { text: 'Add your invoice' }), S.isExample ? h('span', { class: 'tag', text: 'Example data' }) : null));
  c.append(dropZone({
    id: 'convert-drop', title: 'Drop your invoice here', hint: 'PDF, Word (.docx) or Excel (.xlsx). The file stays in your browser.', accept: '.pdf,.docx,.xlsx,.xlsm,.xls,.ods,.csv,.txt,.xml', onFile: onConvertFile,
    extra: [h('button', { type: 'button', class: 'btn', onclick: startEmpty, text: 'Start empty' }), S.isExample ? null : h('button', { type: 'button', class: 'btn quiet', onclick: loadExample, text: 'Load the example' })],
  }));
  if (S.isExample) c.append(h('p', { class: 'muted small', text: 'The form below is filled with an example from a made-up carpentry business, so you can see how it works. Add your own invoice or start empty to replace it.' }));
  if (S.busy === 'file') c.append(h('div', { class: 'notice' }, h('div', { class: 'btn-row' }, h('span', { class: 'spinner' }), h('span', { text: 'Reading the file…' }))));
  const src = S.source;
  if (src && !S.busy) {
    const box = h('div', { class: 'notice' }, h('div', { class: 'btn-row' }, h('span', { class: 'filechip', text: src.name }), h('span', { class: 'muted small', text: src.kind === 'pdf' ? `${src.pages} page${src.pages === 1 ? '' : 's'} of text read` : 'text read' })));
    if (S.reading) box.append(h('div', { class: 'btn-row' }, h('span', { class: 'spinner' }), h('span', { text: 'Claude is reading your invoice. This can take up to a minute.' }), h('button', { type: 'button', class: 'btn', onclick: () => S.reading && S.reading.abort(), text: 'Stop' })));
    else if (src.readBy) box.append(h('div', { text: src.readBy === 'claude' ? 'Read with Claude. Check every field below before you save.' : `Read with the basic reader. Found: ${src.found.join(', ') || 'nothing'}.` }));
    if (!S.reading && src.text) {
      const row = h('div', { class: 'btn-row' });
      if (caps.sample && !src.aiOff) row.append(h('button', { type: 'button', class: 'btn primary', id: 'btn-ai', onclick: readWithClaude, text: src.readBy === 'claude' ? 'Read again with Claude' : 'Read with Claude' }));
      if (src.readBy !== 'basic') row.append(h('button', { type: 'button', class: 'btn', onclick: () => readBasic(), text: 'Use the basic reader' }));
      if (row.childNodes.length) box.append(row);
      if (caps.sample && !src.aiOff && src.readBy !== 'claude') box.append(h('div', { class: 'muted small', text: 'Reading with Claude sends the text of this invoice to Claude on your own account and fills in names, addresses and lines too.' }));
    }
    c.append(box);
    if (src.doubts && src.doubts.length && !S.reading) c.append(h('div', { class: 'notice warn' }, h('b', { text: 'Please check' }), h('ul', {}, src.doubts.map(d => h('li', { text: d })))));
  }
  if (S.step1Msg) c.append(h('div', { class: 'notice ' + S.step1Msg.kind }, h('span', { text: S.step1Msg.text }), S.step1Msg.action ? h('div', {}, h('button', { type: 'button', class: 'btn', onclick: S.step1Msg.action.fn, text: S.step1Msg.action.label })) : null));
}

function renderForm() {
  const c = clear($('#formcard'));
  const inv = S.inv; const K = cfg(inv.country); const FIELDS = fieldsFor(inv.country); const de = inv.country === 'DE';
  const form = h('form', { class: 'form', id: 'invform', novalidate: true, onsubmit: e => e.preventDefault() });
  c.append(h('div', { class: 'card-head' }, h('span', { class: 'step', text: '2' }), h('h3', { text: 'Check the details' })), form);
  form.append(...[
    !de ? null : h('fieldset', {}, h('legend', { text: 'Who is it for' }),
      h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Output format' },
        h('label', { for: 'f-profile-en16931' }, h('input', { type: 'radio', name: 'profile', id: 'f-profile-en16931', value: 'en16931', checked: inv.profile !== 'xrechnung', dataset: { k: 'profile' } }), h('span', {}, h('b', { text: 'A business customer' }), h('small', { text: 'ZUGFeRD PDF: a normal PDF they can read, with the e-invoice data inside.' }))),
        h('label', { for: 'f-profile-xrechnung' }, h('input', { type: 'radio', name: 'profile', id: 'f-profile-xrechnung', value: 'xrechnung', checked: inv.profile === 'xrechnung', dataset: { k: 'profile' } }), h('span', {}, h('b', { text: 'A public authority' }), h('small', { text: 'XRechnung XML: required by German public bodies; needs a few more fields.' }))))),
    h('fieldset', {}, h('legend', { text: 'Invoice' }), h('div', { class: 'grid' }, FIELDS.doc.map(field))),
    h('fieldset', {}, h('legend', { text: 'Your business' }), h('div', { class: 'grid' }, FIELDS.seller.map(field)),
      h('label', { class: 'check', for: 'f-remember' }, h('input', { type: 'checkbox', id: 'f-remember', checked: !!store.get(sellerKey(inv.country)), onchange: e => { if (e.target.checked) { store.set(sellerKey(S.inv.country), S.inv.seller); toast('Your business details are remembered on this device'); } else store.del(sellerKey(S.inv.country)); } }), h('span', { text: 'Remember my business details on this device' }))),
    h('fieldset', {}, h('legend', { text: 'Your customer' }), h('div', { class: 'grid' }, FIELDS.buyer.map(field))),
    h('fieldset', {}, h('legend', { text: 'What you sold' }),
      h('label', { class: 'check', for: 'f-smallBusiness' }, h('input', { type: 'checkbox', id: 'f-smallBusiness', checked: !!inv.smallBusiness, dataset: { k: 'smallBusiness' } }), h('span', {}, K.smallBusiness.label)),
      inv.country === 'PL' ? h('label', { class: 'check', for: 'f-pl-splitPayment' }, h('input', { type: 'checkbox', id: 'f-pl-splitPayment', checked: !!(inv.pl && inv.pl.splitPayment), dataset: { k: 'pl.splitPayment' } }), h('span', {}, 'Split payment applies (mechanizm podzielonej płatności)')) : null,
      h('div', { id: 'lines' }),
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn', id: 'btn-add-line', onclick: () => { S.inv.lines.push(emptyLine(S.inv.lines.length + 1)); renderLines(); changed(); const n = S.inv.lines.length - 1; $(`#l-${n}-name`)?.focus(); }, text: 'Add line' }),
        K.noAllowances ? null : h('button', { type: 'button', class: 'btn quiet', onclick: () => addAllowance(false), text: 'Add discount' }), K.noAllowances ? null : h('button', { type: 'button', class: 'btn quiet', onclick: () => addAllowance(true), text: 'Add surcharge' })),
      h('div', { id: 'allowances' }),
      h('div', { class: 'grid' },
        h('div', { class: 'f w4', dataset: { when: 'exempt' } }, h('label', { for: 'f-exemptionReason', text: inv.country === 'PL' ? 'Legal basis for the exemption' : `Reason why no ${K.taxName} is charged` }), h('input', { id: 'f-exemptionReason', dataset: { k: 'exemptionReason' }, value: inv.exemptionReason || '', placeholder: K.smallBusiness.reason })),
        K.noPrepaid ? null : h('div', { class: 'f' }, h('label', { for: 'f-prepaid', text: 'Already paid' }), h('input', { id: 'f-prepaid', class: 'num', inputmode: 'decimal', dataset: { k: 'prepaid' }, value: inv.prepaid || '', placeholder: '0.00' }))),
      h('dl', { class: 'totals', id: 'totals' })),
    h('fieldset', {}, h('legend', { text: 'Payment' }), h('div', { class: 'grid' }, FIELDS.pay.map(field))),
    inv.country !== 'FR' ? null : h('fieldset', {}, h('legend', { text: 'Legal mentions' }),
      h('p', { class: 'muted small', text: 'Every French invoice must state these three points. The usual wording is filled in for you; change it only if your terms differ.' }),
      h('div', { class: 'grid' }, [['fr.pmt', 'Recovery fee for late payment', 'PMT'], ['fr.pmd', 'Late-payment penalties', 'PMD'], ['fr.aab', 'Discount for early payment', 'AAB']].map(([k, label, code]) => field([k, label, { w: 'w6', ph: K.notes[code] }]))))].filter(Boolean));
  // a field that is removed while it still has focus fires a late change event: ignore events from an older form
  const invAtRender = S.inv; const guard = e => { if (S.inv === invAtRender && form.isConnected) onFormInput(e); };
  form.addEventListener('input', guard); form.addEventListener('change', guard);
  renderLines(); renderAllowances(); applyVisibility(); updateTotals();
}

function renderLines() {
  const box = clear($('#lines')); const inv = S.inv;
  const wrap = h('div', { class: 'lines' });
  inv.lines.forEach((l, i) => {
    const vk = vatKey(l);
    const unitSel = h('select', { id: `l-${i}-unit`, dataset: { l: i, lk: 'unit' } }, UNITS.filter(u => u[0] !== 'H87').map(u => h('option', { value: u[0], text: u[1] })));
    if (!UNITS.some(u => u[0] === l.unit) && l.unit) unitSel.append(h('option', { value: l.unit, text: l.unit })); unitSel.value = l.unit === 'H87' ? 'C62' : l.unit;
    const vatSel = h('select', { id: `l-${i}-vat`, dataset: { l: i, lk: 'vat' }, disabled: inv.smallBusiness }, inv.smallBusiness ? [h('option', { value: vk, text: cfg(inv.country).smallBusiness.short })] : vatOpts().map(([v, t]) => h('option', { value: v, text: t })));
    vatSel.value = vk;
    wrap.append(h('div', { class: 'line' },
      h('span', { class: 'no', text: String(i + 1) }),
      h('div', { class: 'name' }, h('label', { class: 'mlab', for: `l-${i}-name`, text: 'Item' }), h('input', { id: `l-${i}-name`, placeholder: 'What was sold', value: l.name, dataset: { l: i, lk: 'name' } })),
      h('div', { class: 'descw' }, h('label', { class: 'mlab', for: `l-${i}-description`, text: 'Details (optional)' }), h('input', { id: `l-${i}-description`, class: 'desc', value: l.description, dataset: { l: i, lk: 'description' } })),
      h('div', { class: 'qty' }, h('label', { class: 'mlab', for: `l-${i}-quantity`, text: 'Quantity' }), h('input', { id: `l-${i}-quantity`, class: 'num', inputmode: 'decimal', value: l.quantity, dataset: { l: i, lk: 'quantity' } })),
      h('div', { class: 'unit' }, h('label', { class: 'mlab', for: `l-${i}-unit`, text: 'Unit' }), unitSel),
      h('div', { class: 'price' }, h('label', { class: 'mlab', for: `l-${i}-unitPrice`, text: 'Net unit price' }), h('input', { id: `l-${i}-unitPrice`, class: 'num', inputmode: 'decimal', placeholder: '0.00', value: l.unitPrice, dataset: { l: i, lk: 'unitPrice' } })),
      h('div', { class: 'vat' }, h('label', { class: 'mlab', for: `l-${i}-vat`, text: cfg(inv.country).taxName }), vatSel, vk === 'S|other' && !inv.smallBusiness ? h('input', { id: `l-${i}-vatRate`, class: 'num', inputmode: 'decimal', 'aria-label': 'Tax rate in percent', placeholder: '%', value: l.vatRate, dataset: { l: i, lk: 'vatRate' } }) : null),
      h('div', { class: 'amt', id: `l-${i}-amt` }),
      h('button', { type: 'button', class: 'x', 'aria-label': `Remove line ${i + 1}`, title: 'Remove line', onclick: () => { if (S.inv.lines.length > 1) S.inv.lines.splice(i, 1); else S.inv.lines[0] = emptyLine(1); S.inv.lines.forEach((x, k) => { x.id = String(k + 1); }); renderLines(); changed(); }, text: '×' })));
  });
  box.append(wrap);
}
function addAllowance(charge) { S.inv.allowances.push({ charge, amount: '', reason: '', vatCategory: 'S', vatRate: cfg(S.inv.country).vatRates[0] }); renderAllowances(); changed(); $(`#a-${S.inv.allowances.length - 1}-reason`)?.focus(); }
function renderAllowances() {
  const box = clear($('#allowances')); const inv = S.inv;
  if (!inv.allowances.length) return;
  const grid = h('div', { class: 'lines' });
  inv.allowances.forEach((a, i) => {
    const vatSel = h('select', { id: `a-${i}-vat`, dataset: { a: i, ak: 'vat' }, disabled: inv.smallBusiness }, inv.smallBusiness ? [h('option', { value: vatKey(a), text: cfg(inv.country).smallBusiness.short })] : vatOpts().filter(o => o[0] !== 'S|other').map(([v, t]) => h('option', { value: v, text: t })));
    vatSel.value = vatKey(a) === 'S|other' ? vatOpts()[0][0] : vatKey(a);
    grid.append(h('div', { class: 'line ac' },
      h('span', { class: 'kind pill ' + (a.charge ? 'info' : 'ok'), text: a.charge ? 'Surcharge' : 'Discount' }),
      h('div', { class: 'name' }, h('label', { class: 'mlab', for: `a-${i}-reason`, text: 'Reason' }), h('input', { id: `a-${i}-reason`, placeholder: a.charge ? 'e.g. Delivery' : 'e.g. Loyalty discount', value: a.reason, dataset: { a: i, ak: 'reason' } })),
      h('div', { class: 'amount' }, h('label', { class: 'mlab', for: `a-${i}-amount`, text: 'Net amount' }), h('input', { id: `a-${i}-amount`, class: 'num', inputmode: 'decimal', placeholder: '0.00', value: a.amount, dataset: { a: i, ak: 'amount' } })),
      h('div', { class: 'vat' }, h('label', { class: 'mlab', for: `a-${i}-vat`, text: cfg(inv.country).taxName }), vatSel),
      h('button', { type: 'button', class: 'x', 'aria-label': 'Remove', title: 'Remove', onclick: () => { S.inv.allowances.splice(i, 1); renderAllowances(); changed(); }, text: '×' })));
  });
  box.append(grid);
}

function onFormInput(e) {
  const t = e.target; if (!t || !t.dataset) return;
  const d = t.dataset;
  if (d.k) {
    if (t.type === 'radio') { if (!t.checked) return; setPath(S.inv, d.k, t.value); }
    else if (t.type === 'checkbox') { setPath(S.inv, d.k, t.checked); if (d.k === 'smallBusiness') { if (t.checked && !S.inv.seller.vatId && !S.inv.seller.legalRegistration && !S.inv.seller.id && S.inv.seller.taxNumber) { S.inv.seller.id = S.inv.seller.taxNumber; const el = $('#' + fid('seller.id')); if (el) el.value = S.inv.seller.id; } renderLines(); renderAllowances(); } }
    else setPath(S.inv, d.k, t.value);
    if (d.k.startsWith('seller.') && $('#f-remember')?.checked) store.set(sellerKey(S.inv.country), S.inv.seller);
  } else if (d.lk !== undefined && d.l !== undefined) {
    const l = S.inv.lines[Number(d.l)]; if (!l) return;
    if (d.lk === 'vat') { const [cat, rate] = t.value.split('|'); l.vatCategory = cat; l.vatRate = rate === 'other' ? ([...cfg(S.inv.country).vatRates, '0'].includes(l.vatRate) ? '' : l.vatRate) : rate; if (e.type === 'change') { renderLines(); (rate === 'other' ? $(`#l-${d.l}-vatRate`) : $(`#l-${d.l}-vat`))?.focus(); } }
    else l[d.lk] = t.value;
  } else if (d.ak !== undefined && d.a !== undefined) {
    const a = S.inv.allowances[Number(d.a)]; if (!a) return;
    if (d.ak === 'vat') { const [cat, rate] = t.value.split('|'); a.vatCategory = cat; a.vatRate = rate; } else a[d.ak] = t.value;
  } else return;
  changed();
}

let checkTimer = null, draftTimer = null;
function changed() {
  if (S.isExample) { S.isExample = false; renderStep1(); }
  applyVisibility(); updateTotals();
  clearTimeout(draftTimer); draftTimer = setTimeout(() => store.set(DRAFT_KEY, { inv: S.inv, pdfLang: S.pdfLang, country: S.country }), 800);
  scheduleCheck();
}
function scheduleCheck(delay = 450) { S.checking = true; renderSideVerdict(); clearTimeout(checkTimer); checkTimer = setTimeout(runCheck, delay); }
async function runCheck() {
  try {
    await rulesReady;
    const xml = generateXml(S.inv); S.xml = xml;
    S.check = await validateDocument(parseXml(xml));
    S.checkError = null;
  } catch (e) { S.check = null; S.checkError = String(e.message || e); }
  S.checking = false; renderSide(); renderPreview();
}

function applyVisibility() {
  const inv = S.inv; const xr = inv.profile === 'xrechnung';
  const transfer = ['58', '30'].includes(inv.payment.meansCode), debit = inv.payment.meansCode === '59';
  const correction = ['381', '384'].includes(inv.typeCode) || !!inv.precedingNumber;
  const exempt = inv.smallBusiness || inv.lines.some(l => l.vatCategory === 'E') || inv.allowances.some(a => a.vatCategory === 'E');
  for (const el of $$('#invform [data-when]')) { const w = el.dataset.when; if (w) el.hidden = !(w === 'transfer' ? transfer : w === 'debit' ? debit : w === 'correction' ? correction : w === 'exempt' ? exempt : true); }
  for (const el of $$('#invform [data-req]')) { const r = el.dataset.req; const star = el.querySelector('.req'); if (star) star.hidden = !(r === '1' || (r === 'xr' && xr)); }
}
function updateTotals() {
  const noExtras = cfg(S.inv.country).noAllowances; const taxName = cfg(S.inv.country).taxName;
  const T = computeTotals(noExtras ? { ...S.inv, allowances: [], prepaid: '' } : S.inv); const cur = S.inv.currency || cfg(S.inv.country).currency; const m = v => money(v, 'en');
  T.lines.forEach((l, i) => { const el = $(`#l-${i}-amt`); if (el) el.textContent = l.net ? m(l.net) : '–'; });
  const dl = clear($('#totals')); const row = (k, v, cls = '') => dl.append(h('dt', { class: cls, text: k }), h('dd', { class: cls, text: v }));
  row('Sum of lines', m(T.lineTotal));
  if (T.allowances.some(a => a.amt)) { for (const a of T.allowances) if (a.amt) row(a.reason || (a.charge ? 'Surcharge' : 'Discount'), (a.charge ? '' : '−') + m(a.amt)); row(`Total without ${taxName}`, m(T.taxBasis)); }
  for (const g of T.breakdown) { if (g.parts) for (const p of g.parts) row(`${p.scheme} ${p.rate}% on ${m(g.basis)}`, m(p.tax)); else if (g.category === 'S') row(`${taxName} ${g.rate}% on ${m(g.basis)}`, m(g.tax)); }
  row('Total', `${m(T.grandTotal)} ${cur}`, 'strong');
  if (T.prepaid) { row('Already paid', '−' + m(T.prepaid)); row('Amount due', `${m(T.due)} ${cur}`); }
}

function focusField(key) {
  let el = $('#' + fid(key));
  if (key === 'lines') el = $('#l-0-name'); if (key === 'allowances') el = $('#a-0-reason') || $('#btn-add-line');
  if (!el) return;
  const wrap = el.closest('.f'); if (wrap && wrap.hidden) wrap.hidden = false;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus({ preventScroll: true });
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}

function renderSideVerdict() {
  const box = $('#side-verdict'); if (!box) return;
  clear(box);
  const p = S.checking || !S.check ? { kind: 'wait', seal: '…', title: S.checkError && !S.checking ? 'Could not check' : 'Checking…', sub: S.checkError && !S.checking ? S.checkError : 'Running the official rules' } : verdictParts(S.check);
  box.append(seal(p.kind, p.seal), h('div', { class: 'verdict-text' }, h('b', { text: p.title }), h('span', { class: 'muted small', text: p.sub })));
}
function compareWithOriginal() {
  const st = S.source && S.source.stated; if (!st || (!st.net && !st.gross)) return null;
  const T = computeTotals(S.inv); const m = v => money(v, 'en');
  const rows = [['Net total', st.net, T.taxBasis], [cfg(S.inv.country).taxName, st.vat, T.taxTotal], ['Total', st.gross, T.grandTotal]].filter(r => r[1] && D(r[1]));
  if (!rows.length) return null;
  const allOk = rows.every(r => cmp(r[1], r[2]) === 0);
  return h('div', { class: 'notice ' + (allOk ? 'ok' : 'warn') }, h('b', { text: allOk ? 'Totals match your original invoice' : 'Totals differ from your original invoice' }),
    h('dl', { class: 'facts' }, rows.map(([k, a, b]) => [h('dt', { text: k }), h('dd', { text: cmp(a, b) === 0 ? m(a) : `original ${m(a)}, here ${m(b)}` })])),
    allOk ? null : h('span', { class: 'small', text: 'Check quantities, prices and tax rates. The e-invoice must show the same amounts as the original.' }));
}
function renderSide() {
  const side = clear($('#side')); const inv = S.inv; const res = S.check; const xr = inv.profile === 'xrechnung';
  const card = h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('span', { class: 'step', text: '3' }), h('h3', { text: 'Check and save' })), h('div', { class: 'verdict', id: 'side-verdict' }));
  side.append(card); renderSideVerdict();
  const cmpBox = compareWithOriginal(); if (cmpBox) card.append(cmpBox);
  if (res && (res.counts.error || res.counts.warning)) card.append(renderFindings(res, { hideInfo: true, onField: focusField, limit: 12, structureLast: true, flat: true }));
  const ok = res && (res.verdict === 'valid' || res.verdict === 'warnings') && !S.checking;
  const base = safeName(inv.number);
  const actions = h('div', { class: 'btn-row', style: 'flex-direction:column;align-items:stretch' });
  const cc = inv.country; const c = cfg(cc); const hasPdf = c.pdfLangs.length > 0 && !xr;
  if (hasPdf) {
    if (!c.pdfLangs.some(l => l[0] === S.pdfLang)) S.pdfLang = c.pdfLangs[0][0];
    actions.append(h('button', { type: 'button', class: 'btn primary block', id: 'btn-save-pdf', disabled: !ok || S.busy === 'pdf', onclick: savePdf }, S.busy === 'pdf' ? h('span', { class: 'spinner' }) : null, cc === 'FR' ? 'Save Factur-X PDF' : cc === 'CA' ? 'Save invoice PDF' : 'Save ZUGFeRD PDF'));
    actions.append(h('div', { class: 'f', style: 'grid-column:auto' }, h('label', { for: 'f-pdfLang', text: 'Language of the PDF' }), h('select', { id: 'f-pdfLang', onchange: e => { S.pdfLang = e.target.value; store.set(DRAFT_KEY, { inv: S.inv, pdfLang: S.pdfLang, country: S.country }); } }, c.pdfLangs.map(([v, t]) => h('option', { value: v, text: t })))));
  }
  const xmlLabel = xr ? 'Save XRechnung XML' : cc === 'PL' ? 'Save FA(3) XML' : cc === 'AU' ? 'Save Peppol XML' : cc === 'CA' ? 'Save UBL data file' : 'Save XML only';
  const suffix = xr ? 'xrechnung' : cc === 'PL' ? 'fa3' : cc === 'AU' ? 'pint-aunz' : cc === 'CA' ? 'ubl' : 'factur-x';
  actions.append(h('div', { class: 'btn-row' },
    h('button', { type: 'button', class: 'btn' + (hasPdf ? '' : ' primary'), id: 'btn-save-xml', disabled: !ok, onclick: () => saveXml(`${base}-${suffix}`, S.xml), text: xmlLabel }),
    h('button', { type: 'button', class: 'btn', id: 'btn-copy-xml', disabled: !S.xml, onclick: () => copyXml(S.xml), text: 'Copy XML' })));
  actions.append(h('button', { type: 'button', class: 'btn block', id: 'btn-archive-out', disabled: !ok || S.isExample, onclick: () => archiveDoc(S.check, S.xml, 'sent', S.source?.name || ''), text: 'Add to archive' }));
  card.append(actions);
  const sel = $('#f-pdfLang'); if (sel) sel.value = S.pdfLang;
  if (res && !ok && !S.checking) card.append(h('p', { class: 'muted small', text: 'Saving is switched on once the problems above are fixed.' }));
  else if (S.isExample) card.append(h('p', { class: 'muted small', text: 'You can save the example to see the result. Example invoices cannot be archived.' }));
  card.append(h('p', { class: 'muted small', id: 'sending-note', text: xr ? 'Public bodies usually take XRechnung through their own portal or by email. Ask them for their Leitweg-ID.' : c.sending }));
}

function renderPreview() {
  const c = clear($('#previewcard'));
  c.append(h('div', { class: 'card-head' }, h('h3', { text: 'Preview' }), h('span', { class: 'muted small', text: 'How the data in the e-invoice reads.' })));
  if (S.check && S.check.parsed.ok) c.append(h('div', { class: 'desk' }, renderPaper(S.check.parsed.data, { stamp: stampFor(S.check) })));
  else c.append(h('p', { class: 'muted', text: 'The preview appears once the invoice has been checked.' }));
}

async function savePdf() {
  if (!S.check || S.busy) return;
  S.busy = 'pdf'; renderSide();
  try {
    const { buildZugferdPdf } = await import('./zugferd.js');
    const bytes = await buildZugferdPdf(S.inv, S.xml, { lang: S.pdfLang });
    S.busy = ''; renderSide();
    await saveFile(`${safeName(S.inv.number)}.pdf`, new Blob([bytes], { type: 'application/pdf' }));
  } catch (e) { S.busy = ''; renderSide(); toast('The PDF could not be created: ' + String(e.message || e).slice(0, 120), 'error'); }
}

function sellerProfile() { const p = store.get(sellerKey()); return p && typeof p === 'object' ? p : null; }
// an empty invoice with the chosen country's defaults
function newInvoice() { const c = C(); const inv = emptyInvoice(); inv.country = S.country; inv.currency = c.currency; inv.seller.country = S.country; inv.buyer.country = S.country; inv.payment.meansCode = c.payMeans[0]; for (const l of inv.lines) l.vatRate = c.vatRates[0]; return inv; }
function resetInvoice(inv, { example = false, source = null } = {}) {
  S.inv = inv; S.isExample = example; S.source = source; S.step1Msg = null; S.check = null; S.checkError = null;
  if (S.tab === 'convert' || view('convert').childNodes.length) { renderStep1(); renderForm(); renderSide(); renderPreview(); }
  if (!example) store.set(DRAFT_KEY, { inv: S.inv, pdfLang: S.pdfLang, country: S.country });
  scheduleCheck(50);
}
function startEmpty() { const inv = newInvoice(); const p = sellerProfile(); if (p) Object.assign(inv.seller, p); inv.issueDate = new Date().toISOString().slice(0, 10); resetInvoice(inv); $('#' + fid('number'))?.focus(); }
function loadExample() { store.del(DRAFT_KEY); resetInvoice(exampleInvoice(S.country), { example: true }); }

async function onConvertFile(file) {
  S.busy = 'file'; S.step1Msg = null; S.source = null; renderStep1();
  try {
    const r = await fileToText(file); S.busy = '';
    if (r.kind === 'unsupported') { S.step1Msg = { kind: 'err', text: r.reason }; renderStep1(); return; }
    if (r.embeddedXml || r.kind === 'xml') {
      const xml = r.embeddedXml || r.text;
      S.step1Msg = { kind: 'ok', text: r.embeddedXml ? `“${file.name}” already contains an e-invoice (${r.embeddedName}). There is nothing to convert.` : `“${file.name}” is already an XML e-invoice.`, action: { label: 'Check it in Validate', fn: async () => { await openIncomingXml(xml, file.name, r.embeddedXml ? r.embeddedName : ''); setTab('validate'); } } };
      renderStep1(); return;
    }
    if (r.scanned || !r.text.trim()) { S.step1Msg = { kind: 'warn', text: r.kind === 'pdf' ? 'This PDF contains no readable text. It is probably a scan or a photo. Type the details into the form below.' : 'No text was found in this file. Type the details into the form below.' }; renderStep1(); startEmptyKeepMsg(); return; }
    S.source = { name: file.name, kind: r.kind, pages: r.pages || 0, text: r.text, stated: null, doubts: [], found: [], readBy: '' };
    readBasic(true);
    await capsReady; renderStep1();
  } catch (e) { S.busy = ''; S.step1Msg = { kind: 'err', text: 'The file could not be read: ' + String(e.message || e).slice(0, 140) }; renderStep1(); }
}
function startEmptyKeepMsg() { const msg = S.step1Msg; const inv = newInvoice(); const p = sellerProfile(); if (p) Object.assign(inv.seller, p); resetInvoice(inv); S.step1Msg = msg; renderStep1(); }
function applyExtraction(r, by) {
  const src = S.source; const inv = r.invoice; const p = sellerProfile();
  if (p) for (const [k, v] of Object.entries(p)) if (!inv.seller[k] && v) inv.seller[k] = v; // fill gaps from the remembered business details
  inv.profile = S.inv && S.country === 'DE' ? S.inv.profile : 'en16931';
  Object.assign(src, { stated: r.stated, doubts: r.doubts, found: r.found, readBy: by });
  resetInvoice(inv, { source: src });
}
function readBasic() { if (!S.source) return; applyExtraction(basicExtract(S.source.text, S.country), 'basic'); }
async function readWithClaude() {
  if (!S.source || !caps.sample || S.reading) return;
  const ctl = new AbortController(); S.reading = ctl; S.step1Msg = null; renderStep1();
  try {
    const j = await caps.sample.json(buildPrompt(S.source.text, S.country), { signal: ctl.signal });
    S.reading = null; applyExtraction(normalizeAiResult(j, S.country), 'claude');
  } catch (e) {
    S.reading = null; const code = e && e.code;
    const text = code === 'cancelled' ? '' : code === 'not_granted' || code === 'sampling_disabled' || code === 'not_declared' || code === 'capability_disabled' || code === 'capability_removed' ? 'Reading with Claude is not allowed in this view. The basic reader was used instead.'
      : code === 'rate_limited' ? 'Claude is busy or your usage limit is reached. Try again later, or use the basic reader.' : code === 'session_expired' ? 'Please sign in to Claude again, then retry.' : code === 'refused' ? 'Claude declined to read this document. Use the basic reader or type the details in.'
      : code === 'prompt_too_large' ? 'This document is too long to read in one go. Use the basic reader or type the details in.' : 'Claude could not read the invoice this time. Try again, or use the basic reader.';
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) S.source.aiOff = true;
    if (text) S.step1Msg = { kind: 'warn', text };
    renderStep1();
  }
}

// ================================================================== VALIDATE + RECEIVE (incoming documents)
async function openIncomingXml(xml, name, embeddedName = '', example = '', auto = '') {
  await rulesReady;
  S.docError = null;
  let res = null;
  let dom;
  try { dom = parseXml(xml); }
  catch (e) { S.doc = null; S.docError = { name, text: `“${name}” is not well-formed XML, so it cannot be an e-invoice. ${String(e.message || e)}` }; renderDocViews(); return; }
  try { res = await validateDocument(dom); }
  catch (e) { S.doc = null; S.docError = { name, text: `“${name}” could not be checked: ${String(e.message || e).slice(0, 160)}` }; renderDocViews(); return; }
  S.doc = { name, xml, embeddedName, example, auto, result: res };
  renderDocViews();
}
async function onIncomingFile(file) {
  S.docLoading = file.name; S.docError = null; renderDocViews();
  try {
    await rulesReady;
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.pdf') || file.type === 'application/pdf') {
      const { readPdf } = await import('./pdfread.js'); const r = await readPdf(await file.arrayBuffer());
      S.docLoading = '';
      if (!r.embeddedXml) { S.doc = null; S.docError = { name: file.name, plainPdf: true, text: `“${file.name}” is an ordinary PDF with no e-invoice data inside. A plain PDF does not count as an e-invoice.` }; renderDocViews(); return; }
      openIncomingXml(r.embeddedXml, file.name, r.embeddedName);
    } else {
      const text = new TextDecoder('utf-8').decode(await file.arrayBuffer()); S.docLoading = '';
      openIncomingXml(text, file.name);
    }
  } catch (e) { S.docLoading = ''; S.doc = null; S.docError = { name: file.name, text: 'The file could not be read: ' + String(e.message || e).slice(0, 160) }; renderDocViews(); }
}
async function loadExampleDoc(kind, auto = false) {
  S.docLoading = 'example'; S.docError = null; renderDocViews();
  await rulesReady; S.docLoading = '';
  const a = auto ? kind : '';
  if (kind === 'faulty') await openIncomingXml(faultyExampleXml(S.country), 'example-with-errors.xml', '', 'faulty', a);
  else if (kind === 'valid') await openIncomingXml(generateXml(exampleInvoice(S.country)), 'example-valid.xml', '', 'valid', a);
  else await openIncomingXml(generateXml(exampleSupplierInvoice(S.country)), 'example-supplier-invoice.xml', '', 'supplier', a);
}
function renderDocViews() { renderValidate(); renderReceive(); }

function loaderCard(prefix, title, hint) {
  const card = h('div', { class: 'card' });
  card.append(dropZone({ id: prefix + '-drop', title, hint, accept: '.xml,.pdf,application/pdf,text/xml,application/xml', onFile: onIncomingFile,
    extra: [h('button', { type: 'button', class: 'btn', onclick: () => { S.pasteOpen = !S.pasteOpen; renderDocViews(); if (S.pasteOpen) $(`#${prefix}-paste`)?.focus(); }, text: 'Paste XML' })] }));
  if (S.pasteOpen) card.append(h('div', { class: 'f', style: 'grid-column:auto' }, h('label', { for: prefix + '-paste', text: 'Paste the XML of an e-invoice' }), h('textarea', { class: 'xml', id: prefix + '-paste', spellcheck: 'false' }),
    h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn primary', onclick: async () => { const v = $(`#${prefix}-paste`).value.trim(); if (!v) return; await rulesReady; S.pasteOpen = false; openIncomingXml(v, 'pasted.xml'); }, text: 'Check this XML' }))));
  card.append(h('div', { class: 'btn-row' }, h('span', { class: 'muted small', text: 'No file at hand?' }),
    h('button', { type: 'button', class: 'btn quiet', onclick: () => loadExampleDoc('faulty'), text: 'Example with errors' }), h('button', { type: 'button', class: 'btn quiet', onclick: () => loadExampleDoc('valid'), text: 'Valid example' }), h('button', { type: 'button', class: 'btn quiet', onclick: () => loadExampleDoc('supplier'), text: 'Supplier invoice' })));
  if (S.docLoading) card.append(h('div', { class: 'notice' }, h('div', { class: 'btn-row' }, h('span', { class: 'spinner' }), h('span', { text: S.docLoading === 'example' ? 'Loading the rule sets…' : `Checking ${S.docLoading}…` }))));
  if (S.docError) card.append(h('div', { class: 'notice err' }, h('b', { text: 'Not an e-invoice' }), h('span', { text: S.docError.text }), S.docError.plainPdf ? h('span', { class: 'small', text: 'If this is your own invoice, the Convert tab turns it into one. If a supplier sent it, ask them for an e-invoice file.' }) : null));
  return card;
}
function docFacts(doc) {
  const r = doc.result; const d = r.parsed.ok ? r.parsed.data : null;
  const rows = [['File', doc.name + (doc.embeddedName ? ` (embedded ${doc.embeddedName})` : '')]];
  if (r.syntax) rows.push(['Syntax', r.syntax === 'CII' ? 'UN/CEFACT CII (used by ZUGFeRD, Factur-X and XRechnung)' : r.syntax === 'UBL' ? `UBL ${r.kind === 'CreditNote' ? 'credit note' : 'invoice'} (used by Peppol and XRechnung)` : r.syntax === 'FA' ? 'KSeF structured invoice (Poland)' : r.syntax]);
  if (r.spec) rows.push(['Standard', r.spec.label + (r.spec.accepted === false ? ' — not accepted as an e-invoice' : '')]);
  if (r.country && (COUNTRY[r.country] || r.country === 'NZ')) rows.push(['Rules of', r.country === 'NZ' ? 'New Zealand (shared with Australia)' : COUNTRY[r.country].name]);
  if (d) rows.push(['Invoice', `${d.number || '—'} of ${dateHuman(d.issueDate, 'en') || '—'}, ${d.seller?.name || '—'} to ${d.buyer?.name || '—'}`]);
  if (r.ruleSets.length) rows.push(['Checked against', (r.syntax === 'FA' ? '' : 'Official XML schema structure; ') + r.ruleSets.join('; ')]);
  return h('dl', { class: 'facts' }, rows.map(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })]));
}
function docActions(doc, here) {
  const r = doc.result; const row = h('div', { class: 'btn-row' });
  if (r.parsed.ok && here !== 'receive') row.append(h('button', { type: 'button', class: 'btn', onclick: () => setTab('receive'), text: 'View as invoice' }));
  if (here !== 'validate') row.append(h('button', { type: 'button', class: 'btn', onclick: () => setTab('validate'), text: 'See all checks' }));
  if (r.parsed.ok) row.append(h('button', { type: 'button', class: 'btn', disabled: !!doc.example, title: doc.example ? 'Example files cannot be archived' : null, onclick: () => archiveDoc(r, doc.xml, 'received', doc.name), text: 'Add to archive' }));
  if (r.parsed.ok) row.append(h('button', { type: 'button', class: 'btn quiet', onclick: () => openInEditor(r), text: 'Open in the editor' }));
  row.append(h('button', { type: 'button', class: 'btn quiet', onclick: () => copyXml(doc.xml), text: 'Copy XML' }));
  return row;
}

// Open a parsed invoice in the Convert form, switching to the country whose rules it follows.
function openInEditor(r) {
  const cc = r.syntax === 'FA' ? 'PL' : COUNTRY[r.country] && r.country !== 'PL' && (r.country !== 'CA' || r.syntax === 'UBL') ? r.country : (S.country === 'FR' ? 'FR' : 'DE');
  setCountry(cc, false);
  resetInvoice(r.syntax === 'FA' ? fa3ToFormModel(r.parsed.data) : toFormModel(r.parsed.data, r.spec, cc)); setTab('convert');
}

function renderValidate() {
  const v = clear(view('validate'));
  v.append(h('div', { class: 'view-head' }, h('h2', { text: 'Check a file against the official rules' }),
    h('p', { class: 'muted', text: `Upload a ${C().fileWord} file, yours or a supplier’s. Every problem is explained in plain language, with what to change. Files from the other supported countries are recognised too.` })));
  v.append(loaderCard('val', 'Drop an e-invoice here', 'XML (XRechnung, Factur-X / CII, Peppol / UBL, KSeF FA(3)) or a ZUGFeRD / Factur-X PDF. The file stays in your browser.'));
  const doc = S.doc; if (!doc) return;
  const r = doc.result; const p = verdictParts(r);
  const card = h('div', { class: 'card' });
  card.append(h('div', { class: 'card-head' }, h('h3', { text: 'Result' }), doc.example ? h('span', { class: 'tag', text: 'Example' }) : null));
  card.append(h('div', { class: 'verdict' }, seal(p.kind, p.seal), h('div', { class: 'verdict-text' }, h('b', { text: p.title }), h('span', { class: 'muted', text: p.sub }))));
  card.append(docFacts(doc));
  for (const n of r.notes || []) card.append(h('div', { class: 'notice', text: n }));
  card.append(docActions(doc, 'validate'));
  v.append(card);
  if (r.parsed.ok) {
    const f = renderFindings(r);
    if (f.childNodes.length) v.append(f);
    else v.append(h('div', { class: 'notice ok', text: r.syntax === 'FA' ? 'No problems found. The file matches the official FA(3) schema, and the sums and tax numbers are plausible.' : 'No problems found. The structure matches the official schema and every business rule passes.' }));
  }
}

function renderReceive() {
  const v = clear(view('receive'));
  v.append(h('div', { class: 'view-head' }, h('h2', { text: 'Read a supplier’s e-invoice' }),
    h('p', { class: 'muted', text: 'An e-invoice is a data file that no one can read by eye. Upload it here to see it as a normal invoice, check it, and keep it for the tax office.' })));
  v.append(loaderCard('rec', 'Drop the e-invoice you received', 'XML (XRechnung, Factur-X / CII, Peppol / UBL, KSeF FA(3)) or a ZUGFeRD / Factur-X PDF.'));
  const doc = S.doc; if (!doc) return;
  const r = doc.result; const p = verdictParts(r);
  const card = h('div', { class: 'card' });
  card.append(h('div', { class: 'card-head' }, h('h3', { text: doc.name }), doc.example ? h('span', { class: 'tag', text: 'Example' }) : null));
  card.append(h('div', { class: 'verdict' }, seal(p.kind, p.seal), h('div', { class: 'verdict-text' }, h('b', { text: p.title }), h('span', { class: 'muted', text: r.parsed.ok ? `${r.spec.label} · ${p.sub}` : p.sub }))));
  if (r.parsed.ok && r.verdict === 'invalid') card.append(h('div', { class: 'notice warn', text: 'This invoice does not pass the official rules. You may ask the supplier to send a corrected e-invoice before you pay or book it.' }));
  card.append(docActions(doc, 'receive'));
  v.append(card);
  if (r.parsed.ok) v.append(h('div', { class: 'desk' }, renderPaper(r.parsed.data, { stamp: stampFor(r), onCopy: t => copyText(t, 'Copied') })));
}

// ================================================================== ARCHIVE
async function getArchive() {
  if (S.arch.store) return S.arch.store;
  await capsReady;
  if (!S.arch.store) {
    S.arch.store = createArchive(caps.db, caps.uid);
    S.arch.store.subscribe((items, err) => { S.arch.items = items; if (err) S.arch.error = err; updateArchCount(); if (S.tab === 'archive' && !S.arch.open) renderArchive(); });
  }
  return S.arch.store;
}
function updateArchCount() { const el = $('#arch-count'); if (!el) return; const n = S.arch.items.length; el.hidden = n === 0; el.textContent = String(n); }
function switchToLocalArchive() { S.arch.store = createLocalArchive(); S.arch.store.subscribe(items => { S.arch.items = items; updateArchCount(); if (S.tab === 'archive' && !S.arch.open) renderArchive(); }); return S.arch.store; }

async function archiveDoc(result, xml, direction, source) {
  if (!result || !result.parsed.ok) return;
  try {
    let st = await getArchive();
    const sha = await sha256Hex(xml);
    if (S.arch.items.some(i => i.sha256 === sha)) { toast('This invoice is already in the archive'); return; }
    const meta = { ...metaFrom(result, xml, direction, source, COUNTRY[result.country] ? result.country : S.country), sha256: sha };
    try { await st.add(meta, xml); }
    catch (e) {
      if (st.mode === 'db' && e && (e.code === 'invalid_argument' || e.code === 'not_granted' || e.code === 'revoked' || e.code === 'capability_disabled')) { st = switchToLocalArchive(); await st.add(meta, xml); toast('You cannot write to the shared archive here, so the invoice was stored in this browser instead.'); return; }
      if (e && e.code === 'quota_exceeded') { toast('The archive is full. Export and remove old entries first.', 'error'); return; }
      throw e;
    }
    toast(`Archived. Keep until ${dateHuman(meta.keepUntil, 'en')}.`);
  } catch (e) { toast('The invoice could not be archived: ' + String((e && e.message) || e).slice(0, 120), 'error'); }
}

function storageLine() {
  const st = S.arch.store;
  if (!st) return 'Opening your archive…';
  if (st.mode === 'db') return 'Stored in your private space in this app. Only you can see these invoices.';
  if (st.mode === 'local') return 'Stored in this browser on this device only. Clearing the browser data removes it, so export a copy regularly.';
  return 'This browser does not allow saving, so the archive lasts only until you close the page.';
}
function renderArchive() {
  const v = clear(view('archive')); const A = S.arch;
  getArchive();
  v.append(h('div', { class: 'view-head' }, h('h2', { text: 'Keep every invoice for the legal period' }),
    h('p', { class: 'muted', text: C().retentionText }),
    h('p', { class: 'small muted', id: 'arch-storage', text: storageLine() })));
  if (A.open) { renderArchiveDetail(v); return; }
  if (!A.items.length) {
    v.append(h('div', { class: 'empty' }, h('h3', { text: A.store ? 'No invoices archived yet' : 'Opening your archive…' }),
      h('p', { class: 'muted', text: 'Invoices you create in Convert and e-invoices you open in Receive can be added here with one click. Each is stored unchanged, with a checksum and the date until which it must be kept.' }),
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn primary', onclick: () => setTab('receive'), text: 'Add a received invoice' }), h('button', { type: 'button', class: 'btn', onclick: () => setTab('convert'), text: 'Create an invoice' }))));
    return;
  }
  const q = A.q.trim().toLowerCase();
  const list = A.items.filter(i => (A.filter === 'all' || i.direction === A.filter) && (!q || [i.number, i.seller, i.buyer, i.issueDate, i.total, i.source].join(' ').toLowerCase().includes(q)));
  const search = h('input', { type: 'search', id: 'arch-q', placeholder: 'Search number, name or date', 'aria-label': 'Search the archive', value: A.q, oninput: e => { A.q = e.target.value; renderArchiveRows(); } });
  v.append(h('div', { class: 'arch-bar' }, search,
    h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter' }, [['all', 'All'], ['sent', 'Sent'], ['received', 'Received']].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': String(A.filter === k), onclick: () => { A.filter = k; renderArchive(); }, text: t }))),
    h('button', { type: 'button', class: 'btn', id: 'btn-export', style: 'margin-left:auto', onclick: exportArchive, text: 'Export all (ZIP)' })));
  v.append(h('div', { class: 'table-wrap' }, h('table', { class: 'arch' },
    h('thead', {}, h('tr', {}, ['', 'Number', 'Date', 'From', 'To', 'Total', 'Format', 'Checked', 'Keep until'].map((t, i) => h('th', { class: i === 5 ? 'r' : '', text: t })))),
    h('tbody', { id: 'arch-rows' }))));
  renderArchiveRows(list);
  if (A.error) v.append(h('div', { class: 'notice warn', text: 'The archive could not be refreshed. Reload the page to try again.' }));
}
function renderArchiveRows(list) {
  const A = S.arch; const body = $('#arch-rows'); if (!body) return;
  if (!list) { const q = A.q.trim().toLowerCase(); list = A.items.filter(i => (A.filter === 'all' || i.direction === A.filter) && (!q || [i.number, i.seller, i.buyer, i.issueDate, i.total, i.source].join(' ').toLowerCase().includes(q))); }
  clear(body);
  if (!list.length) { body.append(h('tr', {}, h('td', { colspan: '9', class: 'muted', text: 'No invoice matches.' }))); return; }
  for (const i of list) {
    const tr = h('tr', { class: 'rowlink', tabindex: '0', onclick: () => openArchived(i.id), onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openArchived(i.id); } } },
      h('td', {}, h('span', { class: 'pill ' + (i.direction === 'sent' ? 'info' : 'ok'), text: i.direction === 'sent' ? 'Sent' : 'Received' })),
      h('td', { class: 'mono', text: i.number || '—' }), h('td', { class: 'nowrap', text: dateHuman(i.issueDate, 'en') || '—' }), h('td', { text: i.seller || '—' }), h('td', { text: i.buyer || '—' }),
      h('td', { class: 'r', text: i.total ? `${money(i.total, 'en')} ${i.currency || ''}` : '—' }), h('td', { text: i.standard || i.syntax || '' }),
      h('td', {}, h('span', { class: 'pill ' + (i.verdict === 'valid' ? 'ok' : i.verdict === 'warnings' ? 'warning' : 'error'), text: i.verdict === 'valid' ? 'Valid' : i.verdict === 'warnings' ? 'Warnings' : 'Not valid' })),
      h('td', { class: 'nowrap', text: dateHuman(i.keepUntil, 'en') }));
    body.append(tr);
  }
}
async function openArchived(id) {
  const A = S.arch; const item = A.items.find(i => i.id === id); if (!item) return;
  A.open = item; A.openXml = null; A.openState = 'loading'; A.openResult = null; A.confirmDelete = false; renderArchive();
  try {
    const xml = await A.store.getXml(id); await rulesReady;
    if (A.open !== item) return;
    if (xml === null) { A.openState = 'missing'; renderArchive(); return; }
    A.openXml = xml; A.openIntact = (await sha256Hex(xml)) === item.sha256;
    try { A.openResult = await validateDocument(parseXml(xml)); } catch { A.openResult = null; }
    A.openState = 'ready';
  } catch { A.openState = 'missing'; }
  if (A.open === item) renderArchive();
}
function renderArchiveDetail(v) {
  const A = S.arch; const i = A.open;
  const back = h('button', { type: 'button', class: 'btn quiet', style: 'align-self:flex-start', onclick: () => { A.open = null; renderArchive(); }, text: '← Back to the list' });
  const card = h('div', { class: 'card detail' });
  card.append(h('div', { class: 'card-head' }, h('h3', { text: `${i.direction === 'sent' ? 'Sent' : 'Received'} invoice ${i.number || ''}` })));
  const past = i.keepUntil < new Date().toISOString().slice(0, 10);
  card.append(h('dl', { class: 'facts' }, [
    ['From', i.seller], ['To', i.buyer], ['Date', dateHuman(i.issueDate, 'en')], ['Total', i.total ? `${money(i.total, 'en')} ${i.currency || ''}` : ''], ['Format', [i.standard, i.syntax].filter(Boolean).join(' · ')],
    ['Checked when archived', i.verdict === 'valid' ? 'Valid' : i.verdict === 'warnings' ? `Valid, ${i.warnings} warning(s)` : `Not valid, ${i.errors} problem(s)`], ['Archived', new Date(i.archivedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })],
    ['Keep until', dateHuman(i.keepUntil, 'en') + (past ? ' (period has ended)' : '')], ['Original file', [i.source, fmtBytes(i.bytes || 0)].filter(Boolean).join(' · ')], ['Checksum (SHA-256)', i.sha256],
  ].filter(r => r[1]).map(([k, val]) => [h('dt', { text: k }), h('dd', { class: k.startsWith('Checksum') ? 'mono' : '', text: val })])));
  if (A.openState === 'loading') card.append(h('div', { class: 'btn-row' }, h('span', { class: 'spinner' }), h('span', { class: 'muted', text: 'Loading the stored file…' })));
  else if (A.openState === 'missing') card.append(h('div', { class: 'notice err', text: 'The stored file could not be loaded.' }));
  else card.append(h('div', { class: 'notice ' + (A.openIntact ? 'ok' : 'err'), text: A.openIntact ? 'Unchanged: the stored file still matches the checksum taken when it was archived.' : 'Warning: the stored file no longer matches its checksum. It has been changed since it was archived.' }));
  if (A.openState === 'ready') {
    const base = safeName(i.number || 'invoice');
    card.append(h('div', { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn primary', onclick: () => saveXml(base, A.openXml), text: 'Save the original XML' }), h('button', { type: 'button', class: 'btn', onclick: () => copyXml(A.openXml), text: 'Copy XML' }),
      h('button', { type: 'button', class: 'btn', onclick: async () => { await openIncomingXml(A.openXml, i.source || `${base}.xml`); setTab('validate'); }, text: 'Check again' }),
      h('button', { type: 'button', class: 'btn danger', style: 'margin-left:auto', onclick: () => { A.confirmDelete = true; renderArchive(); }, text: 'Delete…' })));
    if (A.confirmDelete) card.append(h('div', { class: 'confirm' }, h('b', { text: past ? 'Delete this invoice from the archive?' : `This invoice must be kept until ${dateHuman(i.keepUntil, 'en')}.` }),
      h('span', { class: 'small', text: past ? 'This cannot be undone.' : 'Deleting it now can break your legal duty to keep records. Only delete test entries or duplicates. This cannot be undone.' }),
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn danger', onclick: async () => { try { await A.store.remove(i.id); A.open = null; toast('Deleted'); renderArchive(); } catch { toast('Could not delete this entry.', 'error'); } }, text: 'Delete permanently' }), h('button', { type: 'button', class: 'btn', onclick: () => { A.confirmDelete = false; renderArchive(); }, text: 'Keep it' }))));
  }
  v.append(back, card);
  if (A.openState === 'ready' && A.openResult && A.openResult.parsed.ok) v.append(h('div', { class: 'desk' }, renderPaper(A.openResult.parsed.data, { stamp: stampFor(A.openResult), onCopy: t => copyText(t, 'Copied') })));
}
async function exportArchive() {
  const A = S.arch; if (!A.items.length) return;
  const btn = $('#btn-export'); if (btn) { btn.disabled = true; btn.textContent = 'Preparing…'; }
  try {
    const files = {}; const csv = [['direction', 'number', 'date', 'from', 'to', 'total', 'currency', 'format', 'checked', 'archived', 'keep_until', 'sha256', 'file'].join(';')];
    const used = new Set();
    for (const i of A.items) {
      const xml = await A.store.getXml(i.id); if (xml === null) continue;
      let name = `${i.direction}/${safeName(i.issueDate || 'undated')}_${safeName(i.number || i.id)}.xml`; let k = 2; while (used.has(name)) name = name.replace(/(_\d+)?\.xml$/, `_${k++}.xml`); used.add(name);
      files[name] = strToU8(xml);
      csv.push([i.direction, i.number, i.issueDate, i.seller, i.buyer, i.total, i.currency, i.standard, i.verdict, i.archivedAt, i.keepUntil, i.sha256, name].map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';'));
    }
    files['index.csv'] = strToU8('﻿' + csv.join('\r\n'));
    await saveFile(`eos-archive-${new Date().toISOString().slice(0, 10)}.zip`, zipSync(files));
  } catch (e) { toast('The export failed: ' + String((e && e.message) || e).slice(0, 100), 'error'); }
  if (btn) { btn.disabled = false; btn.textContent = 'Export all (ZIP)'; }
}

// ================================================================== start
function renderFoot() {
  clear($('#foot')).append(
    h('p', { text: `Rule sets for ${C().name}: ${C().rules}` }),
    h('p', { text: (caps.sample ? 'Your invoices are processed in your browser. Only “Read with Claude” sends the text of an invoice to Claude.' : 'Your invoices are processed in your browser and are not uploaded anywhere. The archive is kept in this browser.') + ' eos e-invoice is a working prototype and does not replace tax advice.' }));
}
// The country decides the output format, the form fields, the examples and the retention period.
function renderCountry() {
  const box = clear($('#market')); if (!box) return;
  box.append(h('label', { for: 'country', text: 'Country' }), h('select', { id: 'country', onchange: e => setCountry(e.target.value) }, COUNTRY_CODES.map(cc => h('option', { value: cc, text: COUNTRY[cc].name }))), h('span', { class: 'market-formats', text: C().formats }));
  $('#country').value = S.country;
  const sub = $('#tab-archive span'); if (sub) sub.textContent = `Keep invoices for ${C().retentionYears} years`;
}
function setCountry(cc, adapt = true) {
  if (!COUNTRY[cc]) return;
  const old = S.country; S.country = cc; store.set(COUNTRY_KEY, cc);
  renderCountry(); renderFoot();
  if (old === cc || !adapt) return;
  if (S.isExample || !S.inv) { S.inv = exampleInvoice(cc); S.isExample = true; S.source = null; S.step1Msg = null; }
  else { // keep what was typed, move it to the new country's rules
    const inv = S.inv; const from = cfg(old), to = cfg(cc);
    inv.country = cc; inv.currency = to.currencies.includes(inv.currency) ? inv.currency : to.currency; inv.profile = 'en16931';
    if (!to.typeCodes.includes(inv.typeCode)) inv.typeCode = '380';
    if (!to.payMeans.includes(inv.payment.meansCode)) inv.payment.meansCode = to.payMeans[0];
    const mapRate = x => { if (x.vatCategory !== 'S') return; const k = from.vatRates.indexOf(str(D(x.vatRate) ?? D('0'))); if (k >= 0) x.vatRate = to.vatRates[Math.min(k, to.vatRates.length - 1)]; };
    inv.lines.forEach(mapRate); inv.allowances.forEach(mapRate);
    if (inv.seller.country === old) inv.seller.country = cc; if (inv.buyer.country === old) inv.buyer.country = cc;
    if (cc === 'FR' || old === 'FR') { inv.seller.email = ''; inv.buyer.email = ''; } // in France this field is the directory address, not an email
    store.set(DRAFT_KEY, { inv: S.inv, pdfLang: S.pdfLang, country: S.country });
  }
  S.check = null; S.checkError = null;
  renderConvert(); scheduleCheck(50);
  if (S.doc && S.doc.example) { S.doc = null; }
  if (S.tab !== 'convert') setTab(S.tab, false);
}
function boot(saved) {
  const draft = store.get(DRAFT_KEY); const stored = store.get(COUNTRY_KEY);
  if (saved && saved.inv) { S.inv = saved.inv; S.isExample = !!saved.isExample; S.pdfLang = saved.pdfLang || 'de'; S.country = COUNTRY[saved.country] ? saved.country : (COUNTRY[saved.inv.country] ? saved.inv.country : 'DE'); }
  else if (draft && draft.inv && draft.inv.seller && Array.isArray(draft.inv.lines) && (!stored || !draft.inv.country || draft.inv.country === stored)) { const e = emptyInvoice(); S.inv = { ...e, ...draft.inv, seller: { ...e.seller, ...draft.inv.seller }, buyer: { ...e.buyer, ...draft.inv.buyer }, payment: { ...e.payment, ...draft.inv.payment }, fr: { ...e.fr, ...(draft.inv.fr || {}) }, pl: { ...e.pl, ...(draft.inv.pl || {}) } }; S.pdfLang = draft.pdfLang || 'de'; S.country = COUNTRY[S.inv.country] ? S.inv.country : 'DE'; }
  else { S.country = COUNTRY[stored] ? stored : 'DE'; S.inv = exampleInvoice(S.country); S.isExample = true; }
  S.inv.country = S.country;
  renderCountry(); renderConvert(); renderFoot();
  for (const t of ['convert', 'validate', 'receive', 'archive']) document.getElementById('tab-' + t).addEventListener('click', () => setTab(t));
  const hash = (location.hash || '').replace('#', ''); if (['validate', 'receive', 'archive'].includes(hash)) setTab(hash, false);
  scheduleCheck(0);
  capsReady.then(() => { if (S.source) renderStep1(); renderFoot(); getArchive(); });
  rulesReady.catch(() => { S.checking = false; S.checkError = 'The rule sets could not be loaded. Reload the page.'; renderSideVerdict(); });
}
if (__EOS_TEST__) window.__eos = { S, caps, ready: rulesReady, setCountry, check: async xml => { try { const r = await validateDocument(parseXml(xml)); return { findings: r.findings.map(f => [f.id, f.flag, f.set]), structure: r.structure.length, engine: r.engineErrors.length, verdict: r.verdict, ok: r.parsed.ok, country: r.country, scenario: r.scenario }; } catch (e) { return { error: String(e.message || e) }; } } };
// keep work in progress when the page is updated while open
try { window.claude?.hot?.snapshot?.(() => ({ inv: S.inv, isExample: S.isExample, pdfLang: S.pdfLang, country: S.country })); } catch { /* not in a viewer */ }
const start = data => boot(data || null);
if (window.claude?.hot?.ready) window.claude.hot.ready(start); else start(window.claude?.hot?.data ?? null);
