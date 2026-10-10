// Run the JS schematron runner over files; print JSON {file: {KEY: [[id, flag, location]]}}
// usage: node jsrun.mjs KEY1,KEY2 file...
import fs from 'node:fs';
import { parseXmlDocument } from 'slimdom';
import { compileRules, validate } from '../src/schematron.js';
const MAP = { EN16931: s => 'en16931-' + s, XRechnung: s => 'xrechnung-' + s, FRCTC: s => 'fr-ctc-' + s, PINTAUNZ1: s => (s === 'ubl' ? 'pint-aunz-shared' : null), PINTAUNZ2: s => (s === 'ubl' ? 'pint-aunz-aligned' : null) };
const keys = process.argv[2].split(',');
const cache = {}; const T = n => (cache[n] ||= compileRules(JSON.parse(fs.readFileSync(new URL(`../build/rules/${n}.json`, import.meta.url)))));
const out = {};
for (const f of process.argv.slice(3)) {
  try {
    const doc = parseXmlDocument(fs.readFileSync(f, 'utf8'));
    const ln = doc.documentElement.localName; const syn = ln === 'CrossIndustryInvoice' ? 'cii' : (ln === 'Invoice' || ln === 'CreditNote') ? 'ubl' : null;
    const r = {};
    for (const k of keys) {
      const n = syn && MAP[k](syn); if (!n) { r[k] = null; continue; }
      const v = validate(doc, T(n));
      r[k] = v.findings.map(x => [x.id, x.flag, x.location]); if (v.engineErrors.length) r[k + '_errors'] = v.engineErrors;
    }
    out[f] = r;
  } catch (e) { out[f] = { error: String(e.message || e) }; }
}
process.stdout.write(JSON.stringify(out));
