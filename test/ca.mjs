// Canada: the CRA information thresholds ($100 and $500) behave as the guide RC4022 describes.
import fs from 'node:fs';
import { parseXmlDocument } from 'slimdom';
import { loadRules, validateDocument } from '../src/validate.js';
import { generateUBL } from '../src/ubl.js';
import { caSamples } from './samples.mjs';
loadRules({ structure: JSON.parse(fs.readFileSync(new URL('../build/rules/structure.json', import.meta.url))) });
const base = () => JSON.parse(JSON.stringify(caSamples.caOntario));
const one = (price, f) => { const i = base(); i.lines = [{ ...i.lines[1], quantity: '1', unitPrice: price }]; f && f(i); return i; };
const cases = [
  ['$50 sale without GST/HST number → valid with a warning', one('44.00', i => { i.seller.vatId = ''; }), 'warnings', ['CA-10']],
  ['$120 sale without GST/HST number → error', one('106.00', i => { i.seller.vatId = ''; }), 'invalid', ['CA-10']],
  ['$120 sale, number in the wrong form → error', one('106.00', i => { i.seller.vatId = '12345 RT1'; }), 'invalid', ['CA-11']],
  ['$120 sale without buyer name and terms → still valid (below $500)', one('106.00', i => { i.buyer.name = ''; i.paymentTerms = ''; i.dueDate = ''; }), 'valid', []],
  ['$600 sale without payment terms or due date → error', one('531.00', i => { i.paymentTerms = ''; i.dueDate = ''; }), 'invalid', ['CA-22']],
  ['$600 sale with only a due date → valid', one('531.00', i => { i.paymentTerms = ''; }), 'valid', []],
  ['$600 sale without buyer name → error', one('531.00', i => { i.buyer.name = ''; }), 'invalid', ['CA-20']],
  ['Quebec taxes without QST number → error', one('531.00', i => { i.lines[0].vatRate = '14.975'; }), 'invalid', ['CA-12']],
  ['Quebec taxes with QST number in the wrong form → error', one('531.00', i => { i.lines[0].vatRate = '14.975'; i.seller.taxNumber = '12345TQ1'; }), 'invalid', ['CA-13']],
  ['BC taxes without PST number → warning', one('531.00', i => { i.lines[0].vatRate = '12'; }), 'warnings', ['CA-14']],
  ['small supplier without any number → valid', one('531.00', i => { i.smallBusiness = true; i.seller.vatId = ''; }), 'valid', []],
  ['zero-rated export without number → valid', one('531.00', i => { i.lines[0].vatCategory = 'Z'; i.lines[0].vatRate = '0'; i.seller.vatId = ''; }), 'valid', []],
];
let bad = 0;
for (const [name, inv, want, ids] of cases) {
  const r = await validateDocument(parseXmlDocument(generateUBL(inv)));
  const got = r.findings.map(f => f.id).sort().join(','); const ok = r.verdict === want && got === ids.slice().sort().join(',') && r.structure.length === 0;
  if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ` → ${r.verdict} [${got}] ${r.structure.map(s => s.message).join(' | ')}`));
}
// tampered totals are caught
let x = generateUBL(base()).replace(/(<cbc:TaxAmount currencyID="CAD">)694\.45</g, '$1700.00<');
let r = await validateDocument(parseXmlDocument(x)); const ids = r.findings.map(f => f.id); const ok = ids.includes('CA-30') && ids.includes('CA-33');
if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + 'wrong tax amount is caught: ' + ids.join(','));
console.log('problems:', bad);
